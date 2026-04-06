const { Notification, CurriculumAdmin, Curriculum } = require('../models');

class NotificationService {
    /**
     * Send a notification to specific users based on the event.
     * @param {string} eventType e.g. student_requested_enrollment, enrollment_approved
     * @param {object} data Context data like student_id, curriculum_id, curriculum_title, etc.
     */
    static async notifyForEvent(eventType, data) {
        try {
            switch (eventType) {
                case 'student_requested_enrollment':
                case 'payment_submitted':
                    await this._notifyCurriculumStaff(
                        data.curriculum_id,
                        data.curriculum_title,
                        'manage_payments',
                        eventType,
                        data
                    );
                    break;
                case 'enrollment_approved':
                    await this._notifyStudent(
                        data.student_id,
                        'تم قبول طلبك',
                        'تمت مراجعة عملية الدفع ويمكنك الآن مشاهدة المقرر',
                        eventType,
                        data
                    );
                    break;
                case 'enrollment_rejected':
                    await this._notifyStudent(
                        data.student_id,
                        'تم رفض التسجيل',
                        `تم رفض طلب تسجيلك في مقرر ${data.curriculum_title}. يرجى التواصل مع المدرس لمزيد من التفاصيل.`,
                        eventType,
                        data
                    );
                    break;
                case 'event_created': {
                    const typeLabel = data.event_type === 'live' ? 'جلسة مباشرة' : 'اختبار';
                    await this._notifyStudent(
                        data.student_id,
                        `📅 ${typeLabel} جديد`,
                        `تم جدولة ${typeLabel} "${data.event_title}" في ${data.curriculum_title}.`,
                        eventType,
                        data
                    );
                    break;
                }
                case 'event_reminder': {
                    const reminderLabel = data.event_type === 'live' ? 'الجلسة المباشرة' : 'الاختبار';
                    await this._notifyStudent(
                        data.student_id,
                        `⏰ تذكير`,
                        `${reminderLabel} "${data.event_title}" سيبدأ بعد 30 دقيقة في ${data.curriculum_title}.`,
                        eventType,
                        data
                    );
                    break;
                }
                default:
                    console.warn(`[NotificationService] Unhandled eventType: ${eventType}`);
            }
        } catch (error) {
            console.error(`[NotificationService] Error in notifyForEvent (${eventType}):`, error);
        }
    }

    /**
     * Helper to notify the curriculum owner and qualified assistants.
     */
    static async _notifyCurriculumStaff(curriculumId, curriculumTitle, requiredPermission, eventType, metadata) {
        const curriculum = await Curriculum.findByPk(curriculumId);
        if (!curriculum) return;

        const recipients = new Set();
        recipients.add(curriculum.instructor_id);

        const assistants = await CurriculumAdmin.findAll({
            where: { curriculum_id: curriculumId, status: 'active' },
        });

        for (const assistant of assistants) {
            const perms = assistant.permissions || [];
            if (perms.includes(requiredPermission)) {
                recipients.add(assistant.user_id);
            }
        }

        const notifications = [];
        let title = '';
        let message = '';

        if (eventType === 'student_requested_enrollment') {
            title = 'طلب تسجيل جديد';
            message = `يوجد طلب تسجيل جديد في مقرر ${curriculumTitle}.`;
        } else if (eventType === 'payment_submitted') {
            title = 'تم رفع إيصال دفع';
            message = `تم رفع إيصال دفع لطلب تسجيل في مقرر ${curriculumTitle}.`;
        } else {
            title = 'إشعار مقرر';
            message = `هناك إشعار جديد في مقرر ${curriculumTitle}.`;
        }

        for (const userId of recipients) {
            notifications.push({
                user_id: userId,
                type: eventType,
                title,
                message,
                metadata,
            });
        }

        if (notifications.length > 0) {
            await Notification.bulkCreate(notifications);
        }
    }

    /**
     * Helper to notify a specific student.
     */
    static async _notifyStudent(studentId, title, message, eventType, metadata) {
        if (!studentId) return;
        
        await Notification.create({
            user_id: studentId,
            type: eventType,
            title,
            message,
            metadata,
        });
    }
}

module.exports = NotificationService;
