const { Enrollment } = require('../models');

/**
 * Ensures the requesting student has an 'approved' enrollment
 * for the curriculum specified by req.params.id.
 */
async function ensureApprovedEnrollment(req, res, next) {
    try {
        // Instructors can always access their own curriculum content
        if (req.user.role === 'instructor') {
            return next();
        }

        const curriculumId = req.params.id;
        const studentId = req.user.id;

        const enrollment = await Enrollment.findOne({
            where: {
                student_id: studentId,
                curriculum_id: curriculumId,
                status: 'approved',
            },
        });

        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: 'غير مسموح. يجب أن يكون لديك تسجيل مقبول للوصول لهذا المحتوى.',
            });
        }

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { ensureApprovedEnrollment };
