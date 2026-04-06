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
    national_id_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
    },
    birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    governorate: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    risk_level: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: true,
    },
    grade_level: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Students only',
    },
    education_type: {
        type: DataTypes.ENUM('عام', 'أزهر'),
        allowNull: true,
        comment: 'Leaderboard filtering',
    },
    stage: {
        type: DataTypes.ENUM('ابتدائي', 'اعدادي', 'ثانوي'),
        allowNull: true,
        comment: 'Leaderboard filtering',
    },
    track: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Leaderboard filtering e.g. علمي/أدبي',
    },
    role: {
        type: DataTypes.ENUM('instructor', 'student', 'assistant'),
        allowNull: false,
    },
    avatar_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    reset_otp: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hashed OTP for password reset',
    },
    reset_otp_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_otp_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    referral_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
    },
    referred_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
}, {
    tableName: 'users',
    timestamps: true,
});

module.exports = User;
