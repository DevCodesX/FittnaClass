const sequelize = require('../config/database');
const User = require('./User');
const InstructorProfile = require('./InstructorProfile');
const PaymentMethod = require('./PaymentMethod');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const Content = require('./Content');

// ─── Associations ──────────────────────────────────────────────

// User <-> InstructorProfile (1:1)
User.hasOne(InstructorProfile, { foreignKey: 'user_id', as: 'instructorProfile' });
InstructorProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User (Instructor) <-> PaymentMethod (1:Many)
User.hasMany(PaymentMethod, { foreignKey: 'instructor_id', as: 'paymentMethods' });
PaymentMethod.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// User (Instructor) <-> Course (1:Many)
User.hasMany(Course, { foreignKey: 'instructor_id', as: 'courses' });
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// User (Student) <-> Enrollment (1:Many)
User.hasMany(Enrollment, { foreignKey: 'student_id', as: 'enrollments' });
Enrollment.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// Course <-> Enrollment (1:Many)
Course.hasMany(Enrollment, { foreignKey: 'course_id', as: 'enrollments' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// Course <-> Content (1:Many)
Course.hasMany(Content, { foreignKey: 'course_id', as: 'contents' });
Content.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// ─── Export ────────────────────────────────────────────────────

module.exports = {
    sequelize,
    User,
    InstructorProfile,
    PaymentMethod,
    Course,
    Enrollment,
    Content,
};
