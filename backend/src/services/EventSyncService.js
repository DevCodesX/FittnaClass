const { Op } = require('sequelize');
const {
    Event,
    Enrollment,
    StudyPlan,
    StudyTask,
} = require('../models');

function formatDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toUniqueIds(ids = []) {
    return [...new Set(
        ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];
}

async function ensurePlansForDate(studentIds, dateKey, transaction) {
    const ids = toUniqueIds(studentIds);
    if (!ids.length || !dateKey) return {};

    const existingPlans = await StudyPlan.findAll({
        where: {
            user_id: { [Op.in]: ids },
            date: dateKey,
        },
        attributes: ['id', 'user_id'],
        transaction,
    });

    const byUserId = {};
    for (const plan of existingPlans) {
        byUserId[plan.user_id] = plan.id;
    }

    const missingUsers = ids.filter((id) => !byUserId[id]);
    if (missingUsers.length > 0) {
        await StudyPlan.bulkCreate(
            missingUsers.map((userId) => ({ user_id: userId, date: dateKey })),
            {
                transaction,
                ignoreDuplicates: true,
            }
        );

        const syncedPlans = await StudyPlan.findAll({
            where: {
                user_id: { [Op.in]: ids },
                date: dateKey,
            },
            attributes: ['id', 'user_id'],
            transaction,
        });

        for (const plan of syncedPlans) {
            byUserId[plan.user_id] = plan.id;
        }
    }

    return byUserId;
}

async function getApprovedStudentIds(curriculumId, transaction) {
    const enrollments = await Enrollment.findAll({
        where: { curriculum_id: curriculumId, status: 'approved' },
        attributes: ['student_id'],
        transaction,
    });

    return toUniqueIds(enrollments.map((item) => item.student_id));
}

async function syncEventToStudents(event, studentIds, transaction) {
    const uniqueStudentIds = toUniqueIds(studentIds);
    if (!event || !uniqueStudentIds.length) {
        return { totalStudents: uniqueStudentIds.length, createdBlocks: 0 };
    }

    const eventDate = formatDateKey(event.start_time);
    if (!eventDate) {
        return { totalStudents: uniqueStudentIds.length, createdBlocks: 0 };
    }

    const planMap = await ensurePlansForDate(uniqueStudentIds, eventDate, transaction);
    const planIds = uniqueStudentIds
        .map((studentId) => planMap[studentId])
        .filter(Boolean);

    if (!planIds.length) {
        return { totalStudents: uniqueStudentIds.length, createdBlocks: 0 };
    }

    const existingBlocks = await StudyTask.findAll({
        where: {
            event_id: event.id,
            plan_id: { [Op.in]: planIds },
        },
        attributes: ['plan_id'],
        transaction,
    });

    const existingPlanIds = new Set(existingBlocks.map((row) => row.plan_id));

    const blocksToCreate = uniqueStudentIds
        .map((studentId) => planMap[studentId])
        .filter((planId) => Boolean(planId) && !existingPlanIds.has(planId))
        .map((planId) => ({
            plan_id: planId,
            type: 'event',
            event_id: event.id,
            title: event.title,
            status: 'pending',
            order_index: 0,
            metadata: null,
        }));

    if (blocksToCreate.length > 0) {
        await StudyTask.bulkCreate(blocksToCreate, { transaction });
    }

    const refreshedBlocks = await StudyTask.findAll({
        where: {
            event_id: event.id,
            plan_id: { [Op.in]: planIds },
        },
        attributes: ['id', 'plan_id'],
        order: [['id', 'ASC']],
        transaction,
    });

    const seenPlans = new Set();
    const duplicateIds = [];
    for (const block of refreshedBlocks) {
        if (seenPlans.has(block.plan_id)) {
            duplicateIds.push(block.id);
        } else {
            seenPlans.add(block.plan_id);
        }
    }

    if (duplicateIds.length > 0) {
        await StudyTask.destroy({
            where: { id: { [Op.in]: duplicateIds } },
            transaction,
        });
    }

    return {
        totalStudents: uniqueStudentIds.length,
        createdBlocks: blocksToCreate.length,
    };
}

async function moveEventBlocksToDate(eventId, targetDate, transaction) {
    const dateKey = formatDateKey(targetDate);
    if (!dateKey) return { movedBlocks: 0, removedDuplicates: 0 };

    const linkedBlocks = await StudyTask.findAll({
        where: { event_id: eventId },
        attributes: ['id', 'plan_id', 'order_index'],
        include: [{
            model: StudyPlan,
            as: 'plan',
            attributes: ['id', 'user_id', 'date'],
        }],
        transaction,
    });

    if (!linkedBlocks.length) {
        return { movedBlocks: 0, removedDuplicates: 0 };
    }

    const studentIds = toUniqueIds(
        linkedBlocks
            .filter((block) => block.plan && block.plan.user_id)
            .map((block) => block.plan.user_id)
    );
    const planMap = await ensurePlansForDate(studentIds, dateKey, transaction);

    const updateRows = [];
    for (const block of linkedBlocks) {
        const userId = block.plan?.user_id;
        const targetPlanId = userId ? planMap[userId] : null;
        if (!targetPlanId) continue;
        if (block.plan_id === targetPlanId && block.order_index === 0) continue;
        updateRows.push({
            id: block.id,
            plan_id: targetPlanId,
            order_index: 0,
        });
    }

    if (updateRows.length > 0) {
        await StudyTask.bulkCreate(updateRows, {
            transaction,
            updateOnDuplicate: ['plan_id', 'order_index', 'updated_at'],
        });
    }

    // Defensive dedupe: keep one event block per student after date moves.
    const refreshedBlocks = await StudyTask.findAll({
        where: { event_id: eventId },
        attributes: ['id'],
        include: [{
            model: StudyPlan,
            as: 'plan',
            attributes: ['user_id', 'date'],
        }],
        order: [['id', 'ASC']],
        transaction,
    });

    const firstBlockByStudent = new Set();
    const duplicateIds = [];

    for (const block of refreshedBlocks) {
        const userId = block.plan?.user_id;
        if (!userId) continue;
        if (block.plan?.date !== dateKey) continue;

        if (firstBlockByStudent.has(userId)) {
            duplicateIds.push(block.id);
        } else {
            firstBlockByStudent.add(userId);
        }
    }

    if (duplicateIds.length > 0) {
        await StudyTask.destroy({
            where: { id: { [Op.in]: duplicateIds } },
            transaction,
        });
    }

    return {
        movedBlocks: updateRows.length,
        removedDuplicates: duplicateIds.length,
    };
}

async function syncUpcomingEventsForStudent(curriculumId, studentId, transaction) {
    const normalizedStudentId = Number(studentId);
    if (!Number.isInteger(normalizedStudentId) || normalizedStudentId <= 0) {
        return 0;
    }

    const events = await Event.findAll({
        where: {
            curriculum_id: curriculumId,
            end_time: { [Op.gte]: new Date() },
        },
        attributes: ['id', 'title', 'start_time'],
        order: [['start_time', 'ASC']],
        transaction,
    });

    if (!events.length) return 0;

    const dateKeys = [...new Set(events.map((event) => formatDateKey(event.start_time)).filter(Boolean))];
    const planIdByDate = {};
    for (const dateKey of dateKeys) {
        const map = await ensurePlansForDate([normalizedStudentId], dateKey, transaction);
        if (map[normalizedStudentId]) {
            planIdByDate[dateKey] = map[normalizedStudentId];
        }
    }

    const candidateBlocks = events
        .map((event) => {
            const dateKey = formatDateKey(event.start_time);
            const planId = planIdByDate[dateKey];
            if (!planId) return null;

            return {
                plan_id: planId,
                event_id: event.id,
                title: event.title,
            };
        })
        .filter(Boolean);

    if (!candidateBlocks.length) return 0;

    const existingBlocks = await StudyTask.findAll({
        where: {
            plan_id: { [Op.in]: [...new Set(candidateBlocks.map((item) => item.plan_id))] },
            event_id: { [Op.in]: candidateBlocks.map((item) => item.event_id) },
        },
        attributes: ['plan_id', 'event_id'],
        transaction,
    });
    const existingKey = new Set(existingBlocks.map((row) => `${row.plan_id}:${row.event_id}`));

    const rowsToCreate = candidateBlocks
        .filter((item) => !existingKey.has(`${item.plan_id}:${item.event_id}`))
        .map((item) => ({
            plan_id: item.plan_id,
            type: 'event',
            event_id: item.event_id,
            title: item.title,
            status: 'pending',
            order_index: 0,
            metadata: null,
        }));

    if (rowsToCreate.length > 0) {
        await StudyTask.bulkCreate(rowsToCreate, { transaction });
    }

    const allBlocks = await StudyTask.findAll({
        where: {
            plan_id: { [Op.in]: [...new Set(candidateBlocks.map((item) => item.plan_id))] },
            event_id: { [Op.in]: candidateBlocks.map((item) => item.event_id) },
        },
        attributes: ['id', 'plan_id', 'event_id'],
        order: [['id', 'ASC']],
        transaction,
    });

    const seenKeys = new Set();
    const duplicateIds = [];
    for (const block of allBlocks) {
        const key = `${block.plan_id}:${block.event_id}`;
        if (seenKeys.has(key)) {
            duplicateIds.push(block.id);
        } else {
            seenKeys.add(key);
        }
    }

    if (duplicateIds.length > 0) {
        await StudyTask.destroy({
            where: { id: { [Op.in]: duplicateIds } },
            transaction,
        });
    }

    return rowsToCreate.length;
}

module.exports = {
    formatDateKey,
    getApprovedStudentIds,
    syncEventToStudents,
    moveEventBlocksToDate,
    syncUpcomingEventsForStudent,
};
