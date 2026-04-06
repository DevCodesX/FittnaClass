const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserStats = sequelize.define('UserStats', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
    },
    total_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    current_streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Current consecutive days of studying',
    },
    longest_streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    last_active_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Last date the user completed a task',
    },
}, {
    tableName: 'user_stats',
    timestamps: true,
});

module.exports = UserStats;
