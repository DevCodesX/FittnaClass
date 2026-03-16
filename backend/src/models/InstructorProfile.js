const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InstructorProfile = sequelize.define('InstructorProfile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    specialization: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    subject: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'instructor_profiles',
    timestamps: true,
});

module.exports = InstructorProfile;
