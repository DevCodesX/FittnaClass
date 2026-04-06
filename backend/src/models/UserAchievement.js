const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAchievement = sequelize.define('UserAchievement', {
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
    achievement_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'achievements', key: 'id' },
    },
    unlocked_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'user_achievements',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['user_id', 'achievement_id'], name: 'unique_user_achievement' },
    ],
});

module.exports = UserAchievement;
