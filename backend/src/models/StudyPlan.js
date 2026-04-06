const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudyPlan = sequelize.define('StudyPlan', {
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Plan date in YYYY-MM-DD format',
    },
}, {
    tableName: 'study_plans',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'date'],
            name: 'unique_user_date_plan',
        },
    ],
});

module.exports = StudyPlan;
