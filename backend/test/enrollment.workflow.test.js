const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const fs = require('fs');
const { sequelize, User, PaymentMethod, Course, Enrollment } = require('../src/models');

describe('Enrollment Workflow API Integration Tests', () => {
    let teacherToken = '';
    let teacherUser = null;
    let studentToken = '';
    let studentUser = null;
    let courseId = null;
    let enrollmentId = null;

    // Create a dummy image file for testing uploads
    const dummyImagePath = path.join(__dirname, 'dummy_receipt.png');
    
    before(async () => {
        // Create dummy image file
        fs.writeFileSync(dummyImagePath, 'dummy pixel data');

        await sequelize.authenticate();
        await sequelize.sync({ alter: true });

        // 1. Register a teacher
        const teacherRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Enrollment Teacher',
                email: `enroll_teacher_${Date.now()}@test.com`,
                password: 'password123',
                role: 'instructor'
            });
        
        teacherToken = teacherRes.body.data.token;
        teacherUser = teacherRes.body.data.user;

        // Save payment method (required for publishing)
        await request(app)
            .post('/api/instructor/payment-settings')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ provider: 'vodafone_cash', wallet_number: '01012345678', details: 'Test VF' });

        // Create a paid course
        const courseRes = await request(app)
            .post('/api/instructor/courses')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
                title: 'Idempotency Test Course',
                subject: 'Math',
                category: 'Science',
                price: 150,
                is_free_lesson: false,
            });

        courseId = courseRes.body.data.id;

        // 2. Register a student
        const studentRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Enrollment Student',
                email: `enroll_student_${Date.now()}@test.com`,
                password: 'password123',
                role: 'student',
                grade_level: 'Grade 10',
                national_id: '12345678901234'
            });

        if (studentRes.status !== 201 && studentRes.status !== 200) {
            console.error('Registration failed for student:', studentRes.body);
            throw new Error(`Student registration failed: ${JSON.stringify(studentRes.body)}`);
        }
        
        studentToken = studentRes.body.data.token;
        studentUser = studentRes.body.data.user;
    });

    after(async () => {
        if (enrollmentId) await Enrollment.destroy({ where: { id: enrollmentId } });
        if (courseId) await Course.destroy({ where: { id: courseId } });
        if (teacherUser) {
            await PaymentMethod.destroy({ where: { instructor_id: teacherUser.id } });
            await User.destroy({ where: { id: teacherUser.id } });
        }
        if (studentUser) {
            await User.destroy({ where: { id: studentUser.id } });
        }
        
        if (fs.existsSync(dummyImagePath)) {
            fs.unlinkSync(dummyImagePath);
        }
        await sequelize.close();
    });

    test('Student enrolls without receipt, should create pending enrollment (Step 1)', async () => {
        const res = await request(app)
            .post(`/api/courses/${courseId}/enroll`)
            .set('Authorization', `Bearer ${studentToken}`);

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.status, 'pending');
        assert.strictEqual(res.body.data.payment_receipt_url, null);
        assert.strictEqual(res.body.data.receipt_uploaded_at, null);
        enrollmentId = res.body.data.id;
    });

    test('Student enrolls again, should return 200 OK (Idempotency Step 2)', async () => {
        const res = await request(app)
            .post(`/api/courses/${courseId}/enroll`)
            .set('Authorization', `Bearer ${studentToken}`);

        // Must not conflict! Must be idempotent.
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.status, 'pending');
        assert.strictEqual(res.body.message.includes('already have a pending enrollment'), true);
    });

    test('Student uploads receipt to existing enrollment via upload-receipt endpoint (Step 3)', async () => {
        const res = await request(app)
            .post(`/api/enrollments/${enrollmentId}/upload-receipt`)
            .set('Authorization', `Bearer ${studentToken}`)
            .attach('receipt', dummyImagePath);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok(res.body.data.payment_receipt_url.startsWith('/uploads/receipts/'));
        assert.ok(res.body.data.receipt_uploaded_at !== null);
    });

    test('Teacher views pending students and approves the payment (Step 4)', async () => {
        // Teacher lists pending
        const pendingRes = await request(app)
            .get('/api/instructor/pending-students')
            .set('Authorization', `Bearer ${teacherToken}`);
        
        assert.strictEqual(pendingRes.status, 200);
        assert.ok(pendingRes.body.data.length > 0);
        const enrollmentRecord = pendingRes.body.data.find(e => e.id === enrollmentId);
        assert.ok(enrollmentRecord);
        assert.ok(enrollmentRecord.payment_receipt_url, 'Teacher should see the receipt URL');
        
        // Teacher approves
        const approveRes = await request(app)
            .patch(`/api/instructor/enrollments/${enrollmentId}/approve`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ status: 'approved' });
        
        assert.strictEqual(approveRes.status, 200);
        assert.strictEqual(approveRes.body.success, true);
        assert.strictEqual(approveRes.body.data.status, 'approved');
        assert.ok(approveRes.body.data.reviewed_at !== null, 'Teacher review time must be logged');
    });
});
