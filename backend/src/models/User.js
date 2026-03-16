const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            len: [2, 100],
        },
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    national_id: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'AES-256 encrypted, students only',
    },
    grade_level: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Students only',
    },
    role: {
        type: DataTypes.ENUM('instructor', 'student'),
        allowNull: false,
    },
}, {
    tableName: 'users',
    timestamps: true,
});

module.exports = User;
