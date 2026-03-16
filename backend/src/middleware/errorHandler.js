const env = require('../config/env');

/**
 * Global error handler middleware.
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err.message);

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum allowed size exceeded.',
        });
    }

    // Multer file type error
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    // Sequelize validation error
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        const messages = err.errors ? err.errors.map((e) => e.message) : [err.message];
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: messages,
        });
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: env.nodeEnv === 'development' ? err.message : 'Internal server error',
        ...(env.nodeEnv === 'development' && { stack: err.stack }),
    });
}

module.exports = { errorHandler };
