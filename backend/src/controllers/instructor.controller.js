const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { PaymentMethod, Curriculum, Section, Lesson, Enrollment, User, InstructorProfile, AdminActivityLog, CurriculumAdmin } = require('../models');
const NotificationService = require('../services/NotificationService');
const EventSyncService = require('../services/EventSyncService');
const { generateCourseCode } = require('../utils/courseCodeGenerator');
const { validateCurriculumBeforePublish } = require('../utils/curriculumValidator');
const { Op } = require('sequelize');

/**
 * Helper: log admin activity (only when actor is an admin, not the owner).
 */
async function logAdminAction(req, action, details = {}) {
    if (req.curriculumRole === 'admin') {
        await AdminActivityLog.create({
            curriculum_id: req.curriculum.id,
            user_id: req.user.id,
            action,
            details,
        });
    }
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE & PAYMENT
// ═══════════════════════════════════════════════════════════════

async function savePaymentSettings(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        }

        const { provider, wallet_number, details } = req.body;
        const instructorId = req.user.id;
        let wasCreated = false;

        const paymentMethod = await PaymentMethod.sequelize.transaction(async (t) => {
            const existingMethod = await PaymentMethod.findOne({
                where: { instructor_id: instructorId, provider },
                lock: t.LOCK.UPDATE,
                transaction: t,
            });

            if (existingMethod) {
                await existingMethod.update({ wallet_number, details }, { transaction: t });
                wasCreated = false;
            } else {
                await PaymentMethod.create({ instructor_id: instructorId, provider, wallet_number, details }, { transaction: t });
                wasCreated = true;
            }

            const persistedRecord = await PaymentMethod.findOne({
                where: { instructor_id: instructorId, provider },
                transaction: t,
            });

            if (!persistedRecord || persistedRecord.wallet_number !== wallet_number) {
                throw new Error('Database write verification failed');
            }
            return persistedRecord;
        });

        return res.status(wasCreated ? 201 : 200).json({
            success: true,
            message: wasCreated ? 'Payment method added.' : 'Payment method updated.',
            data: paymentMethod,
        });
    } catch (error) { next(error); }
}

async function getPaymentMethods(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (req.user.role !== 'instructor') {
            return res.status(403).json({ success: false, message: 'Forbidden: Only instructors can access payment methods.' });
        }

        const teacher = await User.findOne({ where: { id: req.user.id, role: 'instructor' } });
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }

        const methods = await PaymentMethod.findAll({
            where: { instructor_id: req.user.id },
            order: [['createdAt', 'DESC']],
        });
        res.json({ success: true, data: methods, hasPaymentMethod: methods.length > 0 });
    } catch (error) { 
        console.error('Error in getPaymentMethods:', error);
        next(error); 
    }
}

async function getProfileStatus(req, res, next) {
    try {
        const instructorId = req.user.id;
        const [profile, paymentMethods] = await Promise.all([
            InstructorProfile.findOne({ where: { user_id: instructorId } }),
            PaymentMethod.findAll({ where: { instructor_id: instructorId } }),
        ]);

        const profileComplete = !!(profile && profile.specialization && profile.subject);
        const paymentComplete = paymentMethods.length > 0;

        res.json({
            success: true,
            data: { profileComplete, paymentComplete, profile: profile || null, paymentMethodCount: paymentMethods.length },
        });
    } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════
//  CURRICULA (مقررات)
// ═══════════════════════════════════════════════════════════════

async function createCurriculum(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        }

        const { title, description, education_type, stage, subject, category, grade_level, price, is_free_lesson } = req.body;
        const courseCode = await generateCourseCode();
        const isFreeLesson = is_free_lesson === true || is_free_lesson === 'true';
        const normalizedPrice = isFreeLesson ? 0 : Number(price);

        if (isFreeLesson && Number(price) !== 0 && price !== undefined && price !== null && String(price).trim() !== '') {
            return res.status(400).json({ success: false, message: 'Price must be 0 when is_free_lesson is true.' });
        }
        if (!isFreeLesson && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
            return res.status(400).json({ success: false, message: 'Price must be greater than 0 when is_free_lesson is false.' });
        }

        const curriculum = await Curriculum.create({
            course_code: courseCode,
            instructor_id: req.user.id,
            title, description, education_type, stage, subject, category: stage === 'ثانوي' ? category : null, grade_level,
            price: normalizedPrice,
            is_free_lesson: isFreeLesson,
            status: 'draft',
        });

        res.status(201).json({ success: true, message: 'تم إنشاء المقرر بنجاح.', data: curriculum });
    } catch (error) { next(error); }
}

async function getInstructorCurricula(req, res, next) {
    try {
        // Get owned curricula
        const ownedCurricula = await Curriculum.findAll({
            where: { instructor_id: req.user.id },
            include: [{
                model: Section,
                as: 'sections',
                attributes: ['id'],
                include: [{
                    model: Lesson,
                    as: 'lessons',
                    attributes: ['id'],
                }],
            }],
            order: [['createdAt', 'DESC']],
        });

        // Also get curricula where user is an active admin
        const adminRecords = await CurriculumAdmin.findAll({
            where: { user_id: req.user.id, status: 'active' },
            attributes: ['curriculum_id', 'permissions'],
        });
        const adminCurriculumIds = adminRecords.map(a => a.curriculum_id);

        let adminCurricula = [];
        if (adminCurriculumIds.length > 0) {
            adminCurricula = await Curriculum.findAll({
                where: { id: { [Op.in]: adminCurriculumIds } },
                include: [{
                    model: Section,
                    as: 'sections',
                    attributes: ['id'],
                    include: [{
                        model: Lesson,
                        as: 'lessons',
                        attributes: ['id'],
                    }],
                }],
                order: [['createdAt', 'DESC']],
            });
        }

        const formatCurriculum = (c, role = 'owner', permissions = []) => {
            const json = c.toJSON();
            let lessonCount = 0;
            if (json.sections) {
                for (const s of json.sections) {
                    lessonCount += s.lessons ? s.lessons.length : 0;
                }
            }
            return { ...json, sectionCount: json.sections ? json.sections.length : 0, lessonCount, role, permissions };
        };

        const data = [
            ...ownedCurricula.map(c => formatCurriculum(c, 'owner')),
            ...adminCurricula.map(c => {
                const rec = adminRecords.find(a => a.curriculum_id === c.id);
                return formatCurriculum(c, 'admin', rec?.permissions || []);
            }),
        ];

        res.json({ success: true, data, count: data.length });
    } catch (error) { next(error); }
}

async function getCurriculumDetails(req, res, next) {
    try {
        const { id } = req.params;

        // req.curriculum is set by requireCurriculumAccess middleware
        const curriculum = await Curriculum.findOne({
            where: { id },
            include: [{
                model: Section,
                as: 'sections',
                include: [{
                    model: Lesson,
                    as: 'lessons',
                    order: [['order', 'ASC']],
                }, {
                    model: Section,
                    as: 'children',
                    include: [{
                        model: Lesson,
                        as: 'lessons',
                        order: [['order', 'ASC']],
                    }],
                }],
            }],
            order: [
                [{ model: Section, as: 'sections' }, 'order', 'ASC'],
                [{ model: Section, as: 'sections' }, { model: Lesson, as: 'lessons' }, 'order', 'ASC'],
            ],
        });

        if (!curriculum) {
            return res.status(404).json({ success: false, message: 'المقرر غير موجود أو ليس لديك صلاحية.' });
        }

        // Attach role info to response
        const data = curriculum.toJSON();
        data.userRole = req.curriculumRole || 'owner';
        data.userPermissions = req.adminPermissions || [];

        res.json({ success: true, data });
    } catch (error) { next(error); }
}

async function getCurriculumDashboardMetrics(req, res, next) {
    try {
        const { id } = req.params;
        const curriculum = req.curriculum; // Set by requireOwner middleware

        // 1. Total Students (approved enrollments)
        const totalStudents = await Enrollment.count({
            where: { curriculum_id: id, status: 'approved' }
        });

        // 2. Pending Requests
        const pendingRequests = await Enrollment.count({
            where: { curriculum_id: id, status: 'pending' }
        });

        // 3. Total Revenue
        const totalRevenue = totalStudents * (Number(curriculum.price) || 0);

        res.json({
            success: true,
            data: {
                totalStudents,
                pendingRequests,
                totalRevenue,
            }
        });
    } catch (error) { next(error); }
}

async function updateCurriculum(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        }

        const curriculum = req.curriculum; // Set by middleware

        const { title, description, education_type, stage, subject, category, grade_level, price, is_free_lesson } = req.body;
        const isFreeLesson = is_free_lesson === true || is_free_lesson === 'true';
        const normalizedPrice = isFreeLesson ? 0 : Number(price);

        if (isFreeLesson && Number(price) !== 0 && price !== undefined && price !== null && String(price).trim() !== '') {
            return res.status(400).json({ success: false, message: 'Price must be 0 when is_free_lesson is true.' });
        }
        if (!isFreeLesson && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
            return res.status(400).json({ success: false, message: 'Price must be greater than 0 when is_free_lesson is false.' });
        }

        await curriculum.update({ title, description, education_type, stage, subject, category: stage === 'ثانوي' ? category : null, grade_level, price: normalizedPrice, is_free_lesson: isFreeLesson });
        await logAdminAction(req, 'update_curriculum', { title });

        res.json({ success: true, message: 'تم تحديث المقرر بنجاح.', data: curriculum });
    } catch (error) { next(error); }
}

async function publishCurriculum(req, res, next) {
    try {
        const curriculum = req.curriculum; // Set by middleware

        // Reload full curriculum
        const fullCurriculum = await Curriculum.findByPk(curriculum.id);

        // Use reusable validation
        const validation = await validateCurriculumBeforePublish(fullCurriculum);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.errors.join(' '), errors: validation.errors });
        }

        if (!fullCurriculum.is_free_lesson) {
            const paymentMethodCount = await PaymentMethod.count({ where: { instructor_id: fullCurriculum.instructor_id } });
            if (paymentMethodCount === 0) {
                return res.status(403).json({
                    success: false, code: 'PAYMENT_SETUP_REQUIRED',
                    message: 'يرجى إعداد طرق الدفع قبل نشر المقرر.',
                });
            }
        }

        await fullCurriculum.update({ status: 'published', published_at: new Date(), scheduled_publish_at: null });
        await logAdminAction(req, 'publish_curriculum', {});
        res.json({ success: true, message: 'تم نشر المقرر بنجاح.', data: fullCurriculum });
    } catch (error) { next(error); }
}

async function scheduleCurriculum(req, res, next) {
    try {
        const curriculum = req.curriculum;
        const { scheduled_publish_at } = req.body;

        if (!scheduled_publish_at) {
            return res.status(400).json({ success: false, message: 'تاريخ ووقت النشر المجدول مطلوب.' });
        }

        const scheduledDate = new Date(scheduled_publish_at);
        if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
            return res.status(400).json({ success: false, message: 'يجب أن يكون تاريخ النشر المجدول في المستقبل.' });
        }

        const fullCurriculum = await Curriculum.findByPk(curriculum.id);

        // Validate before scheduling
        const validation = await validateCurriculumBeforePublish(fullCurriculum);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.errors.join(' '), errors: validation.errors });
        }

        if (!fullCurriculum.is_free_lesson) {
            const paymentMethodCount = await PaymentMethod.count({ where: { instructor_id: fullCurriculum.instructor_id } });
            if (paymentMethodCount === 0) {
                return res.status(403).json({
                    success: false, code: 'PAYMENT_SETUP_REQUIRED',
                    message: 'يرجى إعداد طرق الدفع قبل جدولة نشر المقرر.',
                });
            }
        }

        await fullCurriculum.update({ status: 'scheduled', scheduled_publish_at: scheduledDate });
        await logAdminAction(req, 'schedule_curriculum', { scheduled_publish_at: scheduledDate });
        res.json({ success: true, message: `تم جدولة النشر في ${scheduledDate.toLocaleString('ar-EG')}.`, data: fullCurriculum });
    } catch (error) { next(error); }
}

async function submitForReview(req, res, next) {
    try {
        const curriculum = req.curriculum;
        const fullCurriculum = await Curriculum.findByPk(curriculum.id);

        if (fullCurriculum.status !== 'draft') {
            return res.status(400).json({ success: false, message: 'يمكن إرسال المقررات ذات حالة "مسودة" فقط للمراجعة.' });
        }

        // Validate before submitting for review
        const validation = await validateCurriculumBeforePublish(fullCurriculum);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.errors.join(' '), errors: validation.errors });
        }

        await fullCurriculum.update({ status: 'in_review' });
        await logAdminAction(req, 'submit_for_review', {});
        res.json({ success: true, message: 'تم إرسال المقرر للمراجعة.', data: fullCurriculum });
    } catch (error) { next(error); }
}

async function unpublishCurriculum(req, res, next) {
    try {
        const curriculum = req.curriculum;
        const fullCurriculum = await Curriculum.findByPk(curriculum.id);

        if (!['published', 'scheduled', 'in_review'].includes(fullCurriculum.status)) {
            return res.status(400).json({ success: false, message: 'المقرر ليس في حالة يمكن إلغاء نشرها.' });
        }

        await fullCurriculum.update({ status: 'draft', scheduled_publish_at: null });
        await logAdminAction(req, 'unpublish_curriculum', {});
        res.json({ success: true, message: 'تم إلغاء نشر المقرر. أصبح مسودة.', data: fullCurriculum });
    } catch (error) { next(error); }
}

async function reviewCurriculum(req, res, next) {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' or 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'الإجراء يجب أن يكون "approve" أو "reject".' });
        }

        const curriculum = await Curriculum.findByPk(id);
        if (!curriculum) {
            return res.status(404).json({ success: false, message: 'المقرر غير موجود.' });
        }

        // Only owner can review (admin of the platform)
        if (curriculum.instructor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لمراجعة هذا المقرر.' });
        }

        if (curriculum.status !== 'in_review') {
            return res.status(400).json({ success: false, message: 'المقرر ليس قيد المراجعة.' });
        }

        if (action === 'approve') {
            await curriculum.update({ status: 'published', published_at: new Date() });
            res.json({ success: true, message: 'تمت الموافقة على المقرر ونشره بنجاح.', data: curriculum });
        } else {
            await curriculum.update({ status: 'draft' });
            res.json({ success: true, message: 'تم رفض المقرر وإعادته كمسودة.', data: curriculum });
        }
    } catch (error) { next(error); }
}

async function uploadCurriculumThumbnail(req, res, next) {
    try {
        const curriculum = req.curriculum; // Set by middleware

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'لم يتم إرسال أي صورة.' });
        }

        // Construct the URL path (assuming /uploads/thumbnails is served statically)
        // Adjust the base path according to your app's static file serving configuration
        // Using environment variable or default relative path
        const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
        
        // Remove previous thumbnail if exists (optional cleanup)
        // For now, simple update
        await curriculum.update({ thumbnail_url: thumbnailUrl });

        res.json({ 
            success: true, 
            message: 'تم رفع الصورة بنجاح.', 
            data: { thumbnail_url: thumbnailUrl } 
        });
    } catch (error) { next(error); }
}

async function deleteCurriculum(req, res, next) {
    try {
        const curriculum = req.curriculum; // Set by middleware (typically requireOwner)

        if (!curriculum) {
            return res.status(404).json({ success: false, message: 'المقرر غير موجود.' });
        }

        // Soft delete (archive)
        await curriculum.update({ status: 'archived', scheduled_publish_at: null });
        
        await logAdminAction(req, 'delete_curriculum', { title: curriculum.title });

        res.json({ success: true, message: 'تم حذف المقرر بنجاح.' });
    } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════
//  SECTIONS (وحدات / أبواب)
// ═══════════════════════════════════════════════════════════════

async function createSection(req, res, next) {
    try {
        const { id } = req.params;
        const { title, parent_id } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'عنوان الوحدة مطلوب.' });
        }

        // Curriculum access already verified by middleware

        const maxOrder = await Section.max('order', { where: { curriculum_id: id, parent_id: parent_id || null } });
        const nextOrder = (maxOrder || 0) + 1;

        const section = await Section.create({
            curriculum_id: id,
            parent_id: parent_id || null,
            title: title.trim(),
            order: nextOrder,
        });

        await logAdminAction(req, 'create_section', { title: title.trim() });
        res.status(201).json({ success: true, message: 'تمت إضافة الوحدة بنجاح.', data: section });
    } catch (error) { next(error); }
}

async function updateSection(req, res, next) {
    try {
        const { id, sectionId } = req.params;
        const { title } = req.body;

        // Curriculum access already verified by middleware

        const section = await Section.findOne({ where: { id: sectionId, curriculum_id: id } });
        if (!section) {
            return res.status(404).json({ success: false, message: 'الوحدة غير موجودة.' });
        }

        if (title) section.title = title.trim();
        await section.save();
        await logAdminAction(req, 'update_section', { sectionId, title });

        res.json({ success: true, message: 'تم تحديث الوحدة بنجاح.', data: section });
    } catch (error) { next(error); }
}

async function deleteSection(req, res, next) {
    try {
        const { id, sectionId } = req.params;

        // Curriculum access already verified by middleware

        const section = await Section.findOne({
            where: { id: sectionId, curriculum_id: id },
            include: [{ model: Lesson, as: 'lessons' }],
        });
        if (!section) {
            return res.status(404).json({ success: false, message: 'الوحدة غير موجودة.' });
        }

        // Delete video files for all lessons in this section
        for (const lesson of section.lessons || []) {
            if (lesson.video_url && lesson.video_url.startsWith('/uploads/')) {
                const normalizedPath = lesson.video_url.replace(/^\/+/, '');
                const filePath = path.join(__dirname, '..', '..', normalizedPath);
                fs.unlink(filePath, (err) => {
                    if (err && err.code !== 'ENOENT') console.error('Failed to delete video:', err.message);
                });
            }
        }

        await section.destroy(); // Cascade deletes lessons
        await logAdminAction(req, 'delete_section', { sectionId, title: section.title });

        res.json({ success: true, message: 'تم حذف الوحدة بنجاح.' });
    } catch (error) { next(error); }
}

async function reorderSections(req, res, next) {
    try {
        const { id } = req.params;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'items array is required with {id, order} objects.' });
        }

        // Curriculum access already verified by middleware

        await Promise.all(items.map((item) =>
            Section.update({ order: item.order }, { where: { id: item.id, curriculum_id: id } })
        ));

        const sections = await Section.findAll({
            where: { curriculum_id: id },
            order: [['order', 'ASC']],
        });

        res.json({ success: true, message: 'تم إعادة ترتيب الوحدات.', data: sections });
    } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════
//  LESSONS (دروس)
// ═══════════════════════════════════════════════════════════════

async function createLesson(req, res, next) {
    try {
        const { id, sectionId } = req.params;
        const { title, video_url, type, order } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'عنوان الدرس مطلوب.' });
        }

        // Curriculum access already verified by middleware

        const section = await Section.findOne({ where: { id: sectionId, curriculum_id: id } });
        if (!section) {
            return res.status(404).json({ success: false, message: 'الوحدة غير موجودة.' });
        }

        let lessonOrder = order;
        if (!lessonOrder) {
            const maxOrder = await Lesson.max('order', { where: { section_id: sectionId } });
            lessonOrder = (maxOrder || 0) + 1;
        }

        const lesson = await Lesson.create({
            section_id: sectionId,
            title: title.trim(),
            video_url: video_url || null,
            type: type || 'video',
            order: lessonOrder,
        });

        await logAdminAction(req, 'create_lesson', { title: title.trim(), sectionId });
        res.status(201).json({ success: true, message: 'تمت إضافة الدرس بنجاح.', data: lesson });
    } catch (error) { next(error); }
}

async function uploadLessonVideoMedia(req, res, next) {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'لم يتم رفع ملف فيديو.' });
        }

        const videoUrl = `/uploads/videos/${req.file.filename}`;
        
        await logAdminAction(req, 'upload_video', { filename: req.file.originalname, curriculumId: id });
        
        res.status(200).json({ 
            success: true, 
            message: 'تم رفع الفيديو بنجاح.', 
            data: {
                video_url: videoUrl,
                original_filename: req.file.originalname,
                size: req.file.size
            } 
        });
    } catch (error) { next(error); }
}

async function updateLesson(req, res, next) {
    try {
        const { id, sectionId, lessonId } = req.params;
        const { title, type, description, duration, quality } = req.body;

        // Curriculum access already verified by middleware

        const lesson = await Lesson.findOne({ where: { id: lessonId, section_id: sectionId } });
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'الدرس غير موجود.' });
        }

        if (title) lesson.title = title.trim();
        if (type) lesson.type = type;
        if (description !== undefined) lesson.description = description ? description.trim() : null;

        if (req.file) {
            if (lesson.video_url && lesson.video_url.startsWith('/uploads/')) {
                const normalizedPath = lesson.video_url.replace(/^\/+/, '');
                const filePath = path.join(__dirname, '..', '..', normalizedPath);
                fs.unlink(filePath, (err) => {
                    if (err && err.code !== 'ENOENT') console.error('Failed to delete old video:', err.message);
                });
            }
            lesson.video_url = `/uploads/videos/${req.file.filename}`;
            lesson.file_size = req.file.size;
            lesson.original_filename = req.file.originalname;
            lesson.type = 'video';
        }

        if (duration) lesson.duration = duration;
        if (quality) lesson.quality = quality;

        await lesson.save();
        await logAdminAction(req, 'update_lesson', { lessonId, title: lesson.title });

        res.json({ success: true, message: 'تم تحديث الدرس بنجاح.', data: lesson });
    } catch (error) { next(error); }
}

async function deleteLesson(req, res, next) {
    try {
        const { id, sectionId, lessonId } = req.params;

        // Curriculum access already verified by middleware

        const lesson = await Lesson.findOne({ where: { id: lessonId, section_id: sectionId } });
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'الدرس غير موجود.' });
        }

        if (lesson.video_url && lesson.video_url.startsWith('/uploads/')) {
            const normalizedPath = lesson.video_url.replace(/^\/+/, '');
            const filePath = path.join(__dirname, '..', '..', normalizedPath);
            fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') console.error('Failed to delete video:', err.message);
            });
        }

        await lesson.destroy();
        await logAdminAction(req, 'delete_lesson', { lessonId, title: lesson.title });
        res.json({ success: true, message: 'تم حذف الدرس بنجاح.' });
    } catch (error) { next(error); }
}

async function reorderLessons(req, res, next) {
    try {
        const { id, sectionId } = req.params;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'items array is required with {id, order} objects.' });
        }

        // Curriculum access already verified by middleware

        await Promise.all(items.map((item) =>
            Lesson.update({ order: item.order }, { where: { id: item.id, section_id: sectionId } })
        ));

        const lessons = await Lesson.findAll({
            where: { section_id: sectionId },
            order: [['order', 'ASC']],
        });

        res.json({ success: true, message: 'تم إعادة ترتيب الدروس.', data: lessons });
    } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════
//  STUDENTS / ENROLLMENTS
// ═══════════════════════════════════════════════════════════════

async function getPendingStudents(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        let curriculumIds = [];
        
        if (req.user.role === 'instructor') {
            const curricula = await Curriculum.findAll({ where: { instructor_id: req.user.id }, attributes: ['id'] });
            curriculumIds = curricula.map(c => c.id);
        } else if (req.user.role === 'assistant') {
            const adminRecords = await CurriculumAdmin.findAll({ 
                where: { user_id: req.user.id, status: 'active' },
                attributes: ['curriculum_id', 'permissions']
            });
            curriculumIds = adminRecords
                .filter(record => {
                    const perms = record.permissions || [];
                    return perms.includes('view_students') || perms.includes('manage_students');
                })
                .map(r => r.curriculum_id);
        }

        if (curriculumIds.length === 0) {
            return res.json({ success: true, data: [], count: 0 });
        }

        const enrollments = await Enrollment.findAll({
            where: { 
                status: 'pending',
                curriculum_id: { [Op.in]: curriculumIds }
            },
            include: [
                {
                    model: Curriculum,
                    as: 'curriculum',
                    attributes: ['id', 'course_code', 'title', 'subject'],
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['id', 'name', 'email', 'grade_level'],
                },
            ],
            order: [['enrollment_date', 'ASC']],
        });

        res.json({ success: true, data: enrollments, count: enrollments.length });
    } catch (error) { 
        console.error('Error in getPendingStudents:', error);
        next(error); 
    }
}

async function updateEnrollmentStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be "approved" or "rejected".' });
        }

        const enrollment = await Enrollment.findOne({
            where: { id },
            include: [{
                model: Curriculum,
                as: 'curriculum',
                where: { instructor_id: req.user.id },
            }],
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found or you do not have permission.' });
        }

        if (enrollment.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Enrollment already ${enrollment.status}.` });
        }

        const oldStatus = enrollment.status;
        await enrollment.update({ status, reviewed_at: new Date() });

        if (status === 'approved' && oldStatus === 'pending') {
            // Referrer Reward
            const studentUser = await User.findByPk(enrollment.student_id);
            if (studentUser && studentUser.referred_by_user_id) {
                const referrer = await User.findByPk(studentUser.referred_by_user_id);
                if (referrer) {
                    const pricePaid = enrollment.final_price !== null ? Number(enrollment.final_price) : Number(enrollment.curriculum.price);
                    if (pricePaid > 0) {
                        const reward = pricePaid * 0.10; // 10% reward
                        referrer.wallet_balance = Number(referrer.wallet_balance) + reward;
                        await referrer.save();
                    }
                }
            }

            await EventSyncService.syncUpcomingEventsForStudent(
                enrollment.curriculum.id,
                enrollment.student_id
            );
        }

        const eventType = status === 'approved' ? 'enrollment_approved' : 'enrollment_rejected';
        await NotificationService.notifyForEvent(eventType, {
            student_id: enrollment.student_id,
            curriculum_id: enrollment.curriculum.id,
            curriculum_title: enrollment.curriculum.title,
            enrollment_id: enrollment.id,
        });

        res.json({ success: true, message: `Enrollment ${status} successfully.`, data: enrollment });
    } catch (error) { next(error); }
}

async function getAcceptedStudents(req, res, next) {
    try {
        const instructorId = req.user.id;
        const enrollments = await Enrollment.findAll({
            where: { status: 'approved' },
            include: [
                {
                    model: Curriculum,
                    as: 'curriculum',
                    where: { instructor_id: instructorId },
                    attributes: ['id', 'course_code', 'title', 'subject'],
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['id', 'name', 'email', 'grade_level'],
                },
            ],
            order: [['reviewed_at', 'DESC'], ['enrollment_date', 'DESC']],
        });

        // Map to format matching frontend expectations
        const mappedData = enrollments.map(e => ({
            id: e.id,
            student_id: e.student_id,
            name: e.student?.name,
            email: e.student?.email,
            grade: e.student?.grade_level || 'غير محدد',
            track: 'عام', // Assuming 'عام' layout or add field 
            curriculums: [e.curriculum?.title],
            joinDate: e.reviewed_at || e.enrollment_date,
            status: e.is_suspended ? 'suspended' : 'active',
            paymentStatus: e.payment_receipt_url ? 'paid' : 'due',
            lastActive: e.updatedAt,
        }));

        res.json({ success: true, data: mappedData, count: mappedData.length });
    } catch (error) { next(error); }
}

async function suspendStudent(req, res, next) {
    try {
        const { id } = req.params;
        const { is_suspended } = req.body;

        if (typeof is_suspended !== 'boolean') {
            return res.status(400).json({ success: false, message: 'is_suspended must be a boolean.' });
        }

        const enrollment = await Enrollment.findOne({
            where: { id },
            include: [{
                model: Curriculum,
                as: 'curriculum',
                where: { instructor_id: req.user.id },
            }],
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found or access denied.' });
        }

        await enrollment.update({ is_suspended });
        res.json({ success: true, message: `Student access has been ${is_suspended ? 'suspended' : 'activated'}.` });
    } catch (error) { next(error); }
}

async function removeStudent(req, res, next) {
    try {
        const { id } = req.params;

        const enrollment = await Enrollment.findOne({
            where: { id },
            include: [{
                model: Curriculum,
                as: 'curriculum',
                where: { instructor_id: req.user.id },
            }],
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found or access denied.' });
        }

        // Hard delete the enrollment to completely remove the student from this curriculum
        await enrollment.destroy();
        
        res.json({ success: true, message: 'Student removed from the curriculum completely.' });
    } catch (error) { next(error); }
}

module.exports = {
    savePaymentSettings,
    getPaymentMethods,
    getProfileStatus,
    createCurriculum,
    getInstructorCurricula,
    getCurriculumDetails,
    getCurriculumDashboardMetrics,
    updateCurriculum,
    publishCurriculum,
    scheduleCurriculum,
    submitForReview,
    unpublishCurriculum,
    reviewCurriculum,
    uploadCurriculumThumbnail,
    deleteCurriculum,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    createLesson,
    uploadLessonVideoMedia,
    updateLesson,
    deleteLesson,
    reorderLessons,
    getPendingStudents,
    updateEnrollmentStatus,
    getAcceptedStudents,
    suspendStudent,
    removeStudent,
};
