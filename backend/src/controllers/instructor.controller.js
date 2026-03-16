const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { PaymentMethod, Course, Enrollment, User, Content, InstructorProfile } = require('../models');
const { generateCourseCode } = require('../utils/courseCodeGenerator');

/**
 * POST /api/instructor/payment-settings
 * Save or update payment wallet information.
 */
async function savePaymentSettings(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const { provider, wallet_number, details } = req.body;
        const instructorId = req.user.id;

        // Upsert: update if same provider exists, otherwise create
        const [paymentMethod, created] = await PaymentMethod.findOrCreate({
            where: {
                instructor_id: instructorId,
                provider,
            },
            defaults: {
                instructor_id: instructorId,
                provider,
                wallet_number,
                details,
            },
        });

        if (!created) {
            await paymentMethod.update({ wallet_number, details });
        }

        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? 'Payment method added.' : 'Payment method updated.',
            data: paymentMethod,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/instructor/payment-methods
 * Get all payment methods for the authenticated instructor.
 */
async function getPaymentMethods(req, res, next) {
    try {
        const methods = await PaymentMethod.findAll({
            where: { instructor_id: req.user.id },
            order: [['createdAt', 'DESC']],
        });

        res.json({
            success: true,
            data: methods,
            hasPaymentMethod: methods.length > 0,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/instructor/profile-status
 * Check if the instructor has completed profile and payment setup.
 */
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
            data: {
                profileComplete,
                paymentComplete,
                profile: profile || null,
                paymentMethodCount: paymentMethods.length,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/instructor/courses
 * Create a new course and auto-generate a unique FT-XXXX code.
 */
async function createCourse(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const { title, description, subject, category, price } = req.body;
        const courseCode = await generateCourseCode();

        const course = await Course.create({
            course_code: courseCode,
            instructor_id: req.user.id,
            title,
            description,
            subject,
            category,
            price,
            status: 'draft',
        });

        res.status(201).json({
            success: true,
            message: 'Course created successfully.',
            data: course,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/instructor/courses
 * List all courses for the authenticated instructor.
 */
async function getInstructorCourses(req, res, next) {
    try {
        const courses = await Course.findAll({
            where: { instructor_id: req.user.id },
            include: [{
                model: Content,
                as: 'contents',
                attributes: ['id'],
            }],
            order: [['createdAt', 'DESC']],
        });

        const data = courses.map((c) => ({
            ...c.toJSON(),
            lessonCount: c.contents ? c.contents.length : 0,
        }));

        res.json({
            success: true,
            data,
            count: data.length,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/instructor/courses/:id
 * Get a single course with all its lessons.
 */
async function getCourseWithLessons(req, res, next) {
    try {
        const { id } = req.params;

        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
            include: [{
                model: Content,
                as: 'contents',
            }],
            order: [[{ model: Content, as: 'contents' }, 'order', 'ASC']],
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        res.json({
            success: true,
            data: course,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/instructor/courses/:id
 * Update course details.
 */
async function updateCourse(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const { id } = req.params;
        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        const { title, description, subject, category, price } = req.body;
        await course.update({ title, description, subject, category, price });

        res.json({
            success: true,
            message: 'Course updated successfully.',
            data: course,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/instructor/courses/:id/publish
 * Publish a course (set status to 'published').
 */
async function publishCourse(req, res, next) {
    try {
        const { id } = req.params;

        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
            include: [{
                model: Content,
                as: 'contents',
            }],
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        if (!course.contents || course.contents.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot publish a course with no lessons. Add at least one video lesson.',
            });
        }

        const paymentMethodCount = await PaymentMethod.count({
            where: { instructor_id: req.user.id },
        });

        if (paymentMethodCount === 0) {
            return res.status(403).json({
                success: false,
                code: 'PAYMENT_SETUP_REQUIRED',
                message: 'Please complete payment settings before publishing your course.',
            });
        }

        await course.update({ status: 'published' });

        res.json({
            success: true,
            message: 'Course published successfully! 🎉',
            data: course,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/instructor/courses/:id/upload-video
 * Upload a video file to local storage and create a Content record.
 */
async function uploadVideoLesson(req, res, next) {
    try {
        const { id } = req.params;

        // Verify the course belongs to this instructor
        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No video file uploaded.',
            });
        }

        // Build video URL from local storage
        const videoUrl = `/uploads/videos/${req.file.filename}`;

        // Get next order number
        const maxOrder = await Content.max('order', {
            where: { course_id: id },
        });
        const nextOrder = (maxOrder || 0) + 1;

        // Create title from filename if not provided
        const lessonTitle = req.body.title ||
            path.basename(req.file.originalname, path.extname(req.file.originalname))
                .replace(/[_-]/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());

        const content = await Content.create({
            course_id: id,
            video_url: videoUrl,
            thumbnail_url: null,
            title: lessonTitle,
            duration: req.body.duration || null,
            quality: req.body.quality || 'HD 1080p',
            file_size: req.file.size,
            original_filename: req.file.originalname,
            order: nextOrder,
        });

        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully.',
            data: content,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/instructor/courses/:id/content
 * Add a content item (video link) to a course.
 */
async function addContent(req, res, next) {
    try {
        const { id } = req.params;
        const { video_url, title, order } = req.body;

        // Verify the course belongs to this instructor
        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        // Get next order if not provided
        let lessonOrder = order;
        if (!lessonOrder) {
            const maxOrder = await Content.max('order', {
                where: { course_id: id },
            });
            lessonOrder = (maxOrder || 0) + 1;
        }

        const content = await Content.create({
            course_id: id,
            video_url,
            title,
            order: lessonOrder,
        });

        res.status(201).json({
            success: true,
            message: 'Content added successfully.',
            data: content,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/instructor/courses/:id/content/:contentId
 * Update a lesson's title.
 */
async function updateContent(req, res, next) {
    try {
        const { id, contentId } = req.params;
        const { title } = req.body;

        // Verify course ownership
        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        const content = await Content.findOne({
            where: { id: contentId, course_id: id },
        });

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found.',
            });
        }

        if (title) content.title = title;
        await content.save();

        res.json({
            success: true,
            message: 'Content updated successfully.',
            data: content,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/instructor/courses/:id/content/:contentId
 * Delete a lesson and its video file.
 */
async function deleteContent(req, res, next) {
    try {
        const { id, contentId } = req.params;

        // Verify course ownership
        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        const content = await Content.findOne({
            where: { id: contentId, course_id: id },
        });

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found.',
            });
        }

        // Delete the local video file if it exists
        if (content.video_url && content.video_url.startsWith('/uploads/')) {
            const normalizedPath = content.video_url.replace(/^\/+/, '');
            const filePath = path.join(__dirname, '..', '..', normalizedPath);
            fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Failed to delete video file:', err.message);
                }
            });
        }

        await content.destroy();

        res.json({
            success: true,
            message: 'Lesson deleted successfully.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/instructor/courses/:id/content/reorder
 * Reorder lessons. Body: { items: [{ id: 1, order: 1 }, { id: 2, order: 2 }] }
 */
async function reorderContent(req, res, next) {
    try {
        const { id } = req.params;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required with {id, order} objects.',
            });
        }

        // Verify course ownership
        const course = await Course.findOne({
            where: { id, instructor_id: req.user.id },
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or you do not have permission.',
            });
        }

        // Update each content's order
        const updates = items.map((item) =>
            Content.update(
                { order: item.order },
                { where: { id: item.id, course_id: id } }
            )
        );

        await Promise.all(updates);

        // Fetch updated list
        const contents = await Content.findAll({
            where: { course_id: id },
            order: [['order', 'ASC']],
        });

        res.json({
            success: true,
            message: 'Lessons reordered successfully.',
            data: contents,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/instructor/pending-students
 * View all pending enrollment requests for the instructor's courses.
 */
async function getPendingStudents(req, res, next) {
    try {
        const instructorId = req.user.id;

        const enrollments = await Enrollment.findAll({
            where: { status: 'pending' },
            include: [
                {
                    model: Course,
                    as: 'course',
                    where: { instructor_id: instructorId },
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

        res.json({
            success: true,
            data: enrollments,
            count: enrollments.length,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/instructor/enrollments/:id/approve
 * Approve or reject a student's enrollment.
 * Body: { status: 'approved' | 'rejected' }
 */
async function updateEnrollmentStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be "approved" or "rejected".',
            });
        }

        // Find the enrollment and verify it belongs to this instructor's course
        const enrollment = await Enrollment.findOne({
            where: { id },
            include: [{
                model: Course,
                as: 'course',
                where: { instructor_id: req.user.id },
            }],
        });

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found or you do not have permission.',
            });
        }

        if (enrollment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Enrollment already ${enrollment.status}.`,
            });
        }

        await enrollment.update({ status });

        res.json({
            success: true,
            message: `Enrollment ${status} successfully.`,
            data: enrollment,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    savePaymentSettings,
    getPaymentMethods,
    getProfileStatus,
    createCourse,
    getInstructorCourses,
    getCourseWithLessons,
    updateCourse,
    publishCourse,
    uploadVideoLesson,
    addContent,
    updateContent,
    deleteContent,
    reorderContent,
    getPendingStudents,
    updateEnrollmentStatus,
};
