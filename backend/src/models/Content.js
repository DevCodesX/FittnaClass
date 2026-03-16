const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Content = sequelize.define('Content', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id',
        },
    },
    video_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
    tableName: 'contents',
    timestamps: true,
});

module.exports = Content;
