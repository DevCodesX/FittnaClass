const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, Curriculum, CurriculumAdmin, AdminActivityLog } = require('../src/models');

describe('Admin System Integration Tests', () => {
    let ownerToken = '';
    let ownerUser = null;
    let adminToken = '';
    let adminUser = null;
    let outsiderToken = '';
    let outsiderUser = null;
    let curriculumId = null;
    let adminRecordId = null;

    before(async () => {
        await sequelize.authenticate();
        await sequelize.sync();

        // Register a test teacher (owner)
        const ownerRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Owner',
                email: `owner_admin_test_${Date.now()}@test.com`,
                password: 'password123',
                role: 'instructor',
            });
        assert.ok(ownerRes.status === 201 || ownerRes.status === 200, 'Owner registration failed');
        ownerToken = ownerRes.body.data.token;
        ownerUser = ownerRes.body.data.user;

        // Register a test admin user
        const adminRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Admin',
                email: `admin_test_${Date.now()}@test.com`,
                password: 'password123',
                role: 'instructor',
            });
        assert.ok(adminRes.status === 201 || adminRes.status === 200, 'Admin registration failed');
        adminToken = adminRes.body.data.token;
        adminUser = adminRes.body.data.user;

        // Register a non-admin outsider
        const outsiderRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Outsider',
                email: `outsider_test_${Date.now()}@test.com`,
                password: 'password123',
                role: 'instructor',
            });
        assert.ok(outsiderRes.status === 201 || outsiderRes.status === 200, 'Outsider registration failed');
        outsiderToken = outsiderRes.body.data.token;
        outsiderUser = outsiderRes.body.data.user;

        // Create a test curriculum
        const currRes = await request(app)
            .post('/api/instructor/curricula')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                title: 'Test Admin Curriculum',
                description: 'For admin testing',
                subject: 'Math',
                category: 'Science',
                price: 100,
                is_free_lesson: false,
            });
        assert.ok(currRes.status === 201, 'Curriculum creation failed');
        curriculumId = currRes.body.data.id;
    });

    after(async () => {
        // Cleanup
        if (curriculumId) {
            await AdminActivityLog.destroy({ where: { curriculum_id: curriculumId } });
            await CurriculumAdmin.destroy({ where: { curriculum_id: curriculumId } });
            await Curriculum.destroy({ where: { id: curriculumId } });
        }
        if (ownerUser) await User.destroy({ where: { id: ownerUser.id } });
        if (adminUser) await User.destroy({ where: { id: adminUser.id } });
        if (outsiderUser) await User.destroy({ where: { id: outsiderUser.id } });
        await sequelize.close();
    });

    // ─── Owner can add an admin ─────────────────
    test('Owner can add an admin by email', async () => {
        const res = await request(app)
            .post(`/api/instructor/curricula/${curriculumId}/admins`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                email: adminUser.email,
                permissions: ['create_lessons', 'edit_lessons', 'view_students'],
            });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.status, 'pending');
        adminRecordId = res.body.data.id;
    });

    // ─── Non-owner cannot add admins ────────────
    test('Non-owner cannot add admins', async () => {
        const res = await request(app)
            .post(`/api/instructor/curricula/${curriculumId}/admins`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: outsiderUser.email,
                permissions: ['view_students'],
            });

        assert.strictEqual(res.status, 403);
    });

    // ─── Admin can accept invite ────────────────
    test('Admin can accept invite', async () => {
        const res = await request(app)
            .post(`/api/instructor/admin-invites/${curriculumId}/accept`)
            .set('Authorization', `Bearer ${adminToken}`);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
    });

    // ─── Admin with create_lessons can create a section ─────
    test('Admin with create_lessons can create a section', async () => {
        const res = await request(app)
            .post(`/api/instructor/curricula/${curriculumId}/sections`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Admin Created Section' });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
    });

    // ─── Admin without delete_lessons is denied section delete ─
    test('Admin without delete_lessons cannot delete a section', async () => {
        // First, find the section we just created
        const detailRes = await request(app)
            .get(`/api/instructor/curricula/${curriculumId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        const sections = detailRes.body.data.sections || [];
        const sectionId = sections[0]?.id;
        assert.ok(sectionId, 'Section should exist');

        const res = await request(app)
            .delete(`/api/instructor/curricula/${curriculumId}/sections/${sectionId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        assert.strictEqual(res.status, 403);
    });

    // ─── Outsider (non-admin) cannot access curriculum ────
    test('Non-admin user cannot access curriculum details', async () => {
        const res = await request(app)
            .get(`/api/instructor/curricula/${curriculumId}`)
            .set('Authorization', `Bearer ${outsiderToken}`);

        assert.strictEqual(res.status, 403);
    });

    // ─── Owner can update admin permissions ────
    test('Owner can update admin permissions', async () => {
        const res = await request(app)
            .put(`/api/instructor/curricula/${curriculumId}/admins/${adminRecordId}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                permissions: ['create_lessons', 'edit_lessons', 'delete_lessons', 'view_students'],
            });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
    });

    // ─── Admin with delete_lessons can now delete ──
    test('Admin with updated permissions can delete a section', async () => {
        const detailRes = await request(app)
            .get(`/api/instructor/curricula/${curriculumId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        const sections = detailRes.body.data.sections || [];
        const sectionId = sections[0]?.id;
        assert.ok(sectionId, 'Section should exist');

        const res = await request(app)
            .delete(`/api/instructor/curricula/${curriculumId}/sections/${sectionId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        assert.strictEqual(res.status, 200);
    });

    // ─── Activity log has entries ──────────────
    test('Activity log records admin actions', async () => {
        const res = await request(app)
            .get(`/api/instructor/curricula/${curriculumId}/admins/activity-log`)
            .set('Authorization', `Bearer ${ownerToken}`);

        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.length > 0, 'Activity log should have entries');
    });

    // ─── Owner can remove admin ────────────────
    test('Owner can remove admin', async () => {
        const res = await request(app)
            .delete(`/api/instructor/curricula/${curriculumId}/admins/${adminRecordId}`)
            .set('Authorization', `Bearer ${ownerToken}`);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
    });

    // ─── Removed admin loses access ────────────
    test('Removed admin can no longer access curriculum', async () => {
        const res = await request(app)
            .get(`/api/instructor/curricula/${curriculumId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        assert.strictEqual(res.status, 403);
    });
});
