const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const { ensureApprovedEnrollment } = require('../middleware/enrollmentAccess');
const { uploadReceipt } = require('../middleware/upload');

// Public: Search courses (no auth required)
// GET /api/courses/explore
router.get('/courses/explore', studentController.exploreCourses);

// Student-only routes (require auth + student role)
// POST /api/courses/:id/enroll
router.post(
    '/courses/:id/enroll',
    authenticate,
    authorizeRole('student'),
    uploadReceipt.single('receipt'),
    studentController.enrollInCourse
);

// GET /api/student/my-courses
router.get(
    '/student/my-courses',
    authenticate,
    authorizeRole('student'),
    studentController.getMyCourses
);

// GET /api/courses/:id/content — requires approved enrollment
router.get(
    '/courses/:id/content',
    authenticate,
    ensureApprovedEnrollment,
    studentController.getCourseContent
);

module.exports = router;
