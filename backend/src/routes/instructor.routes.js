const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructor.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const { requireCurriculumAccess, requireOwner } = require('../middleware/adminAccess');
const { curriculumValidation, paymentSettingsValidation } = require('../utils/validators');
const { uploadVideo, uploadThumbnail } = require('../middleware/upload');
const liveSessionController = require('../controllers/liveSession.controller');
const installmentController = require('../controllers/installment.controller');
const eventController = require('../controllers/event.controller');

// All instructor routes require authentication + instructor or assistant role
router.use(authenticate, authorizeRole('instructor', 'assistant'));

// ─── Profile & Payment ────────────────────────────────────────
router.get('/profile-status', instructorController.getProfileStatus);
router.get('/payment-methods', instructorController.getPaymentMethods);
router.post('/payment-settings', paymentSettingsValidation, instructorController.savePaymentSettings);

// ─── Coupons (كوبونات) ────────────────────────────────────────
const couponController = require('../controllers/coupon.controller');
router.get('/coupons', couponController.getCoupons);
router.post('/coupons', couponController.createCoupon);
router.put('/coupons/:id/status', couponController.updateCouponStatus);

// ─── Curricula (مقررات) ────────────────────────────────────────
router.get('/curricula', instructorController.getInstructorCurricula);
router.post('/curricula', curriculumValidation, instructorController.createCurriculum);
router.get('/curricula/:id', requireCurriculumAccess(), instructorController.getCurriculumDetails);
router.get('/curricula/:id/dashboard-metrics', requireOwner(), instructorController.getCurriculumDashboardMetrics);
router.put('/curricula/:id', requireCurriculumAccess('edit_lessons'), curriculumValidation, instructorController.updateCurriculum);
router.patch('/curricula/:id/publish', requireCurriculumAccess(), instructorController.publishCurriculum);
router.patch('/curricula/:id/schedule', requireCurriculumAccess(), instructorController.scheduleCurriculum);
router.patch('/curricula/:id/submit-review', requireCurriculumAccess(), instructorController.submitForReview);
router.patch('/curricula/:id/unpublish', requireCurriculumAccess(), instructorController.unpublishCurriculum);
router.patch('/curricula/:id/review', requireOwner(), instructorController.reviewCurriculum);
router.post('/curricula/:id/thumbnail', requireCurriculumAccess('edit_lessons'), uploadThumbnail.single('thumbnail'), instructorController.uploadCurriculumThumbnail);
router.delete('/curricula/:id', requireOwner(), instructorController.deleteCurriculum);

// ─── Live Sessions (بث مباشر للمقرر) ──────────────────────────────────────────
router.post('/curricula/:id/live', requireOwner(), liveSessionController.startLiveSession);
router.put('/curricula/:id/live/:sessionId/end', requireOwner(), liveSessionController.endLiveSession);
router.get('/curricula/:id/live', requireCurriculumAccess(), liveSessionController.getActiveLiveSession);

// Scheduled Events (live/exam)
router.post('/curricula/:id/events', requireCurriculumAccess('edit_lessons'), eventController.createEvent);
router.get('/curricula/:id/events', requireCurriculumAccess(), eventController.getEvents);
router.put('/curricula/:id/events/:eventId', requireCurriculumAccess('edit_lessons'), eventController.updateEvent);
router.delete('/curricula/:id/events/:eventId', requireCurriculumAccess('edit_lessons'), eventController.deleteEvent);

// ─── Sections (وحدات) ──────────────────────────────────────────
router.post('/curricula/:id/sections', requireCurriculumAccess('create_lessons'), instructorController.createSection);
router.put('/curricula/:id/sections/:sectionId', requireCurriculumAccess('edit_lessons'), instructorController.updateSection);
router.delete('/curricula/:id/sections/:sectionId', requireCurriculumAccess('delete_lessons'), instructorController.deleteSection);
router.patch('/curricula/:id/sections/reorder', requireCurriculumAccess('edit_lessons'), instructorController.reorderSections);

// ─── Lessons (دروس) ────────────────────────────────────────────
router.post('/curricula/:id/sections/:sectionId/lessons', requireCurriculumAccess('create_lessons'), instructorController.createLesson);
router.post('/curricula/:id/upload-video-media', requireCurriculumAccess('create_lessons'), uploadVideo.single('video'), instructorController.uploadLessonVideoMedia);
router.put('/curricula/:id/sections/:sectionId/lessons/:lessonId', requireCurriculumAccess('edit_lessons'), uploadVideo.single('video'), instructorController.updateLesson);
router.delete('/curricula/:id/sections/:sectionId/lessons/:lessonId', requireCurriculumAccess('delete_lessons'), instructorController.deleteLesson);
router.patch('/curricula/:id/sections/:sectionId/lessons/reorder', requireCurriculumAccess('edit_lessons'), instructorController.reorderLessons);

// ─── Students / Enrollments ────────────────────────────────────
router.get('/pending-students', instructorController.getPendingStudents);
router.patch('/enrollments/:id/approve', instructorController.updateEnrollmentStatus);
router.get('/accepted-students', instructorController.getAcceptedStudents);
router.patch('/enrollments/:id/suspend', instructorController.suspendStudent);
router.delete('/enrollments/:id', instructorController.removeStudent);

// ─── Installments (أقساط) ──────────────────────────────────────
router.post('/curricula/:id/installment-plan', requireOwner(), installmentController.configureInstallmentPlan);
router.get('/curricula/:id/installment-plan', requireCurriculumAccess(), installmentController.getInstallmentPlan);
router.delete('/curricula/:id/installment-plan', requireOwner(), installmentController.deleteInstallmentPlan);
router.get('/pending-installments', installmentController.getPendingInstallments);
router.patch('/installments/:id/review', installmentController.reviewInstallment);

module.exports = router;
