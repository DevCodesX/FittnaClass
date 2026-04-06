const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique machine key e.g. first_10_lessons',
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'emoji_events',
    },
    condition_type: {
        type: DataTypes.ENUM('tasks_completed', 'streak_days', 'points_earned', 'reviews_completed', 'level_reached'),
        allowNull: false,
    },
    condition_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Threshold to unlock, e.g. 10 for first_10_lessons',
    },
    points_reward: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Bonus points when unlocked',
    },
}, {
    tableName: 'achievements',
    timestamps: false,
});

module.exports = Achievement;
