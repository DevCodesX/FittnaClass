const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminActivityLog = sequelize.define('AdminActivityLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    curriculum_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'curricula',
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        comment: 'The user who performed the action',
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Action performed, e.g. approve_payment, create_lesson',
    },
    details: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Optional context or metadata about the action',
    },
}, {
    tableName: 'admin_activity_logs',
    timestamps: true,
    updatedAt: false, // Logs are immutable
});

module.exports = AdminActivityLog;
