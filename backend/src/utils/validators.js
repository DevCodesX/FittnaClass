const { body } = require('express-validator');
const { validateCoursePricing } = require('./freeLessonValidation');

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
        .isIn(['instructor', 'student', 'assistant']).withMessage('Role must be instructor, student, or assistant'),

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

const curriculumValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Curriculum title is required')
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

    body('grade_level')
        .optional()
        .trim(),

    body('is_free_lesson')
        .optional()
        .isBoolean().withMessage('is_free_lesson must be true or false')
        .toBoolean(),

    body('price')
        .custom((value, { req }) => {
            const isFreeLesson = req.body.is_free_lesson === true || req.body.is_free_lesson === 'true';
            const result = validateCoursePricing({ price: value, isFreeLesson });
            if (!result.valid) {
                throw new Error(result.message);
            }
            return true;
        }),
];

const paymentSettingsValidation = [
    body('provider')
        .exists({ checkNull: true, checkFalsy: true }).withMessage('Payment provider is missing or empty')
        .isString().withMessage('Payment provider must be a string')
        .isIn(['vodafone_cash', 'instapay', 'fawry', 'other']).withMessage('Invalid payment provider'),

    body('wallet_number')
        .exists({ checkNull: true, checkFalsy: true }).withMessage('Wallet number is missing or empty')
        .isString().withMessage('Wallet number must be a string')
        .isLength({ min: 1, max: 50 }).withMessage('Wallet number must be between 1 and 50 characters'),

    body('details')
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage('Details must be a string')
        .trim(),
];

module.exports = {
    registerValidation,
    loginValidation,
    curriculumValidation,
    paymentSettingsValidation,
};
