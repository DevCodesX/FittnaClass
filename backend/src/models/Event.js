const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    teacher_id: {
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
    type: {
        type: DataTypes.ENUM('live', 'exam'),
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    meeting_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Join link for live sessions (Zoom, Google Meet, etc.)',
    },
    reminded: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether reminder notification has been sent',
    },
}, {
    tableName: 'events',
    timestamps: true,
});

module.exports = Event;
