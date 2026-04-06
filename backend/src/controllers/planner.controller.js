const { Op } = require('sequelize');
const { sequelize, StudyPlan, StudyTask, Enrollment, Curriculum, Section, Lesson, Event } = require('../models');

function formatDateOnly(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime())) return null;

    const fmt = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (Number.isNaN(end.getTime())) return fmt(start);
    return `${fmt(start)} - ${fmt(end)}`;
}

// ─── GET /student/planner/courses ──────────────────────────────
async function getPlannerCourses(req, res, next) {
    try {
        const studentId = req.user.id;

        const enrollments = await Enrollment.findAll({
            where: { student_id: studentId, status: 'approved' },
            attributes: ['id', 'curriculum_id'],
            include: [{
                model: Curriculum,
                as: 'curriculum',
                attributes: ['id', 'title', 'subject'],
                include: [{
                    model: Section,
                    as: 'sections',
                    attributes: ['id', 'title', 'order'],
                    include: [{
                        model: Lesson,
                        as: 'lessons',
                        attributes: ['id', 'title', 'duration', 'order'],
                    }],
                }],
            }],
        });

        const courses = enrollments
            .filter(e => e.curriculum)
            .map(e => {
                const c = e.curriculum.toJSON();
                if (c.sections) {
                    c.sections.sort((a, b) => a.order - b.order);
                    c.sections.forEach(s => {
                        if (s.lessons) s.lessons.sort((a, b) => a.order - b.order);
                    });
                }
                return c;
            });

        res.json({ success: true, data: courses });
    } catch (error) { next(error); }
}

// ─── GET /student/planner ──────────────────────────────────────
// Supports single date OR date range: ?date=YYYY-MM-DD or ?date_from=...&date_to=...
async function getPlan(req, res, next) {
    try {
        const studentId = req.user.id;
        const { date, date_from, date_to } = req.query;

        let dates = [];
        const dateRe = /^\d{4}-\d{2}-\d{2}$/;

        if (date_from && date_to && dateRe.test(date_from) && dateRe.test(date_to)) {
            // Range mode
            const start = new Date(date_from + 'T00:00:00');
            const end = new Date(date_to + 'T00:00:00');
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dy = String(d.getDate()).padStart(2, '0');
                dates.push(`${y}-${m}-${dy}`);
            }
        } else if (date && dateRe.test(date)) {
            dates = [date];
        } else {
            return res.status(400).json({ success: false, message: 'يرجى تحديد التاريخ.' });
        }

        const plans = await StudyPlan.findAll({
            where: { user_id: studentId, date: { [Op.in]: dates } },
            include: [{
                model: StudyTask,
                as: 'tasks',
                include: [{
                    model: Lesson,
                    as: 'lesson',
                    attributes: ['id', 'title', 'duration', 'section_id'],
                    include: [{
                        model: Section,
                        as: 'section',
                        attributes: ['id', 'curriculum_id'],
                    }],
                }, {
                    model: Event,
                    as: 'event',
                    attributes: ['id', 'curriculum_id', 'type', 'title', 'start_time', 'end_time', 'meeting_url'],
                    include: [{
                        model: Curriculum,
                        as: 'curriculum',
                        attributes: ['id', 'title'],
                    }],
                }],
            }],
        });

        // Build a map of date -> tasks
        const planMap = {};
        for (const d of dates) {
            planMap[d] = { tasks: [], progress: { total: 0, completed: 0 } };
        }

        for (const plan of plans) {
            const tasks = plan.tasks
                ? [...plan.tasks].sort((a, b) => a.order_index - b.order_index)
                : [];

            const enriched = tasks.map(t => {
                const task = t.toJSON();
                if (task.lesson && task.lesson.section) {
                    task.curriculum_id = task.lesson.section.curriculum_id;
                }
                if (task.type === 'event' && task.event) {
                    task.title = task.event.title || task.title;
                    task.curriculum_id = task.event.curriculum_id;
                    task.event_block = {
                        event_id: task.event.id,
                        title: task.event.title,
                        date: formatDateOnly(task.event.start_time),
                        time: formatTimeRange(task.event.start_time, task.event.end_time),
                        type: task.event.type,
                        start_time: task.event.start_time,
                        end_time: task.event.end_time,
                        meeting_url: task.event.meeting_url || null,
                    };

                    const curriculumTitle = task.event.curriculum?.title || null;
                    task.metadata = {
                        ...(task.metadata || {}),
                        course_name: curriculumTitle || task.metadata?.course_name || null,
                    };
                }
                return task;
            });

            const total = enriched.length;
            const completed = enriched.filter(t => t.status === 'completed').length;

            planMap[plan.date] = {
                plan_id: plan.id,
                tasks: enriched,
                progress: { total, completed },
            };
        }

        // For single date, return flat response for V1 compatibility
        if (dates.length === 1) {
            return res.json({ success: true, data: planMap[dates[0]] });
        }

        // For range, compute overall progress
        let totalAll = 0, completedAll = 0;
        for (const d of dates) {
            totalAll += planMap[d].progress.total;
            completedAll += planMap[d].progress.completed;
        }

        res.json({
            success: true,
            data: {
                days: planMap,
                overall_progress: { total: totalAll, completed: completedAll },
            },
        });
    } catch (error) { next(error); }
}

// ─── POST /student/planner/tasks ───────────────────────────────
async function createTask(req, res, next) {
    try {
        const studentId = req.user.id;
        const { date, type, lesson_id, title, metadata } = req.body;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ success: false, message: 'يرجى تحديد التاريخ.' });
        }

        if (!type || !['lesson', 'custom', 'timer'].includes(type)) {
            return res.status(400).json({ success: false, message: 'نوع المهمة غير صحيح.' });
        }

        let taskTitle = title;
        let taskMetadata = metadata || null;

        // Validate lesson block
        if (type === 'lesson') {
            if (!lesson_id) {
                return res.status(400).json({ success: false, message: 'يرجى تحديد الدرس.' });
            }

            const lesson = await Lesson.findByPk(lesson_id, {
                include: [{
                    model: Section,
                    as: 'section',
                    attributes: ['id', 'curriculum_id'],
                    include: [{
                        model: Curriculum,
                        as: 'curriculum',
                        attributes: ['id', 'title'],
                    }],
                }],
            });

            if (!lesson) {
                return res.status(404).json({ success: false, message: 'الدرس غير موجود.' });
            }

            const enrollment = await Enrollment.findOne({
                where: {
                    student_id: studentId,
                    curriculum_id: lesson.section.curriculum_id,
                    status: 'approved',
                },
            });

            if (!enrollment) {
                return res.status(403).json({ success: false, message: 'أنت غير مسجل في هذا المقرر.' });
            }

            taskTitle = title || lesson.title;
            taskMetadata = {
                ...taskMetadata,
                course_name: lesson.section.curriculum.title,
                duration: lesson.duration || null,
            };
        }

        // Validate custom block
        if (type === 'custom') {
            if (!taskTitle || !taskTitle.trim()) {
                return res.status(400).json({ success: false, message: 'يرجى إدخال عنوان المهمة.' });
            }
            taskTitle = taskTitle.trim();
        }

        // Validate timer block
        if (type === 'timer') {
            const duration = taskMetadata?.duration;
            if (!duration || duration < 1) {
                return res.status(400).json({ success: false, message: 'يرجى تحديد مدة المؤقت.' });
            }
            taskTitle = taskTitle || `مؤقت ${duration} دقيقة`;
        }

        // Find or create plan
        const [plan] = await StudyPlan.findOrCreate({
            where: { user_id: studentId, date },
            defaults: { user_id: studentId, date },
        });

        const maxOrder = await StudyTask.max('order_index', { where: { plan_id: plan.id } });
        const nextOrder = (maxOrder || 0) + 1;

        const task = await StudyTask.create({
            plan_id: plan.id,
            type,
            lesson_id: type === 'lesson' ? lesson_id : null,
            title: taskTitle,
            status: 'pending',
            order_index: nextOrder,
            metadata: taskMetadata,
        });

        // Reload with associations
        const fullTask = await StudyTask.findByPk(task.id, {
            include: [{
                model: Lesson,
                as: 'lesson',
                attributes: ['id', 'title', 'duration', 'section_id'],
                include: [{
                    model: Section,
                    as: 'section',
                    attributes: ['id', 'curriculum_id'],
                }],
            }],
        });

        const taskJSON = fullTask.toJSON();
        if (taskJSON.lesson && taskJSON.lesson.section) {
            taskJSON.curriculum_id = taskJSON.lesson.section.curriculum_id;
        }

        res.status(201).json({ success: true, data: taskJSON });
    } catch (error) { next(error); }
}

// ─── PATCH /student/planner/tasks/:id ──────────────────────────
async function updateTask(req, res, next) {
    try {
        const studentId = req.user.id;
        const taskId = req.params.id;
        const { status, title, metadata } = req.body;

        const task = await StudyTask.findByPk(taskId, {
            include: [{ model: StudyPlan, as: 'plan', where: { user_id: studentId } }],
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'المهمة غير موجودة.' });
        }

        if (task.type === 'event' && (title !== undefined || metadata !== undefined)) {
            return res.status(403).json({
                success: false,
                message: 'Synced event blocks can only update completion status.',
            });
        }

        const previousStatus = task.status;

        if (status && ['pending', 'completed'].includes(status)) task.status = status;
        if (title !== undefined && title.trim()) task.title = title.trim();
        if (metadata !== undefined) task.metadata = { ...(task.metadata || {}), ...metadata };

        await task.save();

        // Gamification: award or revoke points
        if (status && status !== previousStatus) {
            try {
                const { awardPoints, revokePoints } = require('../services/GamificationService');
                if (status === 'completed') {
                    const result = await awardPoints(studentId, task.type);
                    return res.json({ success: true, data: task, gamification: result });
                } else if (status === 'pending' && previousStatus === 'completed') {
                    await revokePoints(studentId, task.type);
                }
            } catch (err) {
                console.error('[Gamification] Hook error:', err.message);
            }
        }

        res.json({ success: true, data: task });
    } catch (error) { next(error); }
}

// ─── DELETE /student/planner/tasks/:id ─────────────────────────
async function deleteTask(req, res, next) {
    try {
        const studentId = req.user.id;
        const taskId = req.params.id;

        const task = await StudyTask.findByPk(taskId, {
            include: [{ model: StudyPlan, as: 'plan', where: { user_id: studentId } }],
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'المهمة غير موجودة.' });
        }

        if (task.type === 'event') {
            return res.status(403).json({
                success: false,
                message: 'Synced event blocks cannot be deleted manually.',
            });
        }

        await task.destroy();
        res.json({ success: true, message: 'تم حذف المهمة.' });
    } catch (error) { next(error); }
}

// ─── PATCH /student/planner/tasks/reorder ──────────────────────
// V2: supports cross-day moves via { task_id, target_date, new_order }
// Also supports legacy V1: { task_id, direction: 'up'|'down' }
async function reorderTasks(req, res, next) {
    try {
        const studentId = req.user.id;
        const { task_id, direction, target_date, new_order } = req.body;

        if (!task_id) {
            return res.status(400).json({ success: false, message: 'بيانات غير صحيحة.' });
        }

        const task = await StudyTask.findByPk(task_id, {
            include: [{ model: StudyPlan, as: 'plan', where: { user_id: studentId } }],
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'المهمة غير موجودة.' });
        }

        if (task.type === 'event') {
            return res.status(403).json({
                success: false,
                message: 'Synced event blocks cannot be moved or reordered manually.',
            });
        }

        // V2 cross-day move
        if (target_date && /^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
            const [targetPlan] = await StudyPlan.findOrCreate({
                where: { user_id: studentId, date: target_date },
                defaults: { user_id: studentId, date: target_date },
            });

            // Move task to target plan
            task.plan_id = targetPlan.id;
            task.order_index = typeof new_order === 'number' ? new_order : 9999;
            await task.save();

            // Reindex tasks in the target plan
            const targetTasks = await StudyTask.findAll({
                where: { plan_id: targetPlan.id },
                order: [['order_index', 'ASC']],
            });
            for (let i = 0; i < targetTasks.length; i++) {
                if (targetTasks[i].order_index !== i + 1) {
                    targetTasks[i].order_index = i + 1;
                    await targetTasks[i].save();
                }
            }

            return res.json({ success: true, message: 'تم نقل المهمة.' });
        }

        // V1 simple up/down
        if (direction && ['up', 'down'].includes(direction)) {
            const siblingWhere = {
                plan_id: task.plan_id,
                order_index: direction === 'up'
                    ? { [Op.lt]: task.order_index }
                    : { [Op.gt]: task.order_index },
            };

            const sibling = await StudyTask.findOne({
                where: siblingWhere,
                order: [['order_index', direction === 'up' ? 'DESC' : 'ASC']],
            });

            if (!sibling) {
                return res.json({ success: true, message: 'لا يمكن التحريك أكثر.' });
            }

            const tempOrder = task.order_index;
            task.order_index = sibling.order_index;
            sibling.order_index = tempOrder;

            await task.save();
            await sibling.save();

            return res.json({ success: true, message: 'تم إعادة الترتيب.' });
        }

        // V2 in-place reorder (new_order only, no target_date means same day)
        if (typeof new_order === 'number') {
            task.order_index = new_order;
            await task.save();

            // Reindex siblings
            const siblings = await StudyTask.findAll({
                where: { plan_id: task.plan_id },
                order: [['order_index', 'ASC']],
            });
            for (let i = 0; i < siblings.length; i++) {
                if (siblings[i].order_index !== i + 1) {
                    siblings[i].order_index = i + 1;
                    await siblings[i].save();
                }
            }

            return res.json({ success: true, message: 'تم إعادة الترتيب.' });
        }

        return res.status(400).json({ success: false, message: 'بيانات غير صحيحة.' });
    } catch (error) { next(error); }
}

// ─── POST /student/planner/ai-generate ─────────────────────────
// AI (algorithmic) plan generation: distribute lessons evenly across days
async function aiGeneratePlan(req, res, next) {
    try {
        const studentId = req.user.id;
        const { curriculum_id, num_days, start_date, daily_minutes } = req.body;

        if (!curriculum_id || !num_days || !start_date) {
            return res.status(400).json({ success: false, message: 'يرجى تحديد المقرر وعدد الأيام وتاريخ البداية.' });
        }

        if (num_days < 1 || num_days > 30) {
            return res.status(400).json({ success: false, message: 'عدد الأيام يجب أن يكون بين 1 و 30.' });
        }

        // Verify enrollment
        const enrollment = await Enrollment.findOne({
            where: { student_id: studentId, curriculum_id, status: 'approved' },
        });
        if (!enrollment) {
            return res.status(403).json({ success: false, message: 'أنت غير مسجل في هذا المقرر.' });
        }

        // Fetch curriculum with lessons
        const curriculum = await Curriculum.findByPk(curriculum_id, {
            attributes: ['id', 'title'],
            include: [{
                model: Section,
                as: 'sections',
                attributes: ['id', 'title', 'order'],
                include: [{
                    model: Lesson,
                    as: 'lessons',
                    attributes: ['id', 'title', 'duration', 'order'],
                }],
            }],
            order: [
                [{ model: Section, as: 'sections' }, 'order', 'ASC'],
                [{ model: Section, as: 'sections' }, { model: Lesson, as: 'lessons' }, 'order', 'ASC'],
            ],
        });

        if (!curriculum) {
            return res.status(404).json({ success: false, message: 'المقرر غير موجود.' });
        }

        // Flatten all lessons in order
        const allLessons = [];
        for (const section of curriculum.sections) {
            for (const lesson of section.lessons) {
                allLessons.push({
                    id: lesson.id,
                    title: lesson.title,
                    duration: lesson.duration || null,
                    section_title: section.title,
                });
            }
        }

        if (allLessons.length === 0) {
            return res.status(400).json({ success: false, message: 'لا توجد دروس في هذا المقرر.' });
        }

        // Parse durations to minutes for smart distribution
        function parseDurationToMinutes(durStr) {
            if (!durStr) return 15; // default estimate
            const parts = durStr.split(':');
            if (parts.length === 2) {
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
            return 15;
        }

        // Distribute lessons across days
        const effectiveDays = Math.min(num_days, allLessons.length);
        const dailyLimit = daily_minutes || null;

        // Simple balanced distribution
        const dayBuckets = Array.from({ length: effectiveDays }, () => []);
        
        if (dailyLimit) {
            // Time-aware distribution
            let currentDay = 0;
            let currentDayMinutes = 0;

            for (const lesson of allLessons) {
                const mins = parseDurationToMinutes(lesson.duration);
                
                if (currentDayMinutes + mins > dailyLimit && currentDayMinutes > 0) {
                    currentDay++;
                    currentDayMinutes = 0;
                }
                
                if (currentDay >= effectiveDays) {
                    // Overflow: add to last day
                    currentDay = effectiveDays - 1;
                }
                
                dayBuckets[currentDay].push(lesson);
                currentDayMinutes += mins;
            }
        } else {
            // Even count distribution
            const baseCount = Math.floor(allLessons.length / effectiveDays);
            const remainder = allLessons.length % effectiveDays;
            let idx = 0;
            for (let d = 0; d < effectiveDays; d++) {
                const count = baseCount + (d < remainder ? 1 : 0);
                for (let j = 0; j < count; j++) {
                    dayBuckets[d].push(allLessons[idx++]);
                }
            }
        }

        // Create plans and tasks
        let totalTasksCreated = 0;
        let daysCreated = 0;

        for (let d = 0; d < effectiveDays; d++) {
            const dateObj = new Date(start_date + 'T00:00:00');
            dateObj.setDate(dateObj.getDate() + d);
            const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

            if (dayBuckets[d].length === 0) continue;

            const [plan] = await StudyPlan.findOrCreate({
                where: { user_id: studentId, date: dateStr },
                defaults: { user_id: studentId, date: dateStr },
            });

            // Get existing max order
            const maxOrder = await StudyTask.max('order_index', { where: { plan_id: plan.id } }) || 0;

            const tasksToCreate = dayBuckets[d].map((lesson, i) => ({
                plan_id: plan.id,
                type: 'lesson',
                lesson_id: lesson.id,
                title: lesson.title,
                status: 'pending',
                order_index: maxOrder + i + 1,
                metadata: {
                    course_name: curriculum.title,
                    duration: lesson.duration || null,
                    ai_generated: true,
                },
            }));

            await StudyTask.bulkCreate(tasksToCreate);
            totalTasksCreated += tasksToCreate.length;
            daysCreated++;
        }

        res.status(201).json({
            success: true,
            message: `تم إنشاء خطة ذكية: ${totalTasksCreated} مهمة على ${daysCreated} أيام.`,
            data: {
                tasks_created: totalTasksCreated,
                days_created: daysCreated,
                curriculum_title: curriculum.title,
            },
        });
    } catch (error) { next(error); }
}

module.exports = {
    getPlannerCourses,
    getPlan,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    aiGeneratePlan,
};
