const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SpacedRepetition = sequelize.define('SpacedRepetition', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    lesson_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'lessons', key: 'id' },
    },
    ease_factor: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 2.5,
        comment: 'SM-2 ease factor, starts at 2.5',
    },
    interval: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Current interval in days',
    },
    repetition_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    next_review_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Next scheduled review date (YYYY-MM-DD)',
    },
    last_reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'spaced_repetitions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'lesson_id'],
            name: 'unique_user_lesson_srs',
        },
        {
            fields: ['user_id', 'next_review_date'],
            name: 'idx_srs_user_next_review',
        },
    ],
});

module.exports = SpacedRepetition;
