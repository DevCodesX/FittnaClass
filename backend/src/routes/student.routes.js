const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const { ensureApprovedEnrollment } = require('../middleware/enrollmentAccess');
const { uploadReceipt } = require('../middleware/upload');
const liveSessionController = require('../controllers/liveSession.controller');
const eventController = require('../controllers/event.controller');

// Public: Search curricula (no auth required)
router.get('/curricula/explore', studentController.exploreCurricula);

// Public: Get single curriculum details with instructor payment methods
router.get('/curricula/:id', studentController.getCurriculumDetails);

// Student-only routes
router.post(
    '/curricula/:id/enroll',
    authenticate,
    authorizeRole('student'),
    uploadReceipt.single('receipt'),
    studentController.enrollInCurriculum
);

router.get(
    '/curricula/:id/enrollment-status',
    authenticate,
    authorizeRole('student'),
    studentController.checkEnrollmentStatus
);

router.get(
    '/student/my-courses',
    authenticate,
    authorizeRole('student'),
    studentController.getMyCourses
);

router.get(
    '/student/events',
    authenticate,
    authorizeRole('student'),
    eventController.getStudentEvents
);

router.get(
    '/curricula/:id/content',
    authenticate,
    ensureApprovedEnrollment,
    studentController.getCurriculumContent
);

// Get active live session
router.get(
    '/curricula/:id/live',
    authenticate,
    ensureApprovedEnrollment,
    liveSessionController.getActiveLiveSession
);

router.get(
    '/enrollments/:id',
    authenticate,
    studentController.getEnrollmentDetails
);

router.post(
    '/enrollments/:id/upload-receipt',
    authenticate,
    authorizeRole('student'),
    uploadReceipt.single('receipt'),
    studentController.uploadReceipt
);

// Coupons
const couponController = require('../controllers/coupon.controller');
router.post(
    '/validate-coupon',
    authenticate,
    authorizeRole('student'),
    couponController.validateCoupon
);

// Installments
const installmentController = require('../controllers/installment.controller');
router.get(
    '/curricula/:id/installment-plan',
    installmentController.getInstallmentPlan
);
router.post(
    '/curricula/:id/pay-installment',
    authenticate,
    authorizeRole('student'),
    uploadReceipt.single('receipt'),
    installmentController.payInstallment
);
router.get(
    '/curricula/:id/my-installments',
    authenticate,
    authorizeRole('student'),
    installmentController.getMyInstallments
);

// ─── Study Planner ─────────────────────────────────────────────
const plannerController = require('../controllers/planner.controller');
router.get(
    '/student/planner/courses',
    authenticate,
    authorizeRole('student'),
    plannerController.getPlannerCourses
);
router.get(
    '/student/planner',
    authenticate,
    authorizeRole('student'),
    plannerController.getPlan
);
router.post(
    '/student/planner/tasks',
    authenticate,
    authorizeRole('student'),
    plannerController.createTask
);
router.patch(
    '/student/planner/tasks/reorder',
    authenticate,
    authorizeRole('student'),
    plannerController.reorderTasks
);
router.patch(
    '/student/planner/tasks/:id',
    authenticate,
    authorizeRole('student'),
    plannerController.updateTask
);
router.delete(
    '/student/planner/tasks/:id',
    authenticate,
    authorizeRole('student'),
    plannerController.deleteTask
);
router.post(
    '/student/planner/ai-generate',
    authenticate,
    authorizeRole('student'),
    plannerController.aiGeneratePlan
);
// ─── Spaced Repetition (SRS) ───────────────────────────────────
const srsController = require('../controllers/srs.controller');
router.post(
    '/student/planner/srs/submit',
    authenticate,
    authorizeRole('student'),
    srsController.submitDifficulty
);
router.get(
    '/student/planner/srs/today',
    authenticate,
    authorizeRole('student'),
    srsController.getTodayReviews
);
router.get(
    '/student/planner/srs/stats',
    authenticate,
    authorizeRole('student'),
    srsController.getSRSStats
);
// ─── Gamification ──────────────────────────────────────────────
const gamificationController = require('../controllers/gamification.controller');
const leaderboardController = require('../controllers/leaderboard.controller');

router.get(
    '/student/gamification',
    authenticate,
    authorizeRole('student'),
    gamificationController.getGamificationDashboard
);

router.get(
    '/student/leaderboard',
    authenticate,
    authorizeRole('student'),
    leaderboardController.getLeaderboard
);

module.exports = router;
