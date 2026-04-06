const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CurriculumAdmin = sequelize.define('CurriculumAdmin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    curriculum_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'curricula',
            key: 'id',
        },
    },
    permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of permission strings, e.g. ["view_payments","create_lessons"]',
    },
    status: {
        type: DataTypes.ENUM('active', 'pending', 'removed'),
        allowNull: false,
        defaultValue: 'pending',
    },
}, {
    tableName: 'course_admins',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'curriculum_id'],
            name: 'unique_user_curriculum_admin',
        },
    ],
});

module.exports = CurriculumAdmin;
