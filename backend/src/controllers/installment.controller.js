const { InstallmentPlan, StudentInstallment, Enrollment, Curriculum, User } = require('../models');
const NotificationService = require('../services/NotificationService');

// ════════════════════════════════════════════════════
//  TEACHER: Configure installment plan for a curriculum
// ════════════════════════════════════════════════════

async function configureInstallmentPlan(req, res, next) {
    try {
        const { id } = req.params; // curriculum_id
        const { installment_count } = req.body;

        if (!installment_count || installment_count < 2 || installment_count > 12) {
            return res.status(400).json({ success: false, message: 'عدد الأقساط يجب أن يكون بين 2 و 12.' });
        }

        const curriculum = req.curriculum; // set by middleware
        if (Number(curriculum.price) <= 0) {
            return res.status(400).json({ success: false, message: 'لا يمكن تفعيل التقسيط لمقرر مجاني.' });
        }

        const unlockPerInstallment = parseFloat((100 / installment_count).toFixed(2));

        const [plan, created] = await InstallmentPlan.findOrCreate({
            where: { curriculum_id: id },
            defaults: { installment_count, unlock_per_installment: unlockPerInstallment },
        });

        if (!created) {
            plan.installment_count = installment_count;
            plan.unlock_per_installment = unlockPerInstallment;
            await plan.save();
        }

        const installmentAmount = (Number(curriculum.price) / installment_count).toFixed(2);

        res.json({
            success: true,
            message: created ? 'تم إنشاء خطة التقسيط.' : 'تم تحديث خطة التقسيط.',
            data: {
                ...plan.toJSON(),
                installment_amount: installmentAmount,
                total_price: curriculum.price,
            },
        });
    } catch (error) { next(error); }
}

async function getInstallmentPlan(req, res, next) {
    try {
        const { id } = req.params;
        const plan = await InstallmentPlan.findOne({ where: { curriculum_id: id } });
        if (!plan) {
            return res.json({ success: true, data: null });
        }

        const curriculum = await Curriculum.findByPk(id, { attributes: ['price'] });
        const installmentAmount = (Number(curriculum.price) / plan.installment_count).toFixed(2);

        res.json({
            success: true,
            data: {
                ...plan.toJSON(),
                installment_amount: installmentAmount,
                total_price: curriculum.price,
            },
        });
    } catch (error) { next(error); }
}

async function deleteInstallmentPlan(req, res, next) {
    try {
        const { id } = req.params;
        await InstallmentPlan.destroy({ where: { curriculum_id: id } });
        res.json({ success: true, message: 'تم حذف خطة التقسيط.' });
    } catch (error) { next(error); }
}

// ════════════════════════════════════════════════════
//  STUDENT: Pay next installment
// ════════════════════════════════════════════════════

async function payInstallment(req, res, next) {
    try {
        const curriculumId = req.params.id;
        const studentId = req.user.id;

        const enrollment = await Enrollment.findOne({
            where: { student_id: studentId, curriculum_id: curriculumId, payment_type: 'installment' },
        });
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'لا يوجد تسجيل بالتقسيط لهذا المقرر.' });
        }

        const plan = await InstallmentPlan.findOne({ where: { curriculum_id: curriculumId } });
        if (!plan) {
            return res.status(400).json({ success: false, message: 'لا توجد خطة تقسيط لهذا المقرر.' });
        }

        // Find next unpaid installment number
        const paidCount = await StudentInstallment.count({
            where: { enrollment_id: enrollment.id, status: 'approved' },
        });
        const pendingCount = await StudentInstallment.count({
            where: { enrollment_id: enrollment.id, status: 'pending' },
        });

        if (pendingCount > 0) {
            return res.status(400).json({ success: false, message: 'لديك قسط قيد المراجعة بالفعل. انتظر الموافقة أولاً.' });
        }

        const nextNumber = paidCount + 1;
        if (nextNumber > plan.installment_count) {
            return res.status(400).json({ success: false, message: 'تم دفع جميع الأقساط بالفعل.' });
        }

        const curriculum = await Curriculum.findByPk(curriculumId, { attributes: ['price', 'title'] });
        const installmentAmount = (Number(curriculum.price) / plan.installment_count).toFixed(2);

        let receiptUrl = null;
        if (req.file) {
            receiptUrl = `/uploads/receipts/${req.file.filename}`;
        }
        if (!receiptUrl) {
            return res.status(400).json({ success: false, message: 'يرجى إرفاق إيصال الدفع.' });
        }

        const installment = await StudentInstallment.create({
            enrollment_id: enrollment.id,
            installment_number: nextNumber,
            amount: installmentAmount,
            payment_receipt_url: receiptUrl,
            status: 'pending',
            paid_at: new Date(),
        });

        res.status(201).json({
            success: true,
            message: `تم إرسال إيصال القسط رقم ${nextNumber}. في انتظار الموافقة.`,
            data: installment,
        });
    } catch (error) { next(error); }
}

// ════════════════════════════════════════════════════
//  STUDENT: Get my installment progress
// ════════════════════════════════════════════════════

async function getMyInstallments(req, res, next) {
    try {
        const curriculumId = req.params.id;
        const studentId = req.user.id;

        const enrollment = await Enrollment.findOne({
            where: { student_id: studentId, curriculum_id: curriculumId },
        });
        if (!enrollment) {
            return res.json({ success: true, data: null });
        }

        const plan = await InstallmentPlan.findOne({ where: { curriculum_id: curriculumId } });
        const curriculum = await Curriculum.findByPk(curriculumId, { attributes: ['price'] });

        const installments = await StudentInstallment.findAll({
            where: { enrollment_id: enrollment.id },
            order: [['installment_number', 'ASC']],
        });

        const approvedCount = installments.filter(i => i.status === 'approved').length;
        const paidAmount = installments
            .filter(i => i.status === 'approved')
            .reduce((sum, i) => sum + Number(i.amount), 0);

        res.json({
            success: true,
            data: {
                payment_type: enrollment.payment_type,
                installments,
                plan: plan ? plan.toJSON() : null,
                total_price: curriculum ? Number(curriculum.price) : 0,
                paid_amount: paidAmount,
                remaining_amount: curriculum ? Number(curriculum.price) - paidAmount : 0,
                approved_count: approvedCount,
                total_installments: plan ? plan.installment_count : 0,
                unlock_percentage: plan ? Math.min(100, approvedCount * Number(plan.unlock_per_installment)) : 100,
            },
        });
    } catch (error) { next(error); }
}

// ════════════════════════════════════════════════════
//  TEACHER: Review (approve/reject) an installment
// ════════════════════════════════════════════════════

async function reviewInstallment(req, res, next) {
    try {
        const { id } = req.params; // installment id
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'الحالة يجب أن تكون approved أو rejected.' });
        }

        const installment = await StudentInstallment.findByPk(id, {
            include: [{
                model: Enrollment,
                as: 'enrollment',
                include: [{ model: Curriculum, as: 'curriculum' }],
            }],
        });

        if (!installment) {
            return res.status(404).json({ success: false, message: 'القسط غير موجود.' });
        }

        // Verify the teacher owns this curriculum
        if (installment.enrollment.curriculum.instructor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لمراجعة هذا القسط.' });
        }

        if (installment.status !== 'pending') {
            return res.status(400).json({ success: false, message: `هذا القسط تمت مراجعته بالفعل (${installment.status}).` });
        }

        installment.status = status;
        installment.reviewed_at = new Date();
        await installment.save();

        res.json({
            success: true,
            message: status === 'approved' ? 'تم قبول القسط وتم فتح محتوى إضافي.' : 'تم رفض إيصال القسط.',
            data: installment,
        });
    } catch (error) { next(error); }
}

// ════════════════════════════════════════════════════
//  TEACHER: Get all pending installments across curricula
// ════════════════════════════════════════════════════

async function getPendingInstallments(req, res, next) {
    try {
        const teacherId = req.user.id;

        const curricula = await Curriculum.findAll({
            where: { instructor_id: teacherId },
            attributes: ['id'],
        });
        const curriculumIds = curricula.map(c => c.id);

        if (curriculumIds.length === 0) {
            return res.json({ success: true, data: [], count: 0 });
        }

        const { Op } = require('sequelize');
        const installments = await StudentInstallment.findAll({
            where: { status: 'pending' },
            include: [{
                model: Enrollment,
                as: 'enrollment',
                where: { curriculum_id: { [Op.in]: curriculumIds } },
                include: [
                    { model: Curriculum, as: 'curriculum', attributes: ['id', 'title', 'price'] },
                    { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
                ],
            }],
            order: [['paid_at', 'ASC']],
        });

        res.json({ success: true, data: installments, count: installments.length });
    } catch (error) { next(error); }
}

module.exports = {
    configureInstallmentPlan,
    getInstallmentPlan,
    deleteInstallmentPlan,
    payInstallment,
    getMyInstallments,
    reviewInstallment,
    getPendingInstallments,
};
