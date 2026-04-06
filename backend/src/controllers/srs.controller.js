const { Op } = require('sequelize');
const {
    SpacedRepetition, StudyPlan, StudyTask, Lesson, Section, Curriculum, Enrollment,
} = require('../models');

// Max review blocks per day
const DAILY_REVIEW_LIMIT = 5;

// ─── Helper: format date ─────────────────────────────────────
function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Helper: SM-2 calculation ────────────────────────────────
function calculateSM2(srs, difficulty) {
    let { ease_factor, interval, repetition_count } = srs;

    // difficulty: 'hard' | 'medium' | 'easy'
    const qualityMap = { hard: 2, medium: 3, easy: 5 };
    const q = qualityMap[difficulty] || 3;

    // Update ease factor (simplified SM-2)
    ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

    if (repetition_count === 0) {
        interval = 1;
    } else if (repetition_count === 1) {
        interval = 3;
    } else {
        // Apply difficulty multiplier to interval
        if (difficulty === 'easy') {
            interval = Math.round(interval * 2.5);
        } else if (difficulty === 'medium') {
            interval = Math.round(interval * 2);
        } else {
            interval = Math.round(interval * 1.5);
        }
    }

    // Cap interval at 180 days
    interval = Math.min(interval, 180);
    repetition_count += 1;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);

    return {
        ease_factor: Math.round(ease_factor * 100) / 100,
        interval,
        repetition_count,
        next_review_date: fmtDate(nextDate),
    };
}

// ─── POST /student/planner/srs/submit ──────────────────────────
// Submit difficulty rating after completing a lesson/review block
async function submitDifficulty(req, res, next) {
    try {
        const studentId = req.user.id;
        const { task_id, difficulty } = req.body;

        if (!task_id || !['hard', 'medium', 'easy'].includes(difficulty)) {
            return res.status(400).json({ success: false, message: 'بيانات غير صحيحة.' });
        }

        // Find the completed task
        const task = await StudyTask.findByPk(task_id, {
            include: [{
                model: StudyPlan,
                as: 'plan',
                where: { user_id: studentId },
            }],
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'المهمة غير موجودة.' });
        }

        if (!task.lesson_id) {
            return res.status(400).json({ success: false, message: 'هذه المهمة غير مرتبطة بدرس.' });
        }

        if (!['lesson', 'review'].includes(task.type)) {
            return res.status(400).json({ success: false, message: 'نوع المهمة لا يدعم المراجعة المتكررة.' });
        }

        // Find or create SRS record
        let [srs, created] = await SpacedRepetition.findOrCreate({
            where: { user_id: studentId, lesson_id: task.lesson_id },
            defaults: {
                user_id: studentId,
                lesson_id: task.lesson_id,
                ease_factor: 2.5,
                interval: 0,
                repetition_count: 0,
            },
        });

        // Calculate new SM-2 values
        const result = calculateSM2(srs, difficulty);

        srs.ease_factor = result.ease_factor;
        srs.interval = result.interval;
        srs.repetition_count = result.repetition_count;
        srs.next_review_date = result.next_review_date;
        srs.last_reviewed_at = new Date();
        await srs.save();

        // Auto-create a review block on the next_review_date
        await createReviewBlock(studentId, task.lesson_id, result.next_review_date, srs.id, task);

        res.json({
            success: true,
            message: `تم التقييم. المراجعة القادمة بعد ${result.interval} ${result.interval === 1 ? 'يوم' : 'أيام'}.`,
            data: {
                next_review_date: result.next_review_date,
                interval: result.interval,
                repetition_count: result.repetition_count,
                ease_factor: result.ease_factor,
            },
        });
    } catch (error) { next(error); }
}

// ─── Helper: Create review block ─────────────────────────────
async function createReviewBlock(userId, lessonId, reviewDate, srsId, sourceTask) {
    // Check daily review limit
    const [plan] = await StudyPlan.findOrCreate({
        where: { user_id: userId, date: reviewDate },
        defaults: { user_id: userId, date: reviewDate },
    });

    const existingReviews = await StudyTask.count({
        where: { plan_id: plan.id, type: 'review' },
    });

    if (existingReviews >= DAILY_REVIEW_LIMIT) {
        // Shift to next day
        const nextDay = new Date(reviewDate + 'T00:00:00');
        nextDay.setDate(nextDay.getDate() + 1);
        return createReviewBlock(userId, lessonId, fmtDate(nextDay), srsId, sourceTask);
    }

    // Check if review block already exists for this lesson on this date
    const existing = await StudyTask.findOne({
        where: {
            plan_id: plan.id,
            type: 'review',
            lesson_id: lessonId,
        },
    });

    if (existing) return; // Already scheduled

    // Get lesson info for block title
    const lesson = await Lesson.findByPk(lessonId, {
        attributes: ['id', 'title'],
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

    const maxOrder = await StudyTask.max('order_index', { where: { plan_id: plan.id } }) || 0;

    await StudyTask.create({
        plan_id: plan.id,
        type: 'review',
        lesson_id: lessonId,
        title: `مراجعة: ${lesson?.title || sourceTask?.title || 'درس'}`,
        status: 'pending',
        order_index: maxOrder + 1,
        metadata: {
            srs_id: srsId,
            course_name: lesson?.section?.curriculum?.title || sourceTask?.metadata?.course_name || null,
            review_number: (sourceTask?.metadata?.review_number || 0) + 1,
        },
    });
}

// ─── GET /student/planner/srs/today ──────────────────────────
// Get today's pending reviews
async function getTodayReviews(req, res, next) {
    try {
        const studentId = req.user.id;
        const today = fmtDate(new Date());

        // Find reviews due today or overdue
        const srsRecords = await SpacedRepetition.findAll({
            where: {
                user_id: studentId,
                next_review_date: { [Op.lte]: today },
            },
            include: [{
                model: Lesson,
                as: 'lesson',
                attributes: ['id', 'title'],
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
            }],
            order: [['next_review_date', 'ASC']],
        });

        // Also find review blocks in today's plan
        const plan = await StudyPlan.findOne({
            where: { user_id: studentId, date: today },
        });

        let reviewBlocks = [];
        if (plan) {
            reviewBlocks = await StudyTask.findAll({
                where: { plan_id: plan.id, type: 'review' },
                order: [['order_index', 'ASC']],
            });
        }

        const pending = reviewBlocks.filter(b => b.status === 'pending').length;
        const completed = reviewBlocks.filter(b => b.status === 'completed').length;

        res.json({
            success: true,
            data: {
                srs_records: srsRecords.map(s => ({
                    id: s.id,
                    lesson_id: s.lesson_id,
                    lesson_title: s.lesson?.title,
                    course_name: s.lesson?.section?.curriculum?.title,
                    interval: s.interval,
                    repetition_count: s.repetition_count,
                    next_review_date: s.next_review_date,
                    overdue: s.next_review_date < today,
                })),
                review_blocks: reviewBlocks,
                stats: { pending, completed, total: pending + completed },
            },
        });
    } catch (error) { next(error); }
}

// ─── GET /student/planner/srs/stats ──────────────────────────
// Get SRS stats for the student
async function getSRSStats(req, res, next) {
    try {
        const studentId = req.user.id;
        const today = fmtDate(new Date());

        const total = await SpacedRepetition.count({ where: { user_id: studentId } });
        const dueToday = await SpacedRepetition.count({
            where: { user_id: studentId, next_review_date: today },
        });
        const overdue = await SpacedRepetition.count({
            where: { user_id: studentId, next_review_date: { [Op.lt]: today } },
        });
        const upcoming = await SpacedRepetition.count({
            where: { user_id: studentId, next_review_date: { [Op.gt]: today } },
        });

        res.json({
            success: true,
            data: { total_tracked: total, due_today: dueToday, overdue, upcoming },
        });
    } catch (error) { next(error); }
}

// ─── Missed Review Rescheduler (called by CronService) ───────
// Reschedule overdue reviews: reduce interval slightly, push to today
async function rescheduleMissedReviews() {
    const today = fmtDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = fmtDate(yesterday);

    try {
        // Find all overdue SRS records (review date was yesterday or earlier)
        const overdueRecords = await SpacedRepetition.findAll({
            where: {
                next_review_date: { [Op.lt]: today },
            },
        });

        for (const srs of overdueRecords) {
            // Reduce interval by 20% for missed review (penalty)
            const newInterval = Math.max(1, Math.round(srs.interval * 0.8));

            // Check if a review block already exists for today
            const [plan] = await StudyPlan.findOrCreate({
                where: { user_id: srs.user_id, date: today },
                defaults: { user_id: srs.user_id, date: today },
            });

            const existingReview = await StudyTask.findOne({
                where: { plan_id: plan.id, type: 'review', lesson_id: srs.lesson_id },
            });

            if (!existingReview) {
                // Check daily limit
                const reviewCount = await StudyTask.count({
                    where: { plan_id: plan.id, type: 'review' },
                });

                if (reviewCount < DAILY_REVIEW_LIMIT) {
                    const lesson = await Lesson.findByPk(srs.lesson_id, { attributes: ['id', 'title'] });
                    const maxOrder = await StudyTask.max('order_index', { where: { plan_id: plan.id } }) || 0;

                    await StudyTask.create({
                        plan_id: plan.id,
                        type: 'review',
                        lesson_id: srs.lesson_id,
                        title: `مراجعة متأخرة: ${lesson?.title || 'درس'}`,
                        status: 'pending',
                        order_index: maxOrder + 1,
                        metadata: {
                            srs_id: srs.id,
                            overdue: true,
                            original_date: srs.next_review_date,
                        },
                    });
                }
            }

            // Update SRS record to today
            srs.interval = newInterval;
            srs.next_review_date = today;
            await srs.save();
        }

        if (overdueRecords.length > 0) {
            console.log(`[SRS] Rescheduled ${overdueRecords.length} overdue reviews.`);
        }
    } catch (error) {
        console.error('[SRS] Error rescheduling missed reviews:', error);
    }
}

module.exports = {
    submitDifficulty,
    getTodayReviews,
    getSRSStats,
    rescheduleMissedReviews,
};
