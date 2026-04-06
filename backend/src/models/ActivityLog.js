const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    tasks_completed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    study_time: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total study time in minutes for the day',
    },
    points_earned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'activity_logs',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['user_id', 'date'], name: 'unique_user_date_activity' },
        { fields: ['user_id', 'date'], name: 'idx_activity_user_date' },
    ],
});

module.exports = ActivityLog;
