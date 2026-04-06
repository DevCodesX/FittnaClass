const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaderboardScore = sequelize.define('LeaderboardScore', {
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
    weekly_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    tasks_completed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    reviews_completed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'leaderboard_scores',
    timestamps: true,
    indexes: [
        // Indexes to optimize leaderboard sorting
        { fields: ['weekly_points', 'tasks_completed'] },
        { fields: ['total_points', 'tasks_completed'] },
    ],
});

module.exports = LeaderboardScore;
