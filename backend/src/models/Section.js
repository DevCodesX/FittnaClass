const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Section = sequelize.define('Section', {
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
    parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'sections',
            key: 'id',
        },
        comment: 'Self-referencing FK for nested sections',
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'sections',
    timestamps: true,
});

module.exports = Section;
