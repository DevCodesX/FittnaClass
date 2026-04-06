const { Coupon, Curriculum } = require('../models');
const { Op } = require('sequelize');

async function createCoupon(req, res, next) {
    try {
        const { code, curriculum_id, discount_type, discount_value, usage_limit, expires_at } = req.body;
        const teacher_id = req.user.id;

        if (!code || !discount_type || discount_value === undefined) {
            return res.status(400).json({ success: false, message: 'الرجاء إدخال جميع الحقول المطلوبة.' });
        }

        const existing = await Coupon.findOne({ where: { code: code.trim().toUpperCase() } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'كود الخصم مستخدم من قبل.' });
        }

        const coupon = await Coupon.create({
            code: code.trim().toUpperCase(),
            teacher_id,
            curriculum_id: curriculum_id || null,
            discount_type,
            discount_value,
            usage_limit: usage_limit ? parseInt(usage_limit) : null,
            expires_at: expires_at || null,
        });

        res.status(201).json({ success: true, message: 'تم إنشاء الكوبون بنجاح.', data: coupon });
    } catch (error) { next(error); }
}

async function getCoupons(req, res, next) {
    try {
        const teacher_id = req.user.id;
        const coupons = await Coupon.findAll({
            where: { teacher_id },
            include: [{ model: Curriculum, as: 'curriculum', attributes: ['id', 'title'] }],
            order: [['createdAt', 'DESC']],
        });
        res.json({ success: true, data: coupons });
    } catch (error) { next(error); }
}

async function updateCouponStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const teacher_id = req.user.id;

        const coupon = await Coupon.findOne({ where: { id, teacher_id } });
        if (!coupon) return res.status(404).json({ success: false, message: 'الكوبون غير موجود.' });

        coupon.is_active = is_active;
        await coupon.save();

        res.json({ success: true, message: 'تم تحديث حالة الكوبون.', data: coupon });
    } catch (error) { next(error); }
}

async function validateCoupon(req, res, next) {
    try {
        const { code, curriculum_id } = req.body;
        if (!code || !curriculum_id) {
            return res.status(400).json({ success: false, message: 'كود الخصم والمقرر مطلوبان.' });
        }

        const coupon = await Coupon.findOne({ where: { code: code.trim().toUpperCase() } });
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'كود الخصم غير صحيح أو غير موجود.' });
        }

        if (!coupon.is_active) {
            return res.status(400).json({ success: false, message: 'كود الخصم غير مفعل.' });
        }

        if (coupon.expires_at && new Date() > new Date(coupon.expires_at)) {
            return res.status(400).json({ success: false, message: 'كود الخصم منتهي الصلاحية.' });
        }

        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: 'تم تجاوز الحد الأقصى لاستخدام كود الخصم.' });
        }

        if (coupon.curriculum_id && coupon.curriculum_id !== parseInt(curriculum_id)) {
            return res.status(400).json({ success: false, message: 'كود الخصم غير صالح لهذا المقرر.' });
        }

        res.json({ success: true, message: 'كود الخصم صالح.', data: coupon });
    } catch (error) { next(error); }
}

module.exports = {
    createCoupon,
    getCoupons,
    updateCouponStatus,
    validateCoupon,
};
