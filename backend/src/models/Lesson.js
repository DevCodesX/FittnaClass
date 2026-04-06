const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lesson = sequelize.define('Lesson', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sections',
            key: 'id',
        },
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    video_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    type: {
        type: DataTypes.ENUM('video', 'live'),
        allowNull: false,
        defaultValue: 'video',
    },
    duration: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Duration string e.g. 08:45',
    },
    quality: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'HD 1080p',
    },
    file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Original file size in bytes',
    },
    original_filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'lessons',
    timestamps: true,
});

module.exports = Lesson;
