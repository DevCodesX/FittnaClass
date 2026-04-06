const cron = require('node-cron');
const { Curriculum } = require('../models');
const { Op } = require('sequelize');
const { rescheduleMissedReviews } = require('../controllers/srs.controller');

class CronService {
    static init() {
        // Run every minute: publish scheduled curricula
        cron.schedule('* * * * *', async () => {
            try {
                const now = new Date();
                
                const curriculaToPublish = await Curriculum.findAll({
                    where: {
                        status: 'scheduled',
                        scheduled_publish_at: {
                            [Op.lte]: now
                        }
                    }
                });

                if (curriculaToPublish.length > 0) {
                    console.log(`[CronService] Found ${curriculaToPublish.length} curricula to publish.`);
                    
                    for (const curriculum of curriculaToPublish) {
                        try {
                            await curriculum.update({
                                status: 'published',
                                published_at: new Date(),
                                scheduled_publish_at: null
                            });
                            console.log(`[CronService] Published curriculum ID: ${curriculum.id} (${curriculum.title})`);
                        } catch (err) {
                            console.error(`[CronService] Failed to publish curriculum ID: ${curriculum.id}`, err);
                        }
                    }
                }
            } catch (error) {
                console.error('[CronService] Error running scheduled publish task:', error);
            }
        });

        // Run daily at 6:00 AM: reschedule missed SRS reviews
        cron.schedule('0 6 * * *', async () => {
            console.log('[CronService] Running SRS missed review rescheduler...');
            await rescheduleMissedReviews();
        });

        // Run weekly (e.g., Saturday at midnight) to reset weekly_points
        cron.schedule('0 0 * * 6', async () => {
            console.log('[CronService] Running Leaderboard Weekly Reset...');
            const { LeaderboardScore } = require('../models');
            try {
                await LeaderboardScore.update(
                    { weekly_points: 0 },
                    { where: {} } // update all
                );
                console.log('[CronService] ✅ Leaderboard weekly points reset.');
            } catch (error) {
                console.error('[CronService] ❌ Error resetting weekly points:', error);
            }
        });

        // Run every minute: send event reminders (30 min before)
        cron.schedule('* * * * *', async () => {
            try {
                const { Event, Enrollment, Notification, Curriculum } = require('../models');
                const now = new Date();
                const reminderWindow = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now
                const windowEnd = new Date(now.getTime() + 31 * 60 * 1000); // 31 min (1 min window)

                const upcomingEvents = await Event.findAll({
                    where: {
                        start_time: {
                            [Op.gte]: reminderWindow,
                            [Op.lt]: windowEnd,
                        },
                        reminded: false,
                    },
                    include: [{
                        model: Curriculum,
                        as: 'curriculum',
                        attributes: ['id', 'title'],
                    }],
                });

                for (const event of upcomingEvents) {
                    try {
                        const enrollments = await Enrollment.findAll({
                            where: { curriculum_id: event.curriculum_id, status: 'approved' },
                            attributes: ['student_id'],
                        });

                        const studentIds = [...new Set(enrollments.map(e => e.student_id))];
                        if (studentIds.length > 0) {
                            const typeLabel = event.type === 'live' ? 'الجلسة المباشرة' : 'الاختبار';
                            const notifications = studentIds.map(studentId => ({
                                user_id: studentId,
                                type: 'event_reminder',
                                title: '⏰ تذكير',
                                message: `${typeLabel} "${event.title}" سيبدأ بعد 30 دقيقة في ${event.curriculum?.title || 'المقرر'}.`,
                                is_read: false,
                                metadata: {
                                    event_id: event.id,
                                    curriculum_id: event.curriculum_id,
                                    event_type: event.type,
                                },
                            }));

                            await Notification.bulkCreate(notifications);
                        }

                        // Mark as reminded
                        await event.update({ reminded: true });
                        console.log(`[CronService] Sent reminder for event ID: ${event.id} (${event.title}) to ${studentIds.length} students.`);
                    } catch (err) {
                        console.error(`[CronService] Failed to send reminder for event ID: ${event.id}`, err);
                    }
                }
            } catch (error) {
                console.error('[CronService] Error running event reminder task:', error);
            }
        });

        console.log('✅ CronService initialized: Scheduled publishing + SRS rescheduler + Event reminders running.');
    }
}

module.exports = CronService;
