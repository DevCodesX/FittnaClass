const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructor.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const { courseValidation, paymentSettingsValidation } = require('../utils/validators');
const { uploadVideo } = require('../middleware/upload');

// All instructor routes require authentication + instructor role
router.use(authenticate, authorizeRole('instructor'));

// ─── Profile & Payment ────────────────────────────────────────
router.get('/profile-status', instructorController.getProfileStatus);
router.get('/payment-methods', instructorController.getPaymentMethods);
router.post(
    '/payment-settings',
    paymentSettingsValidation,
    instructorController.savePaymentSettings
);

// ─── Courses ───────────────────────────────────────────────────
router.get('/courses', instructorController.getInstructorCourses);
router.post('/courses', courseValidation, instructorController.createCourse);
router.get('/courses/:id', instructorController.getCourseWithLessons);
router.put('/courses/:id', courseValidation, instructorController.updateCourse);
router.patch('/courses/:id/publish', instructorController.publishCourse);

// ─── Content / Lessons ─────────────────────────────────────────
router.post('/courses/:id/upload-video', uploadVideo.single('video'), instructorController.uploadVideoLesson);
router.post('/courses/:id/content', instructorController.addContent);
router.put('/courses/:id/content/:contentId', instructorController.updateContent);
router.delete('/courses/:id/content/:contentId', instructorController.deleteContent);
router.patch('/courses/:id/content/reorder', instructorController.reorderContent);

// ─── Students / Enrollments ────────────────────────────────────
router.get('/pending-students', instructorController.getPendingStudents);
router.patch('/enrollments/:id/approve', instructorController.updateEnrollmentStatus);

module.exports = router;
