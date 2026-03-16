const { body } = require('express-validator');

const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    body('role')
        .notEmpty().withMessage('Role is required')
        .isIn(['instructor', 'student']).withMessage('Role must be instructor or student'),

    body('national_id')
        .if(body('role').equals('student'))
        .notEmpty().withMessage('National ID is required for students')
        .isLength({ min: 14, max: 14 }).withMessage('National ID must be 14 digits'),

    body('grade_level')
        .if(body('role').equals('student'))
        .notEmpty().withMessage('Grade level is required for students'),
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

const courseValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Course title is required')
        .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),

    body('description')
        .optional()
        .trim(),

    body('subject')
        .trim()
        .notEmpty().withMessage('Subject is required'),

    body('category')
        .optional()
        .trim(),

    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

const paymentSettingsValidation = [
    body('provider')
        .notEmpty().withMessage('Payment provider is required')
        .isIn(['vodafone_cash', 'instapay', 'fawry', 'other']).withMessage('Invalid payment provider'),

    body('wallet_number')
        .notEmpty().withMessage('Wallet number is required')
        .isLength({ max: 50 }).withMessage('Wallet number must not exceed 50 characters'),

    body('details')
        .optional()
        .trim(),
];

module.exports = {
    registerValidation,
    loginValidation,
    courseValidation,
    paymentSettingsValidation,
};
