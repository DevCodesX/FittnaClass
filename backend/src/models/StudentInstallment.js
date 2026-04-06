const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentInstallment = sequelize.define('StudentInstallment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    enrollment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'enrollments',
            key: 'id',
        },
    },
    installment_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1-based installment number',
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
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
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'student_installments',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['enrollment_id', 'installment_number'],
            name: 'unique_enrollment_installment',
        },
    ],
});

module.exports = StudentInstallment;
