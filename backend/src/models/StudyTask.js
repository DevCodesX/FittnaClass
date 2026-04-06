const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudyTask = sequelize.define('StudyTask', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'study_plans',
            key: 'id',
        },
    },
    type: {
        type: DataTypes.ENUM('lesson', 'custom', 'timer', 'review', 'event'),
        allowNull: false,
        defaultValue: 'custom',
    },
    lesson_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'lessons',
            key: 'id',
        },
    },
    event_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'events',
            key: 'id',
        },
        comment: 'Reference to teacher-created event (auto-synced)',
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Block title — auto-filled from lesson or entered by student',
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Extra data: { duration, course_name, srs_id, ... }',
    },
}, {
    tableName: 'study_tasks',
    timestamps: true,
});

module.exports = StudyTask;
