const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Curriculum = sequelize.define('Curriculum', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    course_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
        comment: 'Unique code in FT-XXXX format',
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    subject: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    education_type: {
        type: DataTypes.ENUM('عام', 'أزهر'),
        allowNull: true,
        comment: 'Education Type e.g. عام أو أزهر',
    },
    stage: {
        type: DataTypes.ENUM('ابتدائي', 'اعدادي', 'ثانوي'),
        allowNull: true,
        comment: 'Educational stage',
    },
    grade_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Grade level e.g. الصف الثالث الثانوي',
    },
    thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Path to the curriculum thumbnail image',
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    is_free_lesson: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    status: {
        type: DataTypes.ENUM('draft', 'in_review', 'scheduled', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
    },
    published_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the curriculum was published',
    },
    scheduled_publish_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the curriculum is scheduled to be published',
    },
}, {
    tableName: 'curricula',
    timestamps: true,
});

module.exports = Curriculum;
