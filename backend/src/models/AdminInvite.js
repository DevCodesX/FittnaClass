const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const AdminInvite = sequelize.define('AdminInvite', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
    },
    curriculum_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'expired', 'cancelled'),
        defaultValue: 'pending',
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    invited_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'admin_invites',
    timestamps: true,
    updatedAt: false,
});

/**
 * Generate a cryptographically secure invite token.
 */
AdminInvite.generateToken = function () {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Check if this invite is expired.
 */
AdminInvite.prototype.isExpired = function () {
    return new Date() > new Date(this.expires_at);
};

module.exports = AdminInvite;
