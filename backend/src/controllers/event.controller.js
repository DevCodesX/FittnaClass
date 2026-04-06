const { Op } = require('sequelize');
const {
    sequelize,
    Event,
    Notification,
    Curriculum,
    Enrollment,
    User,
    StudyTask,
} = require('../models');
const EventSyncService = require('../services/EventSyncService');

function parseDateInput(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function formatDateForMessage(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeForMessage(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getEventTypeLabel(type) {
    return type === 'live' ? 'live session' : 'exam';
}

function validateCreatePayload(body) {
    const errors = [];
    const normalized = {
        type: body.type,
        title: typeof body.title === 'string' ? body.title.trim() : '',
        description: typeof body.description === 'string' ? body.description.trim() : null,
        meeting_url: typeof body.meeting_url === 'string' ? body.meeting_url.trim() : null,
        start_time: parseDateInput(body.start_time),
        end_time: parseDateInput(body.end_time),
    };

    if (!['live', 'exam'].includes(normalized.type)) {
        errors.push('Event type must be "live" or "exam".');
    }
    if (!normalized.title) {
        errors.push('Event title is required.');
    }
    if (!normalized.start_time || !normalized.end_time) {
        errors.push('start_time and end_time are required and must be valid dates.');
    } else if (normalized.end_time <= normalized.start_time) {
        errors.push('end_time must be after start_time.');
    }

    return { errors, normalized };
}

function validateUpdatePayload(body, currentEvent) {
    const updates = {};
    const errors = [];

    if (body.type !== undefined) {
        if (!['live', 'exam'].includes(body.type)) {
            errors.push('Event type must be "live" or "exam".');
        } else {
            updates.type = body.type;
        }
    }

    if (body.title !== undefined) {
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
            errors.push('Event title cannot be empty.');
        } else {
            updates.title = title;
        }
    }

    if (body.description !== undefined) {
        updates.description = typeof body.description === 'string' ? body.description.trim() : null;
    }

    if (body.meeting_url !== undefined) {
        updates.meeting_url = typeof body.meeting_url === 'string' ? body.meeting_url.trim() : null;
    }

    if (body.start_time !== undefined) {
        const start = parseDateInput(body.start_time);
        if (!start) {
            errors.push('start_time must be a valid date.');
        } else {
            updates.start_time = start;
        }
    }

    if (body.end_time !== undefined) {
        const end = parseDateInput(body.end_time);
        if (!end) {
            errors.push('end_time must be a valid date.');
        } else {
            updates.end_time = end;
        }
    }

    const nextStart = updates.start_time || currentEvent.start_time;
    const nextEnd = updates.end_time || currentEvent.end_time;
    if (nextEnd <= nextStart) {
        errors.push('end_time must be after start_time.');
    }

    return { errors, updates };
}

async function createEvent(req, res, next) {
    const t = await sequelize.transaction();
    try {
        const teacherId = req.user.id;
        const curriculumId = Number(req.params.id);
        const { errors, normalized } = validateCreatePayload(req.body || {});

        if (errors.length > 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const event = await Event.create({
            teacher_id: teacherId,
            curriculum_id: curriculumId,
            type: normalized.type,
            title: normalized.title,
            description: normalized.description || null,
            start_time: normalized.start_time,
            end_time: normalized.end_time,
            meeting_url: normalized.meeting_url || null,
            reminded: false,
        }, { transaction: t });

        const approvedStudentIds = await EventSyncService.getApprovedStudentIds(curriculumId, t);
        const syncSummary = await EventSyncService.syncEventToStudents(event, approvedStudentIds, t);

        if (approvedStudentIds.length > 0) {
            const curriculumTitle = req.curriculum?.title
                || (await Curriculum.findByPk(curriculumId, { attributes: ['title'], transaction: t }))?.title
                || 'your curriculum';

            const typeLabel = getEventTypeLabel(event.type);
            const eventDate = formatDateForMessage(event.start_time);
            const eventTime = formatTimeForMessage(event.start_time);

            const notifications = approvedStudentIds.map((studentId) => ({
                user_id: studentId,
                type: 'event_created',
                title: `New ${typeLabel} scheduled`,
                message: `New ${typeLabel} scheduled: "${event.title}" in ${curriculumTitle} on ${eventDate} at ${eventTime}.`,
                is_read: false,
                metadata: {
                    event_id: event.id,
                    curriculum_id: curriculumId,
                    event_type: event.type,
                },
            }));

            await Notification.bulkCreate(notifications, { transaction: t });
        }

        await t.commit();

        res.status(201).json({
            success: true,
            message: `Event created and synced to ${syncSummary.totalStudents} enrolled students.`,
            data: event,
            meta: syncSummary,
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
}

async function getEvents(req, res, next) {
    try {
        const curriculumId = Number(req.params.id);
        const events = await Event.findAll({
            where: { curriculum_id: curriculumId },
            order: [['start_time', 'ASC']],
            include: [{
                model: User,
                as: 'teacher',
                attributes: ['id', 'name'],
            }],
        });

        res.json({ success: true, data: events });
    } catch (error) {
        next(error);
    }
}

async function updateEvent(req, res, next) {
    const t = await sequelize.transaction();
    try {
        const curriculumId = Number(req.params.id);
        const eventId = Number(req.params.eventId);

        const event = await Event.findOne({
            where: { id: eventId, curriculum_id: curriculumId },
            transaction: t,
        });

        if (!event) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        const previousDateKey = EventSyncService.formatDateKey(event.start_time);
        const { errors, updates } = validateUpdatePayload(req.body || {}, event);
        if (errors.length > 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        if (Object.keys(updates).length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
        }

        const startTimeChanged = Boolean(updates.start_time)
            && new Date(updates.start_time).getTime() !== new Date(event.start_time).getTime();
        if (startTimeChanged) {
            updates.reminded = false;
        }

        await event.update(updates, { transaction: t });
        const nextDateKey = EventSyncService.formatDateKey(event.start_time);

        let moveSummary = { movedBlocks: 0, removedDuplicates: 0 };
        if (previousDateKey !== nextDateKey) {
            moveSummary = await EventSyncService.moveEventBlocksToDate(event.id, nextDateKey, t);
        }

        // Keep legacy task title in sync as a fallback, but event source of truth remains events table.
        await StudyTask.update(
            { title: event.title },
            { where: { event_id: event.id }, transaction: t }
        );

        // Ensure blocks exist for all currently enrolled students (covers late approvals).
        const approvedStudentIds = await EventSyncService.getApprovedStudentIds(curriculumId, t);
        const syncSummary = await EventSyncService.syncEventToStudents(event, approvedStudentIds, t);

        await t.commit();

        res.json({
            success: true,
            message: 'Event updated and synced to linked planner blocks.',
            data: event,
            meta: {
                ...moveSummary,
                ...syncSummary,
            },
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
}

async function deleteEvent(req, res, next) {
    const t = await sequelize.transaction();
    try {
        const curriculumId = Number(req.params.id);
        const eventId = Number(req.params.eventId);

        const event = await Event.findOne({
            where: { id: eventId, curriculum_id: curriculumId },
            transaction: t,
        });

        if (!event) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        await StudyTask.destroy({
            where: { event_id: event.id },
            transaction: t,
        });

        await event.destroy({ transaction: t });
        await t.commit();

        res.json({
            success: true,
            message: 'Event and all linked planner blocks were deleted.',
        });
    } catch (error) {
        await t.rollback();
        next(error);
    }
}

async function getStudentEvents(req, res, next) {
    try {
        const studentId = req.user.id;

        const enrollments = await Enrollment.findAll({
            where: { student_id: studentId, status: 'approved' },
            attributes: ['curriculum_id'],
        });

        const curriculumIds = [...new Set(enrollments.map((item) => item.curriculum_id))];
        if (!curriculumIds.length) {
            return res.json({ success: true, data: [] });
        }

        const events = await Event.findAll({
            where: {
                curriculum_id: { [Op.in]: curriculumIds },
                end_time: { [Op.gte]: new Date() },
            },
            order: [['start_time', 'ASC']],
            include: [{
                model: Curriculum,
                as: 'curriculum',
                attributes: ['id', 'title'],
            }],
        });

        res.json({ success: true, data: events });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    getStudentEvents,
};
