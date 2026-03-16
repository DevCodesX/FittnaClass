const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User, InstructorProfile } = require('../models');
const { encrypt } = require('../utils/encryption');
const env = require('../config/env');

/**
 * POST /api/auth/register
 * Register a new user with role selection.
 */
async function register(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const { name, email, password, role, national_id, grade_level } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.',
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Encrypt national ID for students
        const encryptedNationalId = role === 'student' && national_id
            ? encrypt(national_id)
            : null;

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            national_id: encryptedNationalId,
            grade_level: role === 'student' ? grade_level : null,
            role,
        });

        // Auto-create instructor profile if role is instructor
        if (role === 'instructor') {
            await InstructorProfile.create({
                user_id: user.id,
                specialization: req.body.specialization || null,
                subject: req.body.subject || null,
                bio: req.body.bio || null,
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            env.jwt.secret,
            { expiresIn: env.jwt.expiresIn }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT.
 */
async function login(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            env.jwt.secret,
            { expiresIn: env.jwt.expiresIn }
        );

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { register, login };
