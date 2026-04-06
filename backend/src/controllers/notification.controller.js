const { Notification } = require('../models');

async function getMyNotifications(req, res, next) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;

        const { count, rows } = await Notification.findAndCountAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        res.json({ success: true, count, data: rows });
    } catch (error) { next(error); }
}

async function getUnreadCount(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        const userId = req.user.id;

        const count = await Notification.count({
            where: { user_id: userId, is_read: false },
        });

        res.json({ success: true, count });
    } catch (error) { 
        console.error('Error in getUnreadCount:', error);
        next(error); 
    }
}

async function markAsRead(req, res, next) {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await Notification.findOne({
            where: { id: notificationId, user_id: userId }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'الإشعار غير موجود.' });
        }

        notification.is_read = true;
        await notification.save();

        res.json({ success: true, message: 'تم تحديث حالة الإشعار.', data: notification });
    } catch (error) { next(error); }
}

async function markAllAsRead(req, res, next) {
    try {
        const userId = req.user.id;

        await Notification.update(
            { is_read: true },
            { where: { user_id: userId, is_read: false } }
        );

        res.json({ success: true, message: 'تم تحديث جميع الإشعارات.' });
    } catch (error) { next(error); }
}

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
};
