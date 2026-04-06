const sequelize = require('../config/database');
const User = require('./User');
const InstructorProfile = require('./InstructorProfile');
const PaymentMethod = require('./PaymentMethod');
const Curriculum = require('./Curriculum');
const Section = require('./Section');
const Lesson = require('./Lesson');
const Enrollment = require('./Enrollment');
const Coupon = require('./Coupon');
const InstallmentPlan = require('./InstallmentPlan');
const StudentInstallment = require('./StudentInstallment');
const CurriculumAdmin = require('./CurriculumAdmin');
const AdminActivityLog = require('./AdminActivityLog');
const AdminInvite = require('./AdminInvite');
const Notification = require('./Notification');
const LiveSession = require('./LiveSession');
const StudyPlan = require('./StudyPlan');
const StudyTask = require('./StudyTask');
const SpacedRepetition = require('./SpacedRepetition');
const UserStats = require('./UserStats');
const ActivityLog = require('./ActivityLog');
const Achievement = require('./Achievement');
const UserAchievement = require('./UserAchievement');
const LeaderboardScore = require('./LeaderboardScore');
const Event = require('./Event');

// ─── Associations ──────────────────────────────────────────────

// User <-> InstructorProfile (1:1)
User.hasOne(InstructorProfile, { foreignKey: 'user_id', as: 'instructorProfile' });
InstructorProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User (Instructor) <-> PaymentMethod (1:Many)
User.hasMany(PaymentMethod, { foreignKey: 'instructor_id', as: 'paymentMethods' });
PaymentMethod.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// User (Instructor) <-> Curriculum (1:Many)
User.hasMany(Curriculum, { foreignKey: 'instructor_id', as: 'curricula' });
Curriculum.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// Curriculum <-> Section (1:Many)
Curriculum.hasMany(Section, { foreignKey: 'curriculum_id', as: 'sections' });
Section.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// Section self-referencing (nested sections)
Section.hasMany(Section, { foreignKey: 'parent_id', as: 'children' });
Section.belongsTo(Section, { foreignKey: 'parent_id', as: 'parent' });

// Section <-> Lesson (1:Many)
Section.hasMany(Lesson, { foreignKey: 'section_id', as: 'lessons' });
Lesson.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });

// User (Student) <-> Enrollment (1:Many)
User.hasMany(Enrollment, { foreignKey: 'student_id', as: 'enrollments' });
Enrollment.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// Curriculum <-> Enrollment (1:Many)
Curriculum.hasMany(Enrollment, { foreignKey: 'curriculum_id', as: 'enrollments' });
Enrollment.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// User <-> CurriculumAdmin (1:Many)
User.hasMany(CurriculumAdmin, { foreignKey: 'user_id', as: 'adminRoles' });
CurriculumAdmin.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Curriculum <-> CurriculumAdmin (1:Many)
Curriculum.hasMany(CurriculumAdmin, { foreignKey: 'curriculum_id', as: 'admins' });
CurriculumAdmin.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// Curriculum <-> AdminActivityLog (1:Many)
Curriculum.hasMany(AdminActivityLog, { foreignKey: 'curriculum_id', as: 'activityLogs' });
AdminActivityLog.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// User <-> AdminActivityLog (1:Many)
User.hasMany(AdminActivityLog, { foreignKey: 'user_id', as: 'activityLogs' });
AdminActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Curriculum <-> AdminInvite (1:Many)
Curriculum.hasMany(AdminInvite, { foreignKey: 'curriculum_id', as: 'invites' });
AdminInvite.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// User (inviter) <-> AdminInvite (1:Many)
User.hasMany(AdminInvite, { foreignKey: 'invited_by', as: 'sentInvites' });
AdminInvite.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

// User <-> Notification (1:Many)
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Curriculum <-> LiveSession (1:Many)
Curriculum.hasMany(LiveSession, { foreignKey: 'curriculum_id', as: 'liveSessions' });
LiveSession.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// User (Teacher) <-> LiveSession (1:Many)
User.hasMany(LiveSession, { foreignKey: 'teacher_id', as: 'liveSessions' });
LiveSession.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });

// User <-> StudyPlan (1:Many)
User.hasMany(StudyPlan, { foreignKey: 'user_id', as: 'studyPlans' });
StudyPlan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// StudyPlan <-> StudyTask (1:Many)
StudyPlan.hasMany(StudyTask, { foreignKey: 'plan_id', as: 'tasks' });
StudyTask.belongsTo(StudyPlan, { foreignKey: 'plan_id', as: 'plan' });

// Lesson <-> StudyTask (1:Many)
Lesson.hasMany(StudyTask, { foreignKey: 'lesson_id', as: 'studyTasks' });
StudyTask.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });

// User <-> SpacedRepetition (1:Many)
User.hasMany(SpacedRepetition, { foreignKey: 'user_id', as: 'spacedRepetitions' });
SpacedRepetition.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Lesson <-> SpacedRepetition (1:Many)
Lesson.hasMany(SpacedRepetition, { foreignKey: 'lesson_id', as: 'spacedRepetitions' });
SpacedRepetition.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });

// User (Teacher) <-> Coupon (1:Many)
User.hasMany(Coupon, { foreignKey: 'teacher_id', as: 'coupons' });
Coupon.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });

// Curriculum <-> Coupon (1:Many)
Curriculum.hasMany(Coupon, { foreignKey: 'curriculum_id', as: 'coupons' });
Coupon.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// Coupon <-> Enrollment (1:Many)
Coupon.hasMany(Enrollment, { foreignKey: 'coupon_id', as: 'enrollments' });
Enrollment.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });

// Curriculum <-> InstallmentPlan (1:1)
Curriculum.hasOne(InstallmentPlan, { foreignKey: 'curriculum_id', as: 'installmentPlan' });
InstallmentPlan.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// Enrollment <-> StudentInstallment (1:Many)
Enrollment.hasMany(StudentInstallment, { foreignKey: 'enrollment_id', as: 'installments' });
StudentInstallment.belongsTo(Enrollment, { foreignKey: 'enrollment_id', as: 'enrollment' });

// User <-> UserStats (1:1)
User.hasOne(UserStats, { foreignKey: 'user_id', as: 'stats' });
UserStats.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> ActivityLog (1:Many)
User.hasMany(ActivityLog, { foreignKey: 'user_id', as: 'activityLogs_gamification' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> UserAchievement (1:Many)
User.hasMany(UserAchievement, { foreignKey: 'user_id', as: 'userAchievements' });
UserAchievement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Achievement <-> UserAchievement (1:Many)
Achievement.hasMany(UserAchievement, { foreignKey: 'achievement_id', as: 'userAchievements' });
UserAchievement.belongsTo(Achievement, { foreignKey: 'achievement_id', as: 'achievement' });

// User <-> LeaderboardScore (1:1)
User.hasOne(LeaderboardScore, { foreignKey: 'user_id', as: 'leaderboardScore' });
LeaderboardScore.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User (Teacher) <-> Event (1:Many)
User.hasMany(Event, { foreignKey: 'teacher_id', as: 'events' });
Event.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });

// Curriculum <-> Event (1:Many)
Curriculum.hasMany(Event, { foreignKey: 'curriculum_id', as: 'events' });
Event.belongsTo(Curriculum, { foreignKey: 'curriculum_id', as: 'curriculum' });

// Event <-> StudyTask (1:Many)
Event.hasMany(StudyTask, { foreignKey: 'event_id', as: 'tasks' });
StudyTask.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// ─── Export ────────────────────────────────────────────────────

module.exports = {
    sequelize,
    User,
    InstructorProfile,
    PaymentMethod,
    Curriculum,
    Section,
    Lesson,
    Enrollment,
    CurriculumAdmin,
    AdminActivityLog,
    AdminInvite,
    Notification,
    LiveSession,
    Coupon,
    InstallmentPlan,
    StudentInstallment,
    StudyPlan,
    StudyTask,
    SpacedRepetition,
    UserStats,
    ActivityLog,
    Achievement,
    UserAchievement,
    LeaderboardScore,
    Event,
};
