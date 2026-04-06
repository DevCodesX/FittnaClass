const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InstallmentPlan = sequelize.define('InstallmentPlan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    curriculum_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'curricula',
            key: 'id',
        },
    },
    installment_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        comment: 'Number of installments (e.g. 2, 3, 4)',
    },
    unlock_per_installment: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Percentage of content unlocked per paid installment',
    },
}, {
    tableName: 'installment_plans',
    timestamps: true,
});

module.exports = InstallmentPlan;
