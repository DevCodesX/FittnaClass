const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enrollment = sequelize.define('Enrollment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    student_id: {
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
    payment_receipt_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    },
    is_suspended: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    receipt_uploaded_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    enrollment_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    coupon_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'coupons',
            key: 'id',
        },
    },
    discount_applied: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    final_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    payment_type: {
        type: DataTypes.ENUM('full', 'installment'),
        allowNull: false,
        defaultValue: 'full',
    },
}, {
    tableName: 'enrollments',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['student_id', 'curriculum_id'],
            name: 'unique_student_curriculum',
        },
    ],
});

module.exports = Enrollment;
