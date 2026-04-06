const { Op } = require('sequelize');
const { Curriculum, Section, Lesson, Enrollment, User, PaymentMethod } = require('../models');
const NotificationService = require('../services/NotificationService');
const EventSyncService = require('../services/EventSyncService');

/**
 * GET /api/curricula/explore
 * Search curricula by title, course_code, or instructor name.
 */
async function exploreCurricula(req, res, next) {
    try {
        const { q, education_type, stage, grade_level, category, subject, free } = req.query;

        let whereClause = { status: 'published' };

        if (education_type && education_type.trim() && education_type !== 'all') whereClause.education_type = education_type.trim();
        if (stage && stage.trim() && stage !== 'all') whereClause.stage = stage.trim();
        if (grade_level && grade_level.trim() && grade_level !== 'all') whereClause.grade_level = grade_level.trim();
        if (category && category.trim() && category !== 'all') whereClause.category = category.trim();
        if (subject && subject.trim() && subject !== 'all') whereClause.subject = subject.trim();
        if (free === 'true') whereClause.price = 0;

        if (q && q.trim()) {
            const searchTerm = q.trim();
            if (/^FT-\d+$/i.test(searchTerm)) {
                whereClause.course_code = searchTerm.toUpperCase();
            } else {
                whereClause = {
                    ...whereClause,
                    [Op.or]: [
                        { title: { [Op.like]: `%${searchTerm}%` } },
                        { subject: { [Op.like]: `%${searchTerm}%` } },
                        { course_code: { [Op.like]: `%${searchTerm}%` } },
                        { category: { [Op.like]: `%${searchTerm}%` } },
                    ],
                };
            }
        }

        const curricula = await Curriculum.findAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'instructor',
                attributes: ['id', 'name', 'email', 'avatar_url'],
                ...(q && q.trim() && !/^FT-\d+$/i.test(q.trim()) ? { required: false } : {}),
            }, {
                model: Section,
                as: 'sections',
                attributes: ['id', 'title'],
                include: [{
                    model: Lesson,
                    as: 'lessons',
                    attributes: ['id']
                }]
            }],
            order: [['created_at', 'DESC']],
        });

        let allCurricula = curricula;
        if (q && q.trim() && !/^FT-\d+$/i.test(q.trim())) {
            const searchTerm = q.trim();
            const instructorCurricula = await Curriculum.findAll({
                where: free === 'true' ? { price: 0, status: 'published' } : { status: 'published' },
                include: [{
                    model: User,
                    as: 'instructor',
                    attributes: ['id', 'name', 'email', 'avatar_url'],
                    where: { name: { [Op.like]: `%${searchTerm}%` }, role: 'instructor' },
                }, {
                    model: Section,
                    as: 'sections',
                    attributes: ['id', 'title'],
                    include: [{
                        model: Lesson,
                        as: 'lessons',
                        attributes: ['id']
                    }]
                }],
                order: [['created_at', 'DESC']],
            });

            const ids = new Set(allCurricula.map((c) => c.id));
            for (const ic of instructorCurricula) {
                if (!ids.has(ic.id)) allCurricula.push(ic);
            }
        }

        res.json({ success: true, data: allCurricula, count: allCurricula.length });
    } catch (error) { next(error); }
}

/**
 * POST /api/curricula/:id/enroll
 */
async function enrollInCurriculum(req, res, next) {
    try {
        const curriculumId = req.params.id;
        const studentId = req.user.id;
        const { coupon_code, use_wallet, payment_type } = req.body;

        const curriculum = await Curriculum.findByPk(curriculumId, {
            include: [{
                model: User,
                as: 'instructor',
                attributes: ['id', 'name', 'avatar_url'],
                include: [{ model: PaymentMethod, as: 'paymentMethods' }],
            }],
        });

        if (!curriculum || curriculum.status !== 'published') {
            return res.status(404).json({ success: false, message: 'المقرر غير موجود.' });
        }

        if (curriculum.instructor_id === studentId) {
            return res.status(400).json({ success: false, message: 'لا يمكنك التسجيل في مقررك الخاص.' });
        }

        const existingEnrollment = await Enrollment.findOne({
            where: { student_id: studentId, curriculum_id: curriculumId },
        });

        if (existingEnrollment) {
            let updated = false;
            if (req.file) {
                existingEnrollment.payment_receipt_url = `/uploads/receipts/${req.file.filename}`;
                existingEnrollment.receipt_uploaded_at = new Date();
                if (existingEnrollment.status === 'rejected') existingEnrollment.status = 'pending';
                await existingEnrollment.save();
                updated = true;
            }

            return res.status(200).json({
                success: true,
                message: updated
                    ? 'تم رفع الإيصال بنجاح. في انتظار موافقة المدرس.'
                    : `لديك تسجيل ${existingEnrollment.status === 'pending' ? 'قيد الانتظار' : existingEnrollment.status === 'approved' ? 'مقبول' : 'مرفوض'} بالفعل.`,
                data: existingEnrollment,
            });
        }

        const student = await User.findByPk(studentId);
        let finalPrice = Number(curriculum.price);
        let discountApplied = 0;
        let couponId = null;
        let couponRecord = null;
        let priceAfterCoupon = finalPrice;

        // Apply coupon
        if (coupon_code && finalPrice > 0) {
            const { Coupon } = require('../models');
            couponRecord = await Coupon.findOne({ where: { code: coupon_code.trim().toUpperCase() } });
            
            if (
                couponRecord && 
                couponRecord.is_active && 
                (!couponRecord.expires_at || new Date() < new Date(couponRecord.expires_at)) &&
                (!couponRecord.usage_limit || couponRecord.used_count < couponRecord.usage_limit) &&
                (!couponRecord.curriculum_id || couponRecord.curriculum_id === parseInt(curriculumId))
            ) {
                couponId = couponRecord.id;
                let cDiscount = 0;
                if (couponRecord.discount_type === 'percentage') {
                    cDiscount = (finalPrice * Number(couponRecord.discount_value)) / 100;
                } else {
                    cDiscount = Number(couponRecord.discount_value);
                }
                
                finalPrice = Math.max(0, finalPrice - cDiscount);
                priceAfterCoupon = finalPrice;
                discountApplied += cDiscount;
            } else {
                return res.status(400).json({ success: false, message: 'كود الخصم غير صالح أو منتهي الصلاحية.' });
            }
        }

        // Apply wallet
        if (use_wallet === 'true' && Number(student.wallet_balance) > 0 && finalPrice > 0) {
            const walletBalance = Number(student.wallet_balance);
            if (walletBalance >= finalPrice) {
                student.wallet_balance = walletBalance - finalPrice;
                discountApplied += finalPrice;
                finalPrice = 0;
            } else {
                student.wallet_balance = 0;
                discountApplied += walletBalance;
                finalPrice -= walletBalance;
            }
            await student.save();
        }

        const isFreeCurriculum = finalPrice === 0;
        let paymentReceiptUrl = null;
        if (req.file) paymentReceiptUrl = `/uploads/receipts/${req.file.filename}`;
        // Allow proceeding if the curriculum is free, or free due to discounts
        if (!isFreeCurriculum && !paymentReceiptUrl) {
            return res.status(400).json({ success: false, message: 'يرجى إرفاق إيصال الدفع للطلب المدفوع.' });
        }

        const enrollmentStatus = isFreeCurriculum ? 'approved' : 'pending';

        const enrollment = await Enrollment.create({
            student_id: studentId,
            curriculum_id: curriculumId,
            payment_receipt_url: paymentReceiptUrl,
            status: enrollmentStatus,
            receipt_uploaded_at: paymentReceiptUrl ? new Date() : null,
            enrollment_date: new Date(),
            coupon_id: couponId,
            discount_applied: discountApplied,
            final_price: finalPrice,
            payment_type: payment_type === 'installment' ? 'installment' : 'full',
        });

        // If installment, create first installment record
        if (payment_type === 'installment' && !isFreeCurriculum) {
            const { InstallmentPlan, StudentInstallment } = require('../models');
            const plan = await InstallmentPlan.findOne({ where: { curriculum_id: curriculumId } });
            if (plan) {
                const installmentAmount = (finalPrice / plan.installment_count).toFixed(2);
                // Auto-approve the enrollment so student gets partial access
                enrollment.status = 'approved';
                await enrollment.save();
                // Create first pending installment
                await StudentInstallment.create({
                    enrollment_id: enrollment.id,
                    installment_number: 1,
                    amount: installmentAmount,
                    payment_receipt_url: paymentReceiptUrl,
                    status: 'pending',
                    paid_at: new Date(),
                });
            }
        }

        // Update coupon usage
        if (couponRecord) {
            couponRecord.used_count += 1;
            await couponRecord.save();
        }

        if (enrollment.status === 'approved') {
            await EventSyncService.syncUpcomingEventsForStudent(curriculumId, studentId);
        }

        // Referrer reward for instantly approved enrollments
        if (enrollmentStatus === 'approved' && student.referred_by_user_id && priceAfterCoupon > 0) {
            const referrer = await User.findByPk(student.referred_by_user_id);
            if (referrer) {
                const reward = priceAfterCoupon * 0.10;
                referrer.wallet_balance = Number(referrer.wallet_balance) + reward;
                await referrer.save();
            }
        }

        if (enrollmentStatus !== 'approved') {
            await NotificationService.notifyForEvent('student_requested_enrollment', {
                student_id: studentId,
                curriculum_id: curriculumId,
                curriculum_title: curriculum.title,
                enrollment_id: enrollment.id,
            });
        }

        res.status(201).json({
            success: true,
            message: enrollmentStatus === 'approved' ? 'تم التسجيل بنجاح. القيمة المدفوعة: ' + finalPrice + ' ج.م' : 'تم إرسال طلب التسجيل. في انتظار موافقة المدرس.',
            data: enrollment,
        });
    } catch (error) { next(error); }
}

/**
 * GET /api/student/my-courses
 */
async function getMyCourses(req, res, next) {
    try {
        const studentId = req.user.id;
        const enrollments = await Enrollment.findAll({
            where: { 
                student_id: studentId, 
                status: { [Op.in]: ['approved', 'pending'] } 
            },
            include: [{
                model: Curriculum,
                as: 'curriculum',
                include: [{
                    model: User,
                    as: 'instructor',
                    attributes: ['id', 'name', 'avatar_url'],
                }],
            }],
            order: [['enrollment_date', 'DESC']],
        });

        const courses = enrollments.map((e) => ({
            enrollment_id: e.id,
            enrollment_date: e.enrollment_date,
            status: e.status,
            course: e.curriculum,
        }));

        res.json({ success: true, data: courses, count: courses.length });
    } catch (error) { next(error); }
}

/**
 * GET /api/curricula/:id/content
 * Returns the full hierarchy: sections → lessons
 */
async function getCurriculumContent(req, res, next) {
    try {
        const curriculumId = req.params.id;

        const curriculum = await Curriculum.findByPk(curriculumId, {
            attributes: ['id', 'course_code', 'title', 'subject'],
            include: [{
                model: Section,
                as: 'sections',
                include: [{
                    model: Lesson,
                    as: 'lessons',
                    attributes: ['id', 'video_url', 'title', 'type', 'duration', 'order'],
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

        // Compute unlock percentage for installment students
        let unlockPercentage = 100;
        let installmentInfo = null;

        if (req.user.role === 'student') {
            const enrollment = await Enrollment.findOne({
                where: { student_id: req.user.id, curriculum_id: curriculumId },
            });

            if (enrollment && enrollment.payment_type === 'installment') {
                const { InstallmentPlan, StudentInstallment } = require('../models');
                const plan = await InstallmentPlan.findOne({ where: { curriculum_id: curriculumId } });
                if (plan) {
                    const approvedCount = await StudentInstallment.count({
                        where: { enrollment_id: enrollment.id, status: 'approved' },
                    });
                    unlockPercentage = Math.min(100, approvedCount * Number(plan.unlock_per_installment));
                    const totalPrice = Number(enrollment.final_price) || 0;
                    const paidAmount = approvedCount * (totalPrice / plan.installment_count);
                    installmentInfo = {
                        paid_amount: paidAmount,
                        total_price: totalPrice,
                        approved_count: approvedCount,
                        total_installments: plan.installment_count,
                        unlock_percentage: unlockPercentage,
                    };
                }
            }
        }

        // Apply locking to lessons
        const data = curriculum.toJSON();
        if (unlockPercentage < 100) {
            let allLessons = [];
            data.sections.forEach(s => {
                s.lessons.forEach(l => allLessons.push(l));
            });
            const totalLessons = allLessons.length;
            const unlockCount = Math.ceil((unlockPercentage / 100) * totalLessons);
            let idx = 0;
            data.sections.forEach(section => {
                section.lessons.forEach(lesson => {
                    if (idx >= unlockCount) {
                        lesson.is_locked = true;
                        lesson.video_url = null; // hide video for locked lessons
                    } else {
                        lesson.is_locked = false;
                    }
                    idx++;
                });
            });
        } else {
            data.sections.forEach(section => {
                section.lessons.forEach(lesson => {
                    lesson.is_locked = false;
                });
            });
        }

        data.installment_info = installmentInfo;

        res.json({ success: true, data });
    } catch (error) { next(error); }
}

/**
 * GET /api/curricula/:id
 * Public: get curriculum details with instructor info and payment methods.
 */
async function getCurriculumDetails(req, res, next) {
    try {
        const curriculumId = req.params.id;

        const curriculum = await Curriculum.findByPk(curriculumId, {
            include: [{
                model: User,
                as: 'instructor',
                attributes: ['id', 'name', 'email', 'avatar_url'],
                include: [{
                    model: PaymentMethod,
                    as: 'paymentMethods',
                    attributes: ['id', 'provider', 'wallet_number', 'details'],
                }],
            }, {
                model: Section,
                as: 'sections',
                attributes: ['id', 'title', 'order'],
                include: [{
                    model: Lesson,
                    as: 'lessons',
                    attributes: ['id', 'title', 'type', 'duration', 'order'],
                }]
            }],
            order: [
                [{ model: Section, as: 'sections' }, 'order', 'ASC'],
                [{ model: Section, as: 'sections' }, { model: Lesson, as: 'lessons' }, 'order', 'ASC'],
            ],
        });

        if (!curriculum || curriculum.status !== 'published') {
            return res.status(404).json({ success: false, message: 'المقرر غير موجود.' });
        }

        res.json({ success: true, data: curriculum });
    } catch (error) { next(error); }
}

/**
 * GET /api/curricula/:id/enrollment-status
 */
async function checkEnrollmentStatus(req, res, next) {
    try {
        const curriculumId = req.params.id;
        const studentId = req.user.id;

        const enrollment = await Enrollment.findOne({
            where: { student_id: studentId, curriculum_id: curriculumId },
        });

        res.json({
            success: true,
            data: enrollment ? {
                status: enrollment.status,
                enrollment_id: enrollment.id,
                payment_receipt_url: enrollment.payment_receipt_url,
                receipt_uploaded_at: enrollment.receipt_uploaded_at,
            } : null,
        });
    } catch (error) { next(error); }
}

/**
 * GET /api/enrollments/:id
 */
async function getEnrollmentDetails(req, res, next) {
    try {
        const enrollmentId = req.params.id;
        const studentId = req.user.id;

        const enrollment = await Enrollment.findOne({
            where: { id: enrollmentId, student_id: studentId },
            include: [{
                model: Curriculum,
                as: 'curriculum',
                include: [{
                    model: User,
                    as: 'instructor',
                    attributes: ['id', 'name', 'avatar_url'],
                }],
            }],
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'التسجيل غير موجود.' });
        }

        res.json({ success: true, data: enrollment });
    } catch (error) { next(error); }
}

/**
 * POST /api/enrollments/:id/upload-receipt
 */
async function uploadReceipt(req, res, next) {
    try {
        const enrollmentId = req.params.id;
        const studentId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'لم يتم تقديم ملف الإيصال.' });
        }

        const enrollment = await Enrollment.findOne({
            where: { id: enrollmentId, student_id: studentId },
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'التسجيل غير موجود.' });
        }

        enrollment.payment_receipt_url = `/uploads/receipts/${req.file.filename}`;
        enrollment.receipt_uploaded_at = new Date();
        if (enrollment.status === 'rejected') enrollment.status = 'pending';
        await enrollment.save();

        await NotificationService.notifyForEvent('payment_submitted', {
            student_id: studentId,
            curriculum_id: enrollment.curriculum.id,
            curriculum_title: enrollment.curriculum.title,
            enrollment_id: enrollment.id,
        });

        res.json({ success: true, message: 'تم رفع الإيصال بنجاح.', data: enrollment });
    } catch (error) { next(error); }
}

module.exports = {
    exploreCurricula,
    enrollInCurriculum,
    getMyCourses,
    getCurriculumContent,
    getCurriculumDetails,
    checkEnrollmentStatus,
    getEnrollmentDetails,
    uploadReceipt,
};
