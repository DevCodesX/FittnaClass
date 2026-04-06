const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const { requireOwner } = require('../middleware/adminAccess');

// All admin routes require authentication + instructor or assistant role
router.use(authenticate, authorizeRole('instructor', 'assistant'));

// ─── Per-curriculum admin management (owner only) ──────────────
router.get('/curricula/:id/admins/activity-log', requireOwner(), adminController.getActivityLog);
router.get('/curricula/:id/admins', requireOwner(), adminController.listAdmins);
router.post('/curricula/:id/admins', requireOwner(), adminController.addAdmin);
router.put('/curricula/:id/admins/:adminId', requireOwner(), adminController.updateAdminPermissions);
router.delete('/curricula/:id/admins/:adminId', requireOwner(), adminController.removeAdmin);

// ─── Per-curriculum invite management (owner only) ─────────────
router.get('/curricula/:id/invites', requireOwner(), adminController.listInvites);
router.delete('/curricula/:id/invites/:inviteId', requireOwner(), adminController.cancelInvite);
router.post('/curricula/:id/invites/:inviteId/resend', requireOwner(), adminController.resendInvite);

// ─── Admin self-service ────────────────────────────────────────
router.get('/my-admin-curricula', adminController.getMyAdminCurricula);
router.get('/my-admin-invites', adminController.getMyPendingInvites);
router.post('/admin-invites/:id/accept', adminController.acceptInvite);
router.post('/admin-invites/:id/decline', adminController.declineInvite);

module.exports = router;
