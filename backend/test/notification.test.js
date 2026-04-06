const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { sequelize, User, Curriculum, Enrollment, NotificationAdmin, Notification } = require('../src/models');
const NotificationService = require('../src/services/NotificationService');

describe('Notification System Tests', () => {
    let instructor, student, assistant, curriculum;

    before(async () => {
        await sequelize.sync({ force: true });

        instructor = await User.create({ name: 'Teacher', email: 't@test.com', password: 'pass', role: 'instructor' });
        student = await User.create({ name: 'Student', email: 's@test.com', password: 'pass', role: 'student' });
        assistant = await User.create({ name: 'Assistant', email: 'a@test.com', password: 'pass', role: 'assistant' });

        curriculum = await Curriculum.create({
            title: 'Test Course',
            course_code: 'TEST-123',
            price: 100,
            instructor_id: instructor.id,
            status: 'published'
        });
    });

    after(async () => {
        await sequelize.close();
    });

    it('Should notify instructor on enrollment request', async () => {
        await NotificationService.notifyForEvent('student_requested_enrollment', {
            student_id: student.id,
            curriculum_id: curriculum.id,
            curriculum_title: curriculum.title
        });

        const notifs = await Notification.findAll({ where: { user_id: instructor.id } });
        assert.strictEqual(notifs.length, 1);
        assert.strictEqual(notifs[0].type, 'student_requested_enrollment');
    });

    it('Should notify student on enrollment approval', async () => {
        await NotificationService.notifyForEvent('enrollment_approved', {
            student_id: student.id,
            curriculum_id: curriculum.id,
            curriculum_title: curriculum.title
        });

        const notifs = await Notification.findAll({ where: { user_id: student.id } });
        assert.strictEqual(notifs.length, 1);
        assert.strictEqual(notifs[0].type, 'enrollment_approved');
    });
});
