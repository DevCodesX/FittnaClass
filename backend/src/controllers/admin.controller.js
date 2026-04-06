const { CurriculumAdmin, AdminActivityLog, AdminInvite, User, Curriculum } = require('../models');
const { ALL_PERMISSIONS } = require('../middleware/adminAccess');
const { Op } = require('sequelize');

// ═══════════════════════════════════════════════════════════════
//  ADMIN MANAGEMENT (owner-only)
// ═══════════════════════════════════════════════════════════════

/**
 * List all admins for a curriculum.
 * GET /api/instructor/curricula/:id/admins
 */
async function listAdmins(req, res, next) {
    try {
        const admins = await CurriculumAdmin.findAll({
            where: {
                curriculum_id: req.params.id,
                status: { [Op.ne]: 'removed' },
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email'],
            }],
            order: [['createdAt', 'DESC']],
        });

        res.json({ success: true, data: admins, count: admins.length });
    } catch (error) { next(error); }
}

/**
 * Add an admin by email — supports both registered and unregistered users.
 * If the user exists → creates CurriculumAdmin directly.
 * If the user does NOT exist → creates AdminInvite with a token.
 * POST /api/instructor/curricula/:id/admins
 * Body: { email, permissions }
 */
async function addAdmin(req, res, next) {
    try {
        const { email, permissions } = req.body;
        const curriculumId = req.params.id;

        if (!email) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب.' });
        }

        // Validate permissions
        const validPerms = (permissions || []).filter((p) => ALL_PERMISSIONS.includes(p));
        if (validPerms.length === 0) {
            return res.status(400).json({ success: false, message: 'يجب تحديد صلاحية واحدة على الأقل.' });
        }

        // Cannot add yourself
        const selfUser = await User.findByPk(req.user.id);
        if (selfUser && selfUser.email === email.trim().toLowerCase()) {
            return res.status(400).json({ success: false, message: 'لا يمكنك إضافة نفسك كمشرف.' });
        }

        // Check if the user is already registered
        const targetUser = await User.findOne({ where: { email: email.trim() } });

        if (targetUser) {
            // ── Registered user → attach directly ──────────────
            const existing = await CurriculumAdmin.findOne({
                where: { user_id: targetUser.id, curriculum_id: curriculumId },
            });

            if (existing) {
                if (existing.status === 'removed') {
                    await existing.update({ permissions: validPerms, status: 'pending' });
                    const result = await CurriculumAdmin.findByPk(existing.id, {
                        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
                    });
                    return res.json({ success: true, message: 'تمت إعادة دعوة المشرف بنجاح.', data: result, type: 'direct' });
                }
                return res.status(409).json({ success: false, message: 'هذا المستخدم مضاف بالفعل كمشرف.' });
            }

            const admin = await CurriculumAdmin.create({
                user_id: targetUser.id,
                curriculum_id: curriculumId,
                permissions: validPerms,
                status: 'pending',
            });

            await AdminActivityLog.create({
                curriculum_id: curriculumId,
                user_id: req.user.id,
                action: 'add_admin',
                details: { admin_email: email, permissions: validPerms },
            });

            const result = await CurriculumAdmin.findByPk(admin.id, {
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
            });

            return res.status(201).json({ success: true, message: 'تمت إضافة المشرف بنجاح.', data: result, type: 'direct' });
        }

        // ── Unregistered user → create invite ──────────────
        const existingInvite = await AdminInvite.findOne({
            where: {
                email: email.trim().toLowerCase(),
                curriculum_id: curriculumId,
                status: 'pending',
            },
        });

        if (existingInvite) {
            return res.status(409).json({ success: false, message: 'توجد دعوة معلقة لهذا البريد الإلكتروني بالفعل.' });
        }

        const token = AdminInvite.generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invite = await AdminInvite.create({
            email: email.trim().toLowerCase(),
            curriculum_id: curriculumId,
            permissions: validPerms,
            token,
            status: 'pending',
            expires_at: expiresAt,
            invited_by: req.user.id,
        });

        await AdminActivityLog.create({
            curriculum_id: curriculumId,
            user_id: req.user.id,
            action: 'send_invite',
            details: { email: email.trim(), permissions: validPerms },
        });

        const inviteLink = `/invite/${token}`;

        res.status(201).json({
            success: true,
            message: 'تم إنشاء رابط الدعوة! شارك الرابط مع المشرف.',
            data: invite,
            inviteLink,
            type: 'invite',
        });
    } catch (error) { next(error); }
}

/**
 * Update admin permissions.
 * PUT /api/instructor/curricula/:id/admins/:adminId
 */
async function updateAdminPermissions(req, res, next) {
    try {
        const { adminId } = req.params;
        const { permissions } = req.body;

        const validPerms = (permissions || []).filter((p) => ALL_PERMISSIONS.includes(p));
        if (validPerms.length === 0) {
            return res.status(400).json({ success: false, message: 'يجب تحديد صلاحية واحدة على الأقل.' });
        }

        const admin = await CurriculumAdmin.findOne({
            where: { id: adminId, curriculum_id: req.params.id, status: { [Op.ne]: 'removed' } },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        });

        if (!admin) {
            return res.status(404).json({ success: false, message: 'المشرف غير موجود.' });
        }

        const oldPerms = admin.permissions;
        await admin.update({ permissions: validPerms });

        await AdminActivityLog.create({
            curriculum_id: req.params.id,
            user_id: req.user.id,
            action: 'update_admin_permissions',
            details: { admin_id: adminId, old_permissions: oldPerms, new_permissions: validPerms },
        });

        res.json({ success: true, message: 'تم تحديث صلاحيات المشرف بنجاح.', data: admin });
    } catch (error) { next(error); }
}

/**
 * Remove an admin.
 * DELETE /api/instructor/curricula/:id/admins/:adminId
 */
async function removeAdmin(req, res, next) {
    try {
        const { adminId } = req.params;

        const admin = await CurriculumAdmin.findOne({
            where: { id: adminId, curriculum_id: req.params.id, status: { [Op.ne]: 'removed' } },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        });

        if (!admin) {
            return res.status(404).json({ success: false, message: 'المشرف غير موجود.' });
        }

        await admin.update({ status: 'removed' });

        await AdminActivityLog.create({
            curriculum_id: req.params.id,
            user_id: req.user.id,
            action: 'remove_admin',
            details: { admin_email: admin.user?.email, admin_name: admin.user?.name },
        });

        res.json({ success: true, message: 'تمت إزالة المشرف بنجاح.' });
    } catch (error) { next(error); }
}

/**
 * Get activity log for a curriculum.
 * GET /api/instructor/curricula/:id/admins/activity-log
 */
async function getActivityLog(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { count, rows } = await AdminActivityLog.findAndCountAll({
            where: { curriculum_id: req.params.id },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email'],
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        res.json({
            success: true,
            data: rows,
            pagination: { total: count, page, totalPages: Math.ceil(count / limit) },
        });
    } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════
//  INVITE MANAGEMENT (owner-only)
// ═══════════════════════════════════════════════════════════════

/**
 * List all invites for a curriculum.
 * GET /api/instructor/curricula/:id/invites
 */
async function listInvites(req, res, next) {
    try {
        const invites = await AdminInvite.findAll({
            where: {
                curriculum_id: req.params.id,
                status: { [Op.in]: ['pending', 'accepted'] },
            },
            include: [{
                model: User,
                as: 'inviter',
                attributes: ['id', 'name'],
            }],
            order: [['createdAt', 'DESC']],
        });

        const now = new Date();
        const data = invites.map((inv) => {
            const json = inv.toJSON();
            if (json.status === 'pending' && new Date(json.expires_at) < now) {
                json.status = 'expired';
            }
            return json;
        });

        res.json({ success: true, data, count: data.length });
    } catch (error) { next(error); }
}

/**
 * Cancel a pending invite.
 * DELETE /api/instructor/curricula/:id/invites/:inviteId
 */
async function cancelInvite(req, res, next) {
    try {
        const invite = await AdminInvite.findOne({
            where: { id: req.params.inviteId, curriculum_id: req.params.id, status: 'pending' },
        });

        if (!invite) {
            return res.status(404).json({ success: false, message: 'الدعوة غير موجودة أو تم استخدامها.' });
        }

        await invite.update({ status: 'cancelled' });

        await AdminActivityLog.create({
            curriculum_id: req.params.id,
            user_id: req.user.id,
            action: 'cancel_invite',
            details: { email: invite.email },
        });

        res.json({ success: true, message: 'تم إلغاء الدعوة بنجاح.' });
    } catch (error) { next(error); }
}

/**
 * Resend an invite (generate new token + reset expiry).
 * POST /api/instructor/curricula/:id/invites/:inviteId/resend
 */
async function resendInvite(req, res, next) {
    try {
        const invite = await AdminInvite.findOne({
            where: { id: req.params.inviteId, curriculum_id: req.params.id, status: 'pending' },
        });

        if (!invite) {
            return res.status(404).json({ success: false, message: 'الدعوة غير موجودة.' });
        }

        const newToken = AdminInvite.generateToken();
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await invite.update({ token: newToken, expires_at: newExpiry });

        res.json({
            success: true,
            message: 'تم تجديد رابط الدعوة بنجاح.',
            data: invite,
            inviteLink: `/invite/${newToken}`,
        });
    } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════
//  PUBLIC INVITE TOKEN FLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Verify an invite token (public — no auth required).
 * GET /api/invite/:token
 */
async function verifyInviteToken(req, res, next) {
    try {
        const invite = await AdminInvite.findOne({
            where: { token: req.params.token },
            include: [{
                model: Curriculum,
                as: 'curriculum',
                attributes: ['id', 'title', 'course_code', 'subject'],
                include: [{ model: User, as: 'instructor', attributes: ['id', 'name'] }],
            }, {
                model: User,
                as: 'inviter',
                attributes: ['id', 'name'],
            }],
        });

        if (!invite) {
            return res.status(404).json({ success: false, message: 'رابط الدعوة غير صالح.', code: 'INVALID_TOKEN' });
        }
        if (invite.status === 'accepted') {
            return res.status(410).json({ success: false, message: 'تم استخدام هذه الدعوة بالفعل.', code: 'ALREADY_USED' });
        }
        if (invite.status === 'cancelled') {
            return res.status(410).json({ success: false, message: 'تم إلغاء هذه الدعوة.', code: 'CANCELLED' });
        }
        if (invite.isExpired()) {
            await invite.update({ status: 'expired' });
            return res.status(410).json({ success: false, message: 'انتهت صلاحية هذه الدعوة.', code: 'EXPIRED' });
        }

        res.json({
            success: true,
            data: {
                email: invite.email,
                permissions: invite.permissions,
                curriculum: invite.curriculum,
                inviter: invite.inviter,
                expiresAt: invite.expires_at,
            },
        });
    } catch (error) { next(error); }
}

/**
 * Accept an invite by token (auth required).
 * POST /api/invite/:token/accept
 */
async function acceptInviteByToken(req, res, next) {
    try {
        const invite = await AdminInvite.findOne({
            where: { token: req.params.token, status: 'pending' },
        });

        if (!invite) {
            return res.status(404).json({ success: false, message: 'رابط الدعوة غير صالح أو تم استخدامه.' });
        }
        if (invite.isExpired()) {
            await invite.update({ status: 'expired' });
            return res.status(410).json({ success: false, message: 'انتهت صلاحية هذه الدعوة.' });
        }

        const user = await User.findByPk(req.user.id);
        if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'هذه الدعوة مرسلة لبريد إلكتروني مختلف. يرجى تسجيل الدخول بالحساب الصحيح.',
            });
        }

        // Create or reactivate admin record
        const existing = await CurriculumAdmin.findOne({
            where: { user_id: user.id, curriculum_id: invite.curriculum_id },
        });

        if (existing) {
            if (existing.status === 'active') {
                await invite.update({ status: 'accepted' });
                return res.json({ success: true, message: 'أنت بالفعل مشرف على هذا المقرر.' });
            }
            await existing.update({ permissions: invite.permissions, status: 'active' });
        } else {
            await CurriculumAdmin.create({
                user_id: user.id,
                curriculum_id: invite.curriculum_id,
                permissions: invite.permissions,
                status: 'active',
            });
        }

        await invite.update({ status: 'accepted' });

        await AdminActivityLog.create({
            curriculum_id: invite.curriculum_id,
            user_id: user.id,
            action: 'accept_invite',
            details: { via: 'invite_link', invite_id: invite.id },
        });

        res.json({ success: true, message: 'تم قبول الدعوة بنجاح! أنت الآن مشرف على هذا المقرر.' });
    } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN SELF-SERVICE (existing — for registered-user invites)
// ═══════════════════════════════════════════════════════════════

async function acceptInvite(req, res, next) {
    try {
        const invite = await CurriculumAdmin.findOne({
            where: { user_id: req.user.id, curriculum_id: req.params.id, status: 'pending' },
        });
        if (!invite) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على دعوة معلقة.' });
        }
        await invite.update({ status: 'active' });
        await AdminActivityLog.create({
            curriculum_id: req.params.id, user_id: req.user.id, action: 'accept_invite', details: {},
        });
        res.json({ success: true, message: 'تم قبول الدعوة بنجاح. أنت الآن مشرف على هذا المقرر.' });
    } catch (error) { next(error); }
}

async function declineInvite(req, res, next) {
    try {
        const invite = await CurriculumAdmin.findOne({
            where: { user_id: req.user.id, curriculum_id: req.params.id, status: 'pending' },
        });
        if (!invite) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على دعوة معلقة.' });
        }
        await invite.update({ status: 'removed' });
        res.json({ success: true, message: 'تم رفض الدعوة.' });
    } catch (error) { next(error); }
}

async function getMyAdminCurricula(req, res, next) {
    try {
        const records = await CurriculumAdmin.findAll({
            where: { user_id: req.user.id, status: { [Op.in]: ['active', 'pending'] } },
            include: [{
                model: Curriculum, as: 'curriculum',
                include: [{ model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }],
            }],
            order: [['createdAt', 'DESC']],
        });
        res.json({ success: true, data: records, count: records.length });
    } catch (error) { next(error); }
}

async function getMyPendingInvites(req, res, next) {
    try {
        const invites = await CurriculumAdmin.findAll({
            where: { user_id: req.user.id, status: 'pending' },
            include: [{
                model: Curriculum, as: 'curriculum', attributes: ['id', 'title', 'course_code', 'subject'],
                include: [{ model: User, as: 'instructor', attributes: ['id', 'name'] }],
            }],
            order: [['createdAt', 'DESC']],
        });
        res.json({ success: true, data: invites, count: invites.length });
    } catch (error) { next(error); }
}

module.exports = {
    listAdmins,
    addAdmin,
    updateAdminPermissions,
    removeAdmin,
    getActivityLog,
    listInvites,
    cancelInvite,
    resendInvite,
    verifyInviteToken,
    acceptInviteByToken,
    acceptInvite,
    declineInvite,
    getMyAdminCurricula,
    getMyPendingInvites,
};
