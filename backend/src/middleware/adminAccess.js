const { Curriculum, CurriculumAdmin } = require('../models');

/**
 * All valid granular permissions that can be assigned to admins.
 */
const ALL_PERMISSIONS = [
    'view_payments',
    'approve_payments',
    'reject_payments',
    'create_lessons',
    'edit_lessons',
    'delete_lessons',
    'view_students',
    'manage_students',
];

/**
 * Middleware factory that checks curriculum access.
 * Allows the curriculum owner (teacher) through unconditionally.
 * For admins, verifies they have ALL of the required permissions.
 *
 * Sets on req:
 *   req.curriculum       — the Curriculum instance
 *   req.curriculumRole   — 'owner' | 'admin'
 *   req.adminPermissions — string[] (empty for owner)
 *
 * @param  {...string} requiredPermissions  e.g. 'create_lessons', 'view_students'
 */
function requireCurriculumAccess(...requiredPermissions) {
    return async (req, res, next) => {
        try {
            // The curriculum ID comes from :id in the route
            const curriculumId = req.params.id;
            if (!curriculumId) {
                return res.status(400).json({ success: false, message: 'Curriculum ID is required.' });
            }

            const curriculum = await Curriculum.findByPk(curriculumId);
            if (!curriculum) {
                return res.status(404).json({ success: false, message: 'المقرر غير موجود.' });
            }

            // Owner has full access
            if (curriculum.instructor_id === req.user.id) {
                req.curriculum = curriculum;
                req.curriculumRole = 'owner';
                req.adminPermissions = [];
                return next();
            }

            // Check if user is an active admin for this curriculum
            const adminRecord = await CurriculumAdmin.findOne({
                where: {
                    user_id: req.user.id,
                    curriculum_id: curriculumId,
                    status: 'active',
                },
            });

            if (!adminRecord) {
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك صلاحية للوصول إلى هذا المقرر.',
                });
            }

            // Verify all required permissions
            const adminPerms = adminRecord.permissions || [];
            const missingPerms = requiredPermissions.filter((p) => !adminPerms.includes(p));

            if (missingPerms.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك الصلاحيات المطلوبة.',
                    missingPermissions: missingPerms,
                });
            }

            req.curriculum = curriculum;
            req.curriculumRole = 'admin';
            req.adminPermissions = adminPerms;
            return next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware that restricts access to the curriculum owner only.
 * Used for admin management endpoints.
 */
function requireOwner() {
    return async (req, res, next) => {
        try {
            const curriculumId = req.params.id;
            if (!curriculumId) {
                return res.status(400).json({ success: false, message: 'Curriculum ID is required.' });
            }

            const curriculum = await Curriculum.findByPk(curriculumId);
            if (!curriculum) {
                return res.status(404).json({ success: false, message: 'المقرر غير موجود.' });
            }

            if (curriculum.instructor_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'هذا الإجراء متاح لمالك المقرر فقط.',
                });
            }

            req.curriculum = curriculum;
            req.curriculumRole = 'owner';
            req.adminPermissions = [];
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { requireCurriculumAccess, requireOwner, ALL_PERMISSIONS };
