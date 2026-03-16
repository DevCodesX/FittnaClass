const { Op } = require('sequelize');
const { Course, Enrollment, Content, User, PaymentMethod } = require('../models');

/**
 * GET /api/courses/explore
 * Search courses by title, course_code, or instructor name.
 * Query params: ?q=searchTerm
 */
async function exploreCourses(req, res, next) {
    try {
        const { q } = req.query;

        let whereClause = {};

        if (q && q.trim()) {
            const searchTerm = q.trim();

            // Check if it looks like a course code (FT-XXXX)
            if (/^FT-\d+$/i.test(searchTerm)) {
                whereClause.course_code = searchTerm.toUpperCase();
            } else {
                whereClause = {
                    [Op.or]: [
                        { title: { [Op.like]: `%${searchTerm}%` } },
                        { subject: { [Op.like]: `%${searchTerm}%` } },
                        { course_code: { [Op.like]: `%${searchTerm}%` } },
                        { category: { [Op.like]: `%${searchTerm}%` } },
                    ],
                };
            }
        }

        const courses = await Course.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'instructor',
                    attributes: ['id', 'name', 'email'],
                    // Also search by instructor name if q is provided
                    ...(q && q.trim() && !/^FT-\d+$/i.test(q.trim())
                        ? { required: false }
                        : {}
                    ),
                },
            ],
            order: [['created_at', 'DESC']],
        });

        // If we have a search term that is not a course code,
        // also find courses by instructor name
        let allCourses = courses;
        if (q && q.trim() && !/^FT-\d+$/i.test(q.trim())) {
            const searchTerm = q.trim();
            const instructorCourses = await Course.findAll({
                include: [{
                    model: User,
                    as: 'instructor',
                    attributes: ['id', 'name', 'email'],
                    where: {
                        name: { [Op.like]: `%${searchTerm}%` },
                        role: 'instructor',
                    },
                }],
                order: [['created_at', 'DESC']],
            });

            // Merge results, avoid duplicates
            const courseIds = new Set(allCourses.map((c) => c.id));
            for (const ic of instructorCourses) {
                if (!courseIds.has(ic.id)) {
                    allCourses.push(ic);
                }
            }
        }

        res.json({
            success: true,
            data: allCourses,
            count: allCourses.length,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/courses/:id/enroll
 * Enroll in a course by uploading a payment receipt screenshot.
 */
async function enrollInCourse(req, res, next) {
    try {
        const courseId = req.params.id;
        const studentId = req.user.id;

        // Check if course exists
        const course = await Course.findByPk(courseId, {
            include: [{
                model: User,
                as: 'instructor',
                attributes: ['id', 'name'],
                include: [{
                    model: PaymentMethod,
                    as: 'paymentMethods',
                }],
            }],
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found.',
            });
        }

        // Check if student is trying to enroll in their own course
        if (course.instructor_id === studentId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot enroll in your own course.',
            });
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            where: { student_id: studentId, course_id: courseId },
        });

        if (existingEnrollment) {
            return res.status(409).json({
                success: false,
                message: `You already have a ${existingEnrollment.status} enrollment for this course.`,
            });
        }

        // Get receipt URL from uploaded file
        let paymentReceiptUrl = null;
        if (req.file) {
            paymentReceiptUrl = `/uploads/receipts/${req.file.filename}`;
        }

        const enrollment = await Enrollment.create({
            student_id: studentId,
            course_id: courseId,
            payment_receipt_url: paymentReceiptUrl,
            status: 'pending',
            enrollment_date: new Date(),
        });

        res.status(201).json({
            success: true,
            message: 'Enrollment request submitted. Waiting for instructor approval.',
            data: enrollment,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/student/my-courses
 * Retrieve only approved courses for the logged-in student.
 */
async function getMyCourses(req, res, next) {
    try {
        const studentId = req.user.id;

        const enrollments = await Enrollment.findAll({
            where: {
                student_id: studentId,
                status: 'approved',
            },
            include: [{
                model: Course,
                as: 'course',
                include: [{
                    model: User,
                    as: 'instructor',
                    attributes: ['id', 'name'],
                }],
            }],
            order: [['enrollment_date', 'DESC']],
        });

        const courses = enrollments.map((e) => ({
            enrollment_id: e.id,
            enrollment_date: e.enrollment_date,
            course: e.course,
        }));

        res.json({
            success: true,
            data: courses,
            count: courses.length,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/courses/:id/content
 * Access video links for a course (only if enrollment is 'Approved').
 * Access control is handled by ensureApprovedEnrollment middleware.
 */
async function getCourseContent(req, res, next) {
    try {
        const courseId = req.params.id;

        const course = await Course.findByPk(courseId, {
            attributes: ['id', 'course_code', 'title', 'subject'],
            include: [{
                model: Content,
                as: 'contents',
                attributes: ['id', 'video_url', 'title', 'order'],
                order: [['order', 'ASC']],
            }],
            order: [[{ model: Content, as: 'contents' }, 'order', 'ASC']],
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found.',
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

module.exports = {
    exploreCourses,
    enrollInCourse,
    getMyCourses,
    getCourseContent,
};
