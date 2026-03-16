const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentMethod = sequelize.define('PaymentMethod', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    provider: {
        type: DataTypes.ENUM('vodafone_cash', 'instapay', 'fawry', 'other'),
        allowNull: false,
    },
    wallet_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'payment_methods',
    timestamps: true,
});

module.exports = PaymentMethod;
