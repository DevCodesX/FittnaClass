const { Enrollment } = require('../models');

/**
 * Ensures the requesting student has an 'approved' enrollment
 * for the course specified by req.params.id.
 */
async function ensureApprovedEnrollment(req, res, next) {
    try {
        // Instructors can always access their own course content
        if (req.user.role === 'instructor') {
            return next();
        }

        const courseId = req.params.id;
        const studentId = req.user.id;

        const enrollment = await Enrollment.findOne({
            where: {
                student_id: studentId,
                course_id: courseId,
                status: 'approved',
            },
        });

        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You must have an approved enrollment to access this content.',
            });
        }

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { ensureApprovedEnrollment };
