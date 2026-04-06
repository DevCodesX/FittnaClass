const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, PaymentMethod, Course } = require('../src/models');

describe('Student Course Details — Payment Methods Visibility', () => {
    let teacherToken = '';
    let teacherUser = null;
    let courseId = null;

    before(async () => {
        await sequelize.authenticate();
        await sequelize.sync();

        // Register a teacher
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'PM Visibility Teacher',
                email: `pm_teacher_${Date.now()}@test.com`,
                password: 'password123',
                role: 'instructor'
            });

        assert.ok(res.body.data, 'Registration should return data');
        teacherToken = res.body.data.token;
        teacherUser = res.body.data.user;

        // Save two payment methods
        await request(app)
            .post('/api/instructor/payment-settings')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ provider: 'vodafone_cash', wallet_number: '01012345678', details: 'Test VF' });

        await request(app)
            .post('/api/instructor/payment-settings')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ provider: 'instapay', wallet_number: 'testuser_insta', details: 'Test Insta' });

        // Create a course
        const courseRes = await request(app)
            .post('/api/instructor/courses')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
                title: 'PM Visibility Test Course',
                subject: 'Math',
                category: 'Science',
                price: 100,
                is_free_lesson: false,
            });

        assert.strictEqual(courseRes.status, 201);
        courseId = courseRes.body.data.id;
    });

    after(async () => {
        if (courseId) await Course.destroy({ where: { id: courseId } });
        if (teacherUser) {
            await PaymentMethod.destroy({ where: { instructor_id: teacherUser.id } });
            await User.destroy({ where: { id: teacherUser.id } });
        }
        await sequelize.close();
    });

    test('GET /api/courses/:id returns instructor with paymentMethods', async () => {
        const res = await request(app).get(`/api/courses/${courseId}`);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);

        const course = res.body.data;
        assert.ok(course.instructor, 'Course should include instructor');
        assert.ok(Array.isArray(course.instructor.paymentMethods), 'instructor.paymentMethods should be an array');
        assert.strictEqual(course.instructor.paymentMethods.length, 2, 'Should have 2 payment methods');

        const providers = course.instructor.paymentMethods.map(pm => pm.provider);
        assert.ok(providers.includes('vodafone_cash'));
        assert.ok(providers.includes('instapay'));
    });

    test('GET /api/courses/:id returns 404 for non-existent course', async () => {
        const res = await request(app).get('/api/courses/99999999');

        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
    });
});
