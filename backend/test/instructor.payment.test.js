const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, PaymentMethod } = require('../src/models');

describe('Payment Settings API Integration Tests', () => {
    let token = '';
    let testUser = null;

    before(async () => {
        // Ensure DB is ready
        await sequelize.authenticate();
        await sequelize.sync();

        // Register a test instructor
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Instructor',
                email: `instructor_${Date.now()}@test.com`,
                password: 'password123',
                role: 'instructor'
            });
        
        if (res.status !== 201 && res.status !== 200) {
            console.error('Registration failed in test setup:', res.body);
            throw new Error('Registration failed');
        }
        
        token = res.body.data.token;
        testUser = res.body.data.user;
    });

    after(async () => {
        if (testUser) {
            await PaymentMethod.destroy({ where: { instructor_id: testUser.id } });
            await User.destroy({ where: { id: testUser.id } });
        }
        await sequelize.close();
    });

    test('Should reject malformed payload with 400 Bad Request', async () => {
        const res = await request(app)
            .post('/api/instructor/payment-settings')
            .set('Authorization', `Bearer ${token}`)
            .send({
                provider: 'vodafone_cash',
                // Missing wallet_number
            });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert(res.body.errors.some(e => e.path === 'wallet_number'));
    });

    test('Should create a new payment setting with 201', async () => {
        const res = await request(app)
            .post('/api/instructor/payment-settings')
            .set('Authorization', `Bearer ${token}`)
            .send({
                provider: 'vodafone_cash',
                wallet_number: '01000000000',
                details: 'Test Wallet'
            });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.wallet_number, '01000000000');
    });

    test('Should update existing payment setting atomically with 200', async () => {
        const res = await request(app)
            .post('/api/instructor/payment-settings')
            .set('Authorization', `Bearer ${token}`)
            .send({
                provider: 'vodafone_cash',
                wallet_number: '01099999999',
                details: 'Updated Wallet'
            });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.wallet_number, '01099999999');
    });
});
