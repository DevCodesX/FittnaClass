const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { User, InstructorProfile, AdminInvite, CurriculumAdmin, AdminActivityLog } = require('../models');
const { encrypt } = require('../utils/encryption');
const env = require('../config/env');
const { sendOTP } = require('../services/emailService');
const { validateAndExtractNationalId } = require('../utils/nationalId.util');
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

        const { name, email, password, role: requestedRole, national_id, grade_level, referred_by_code } = req.body;

        // Check if there are pending invites for this email — if so, force assistant role
        const hasPendingInvite = await AdminInvite.findOne({
            where: { email: email.toLowerCase(), status: 'pending' },
        });
        const role = hasPendingInvite ? 'assistant' : requestedRole;

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

        let nationalIdHash = null;
        let birthDate = null;
        let age = null;
        let governorate = null;
        let riskLevel = null;

        if (role === 'student' && national_id) {
            const validation = validateAndExtractNationalId(national_id);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: validation.errorMessage,
                });
            }
            
            // Check for duplicate national ID
            nationalIdHash = crypto.createHash('sha256').update(national_id.toString()).digest('hex');
            const duplicateUser = await User.findOne({ where: { national_id_hash: nationalIdHash } });
            if (duplicateUser) {
                return res.status(409).json({
                    success: false,
                    message: 'تم تسجيل هذا الرقم القومي مسبقاً',
                });
            }

            birthDate = validation.data.birthDate;
            age = validation.data.age;
            governorate = validation.data.governorate;
            riskLevel = validation.data.riskLevel;
        }

        let referredByUserId = null;
        if (referred_by_code) {
            const referrer = await User.findOne({ where: { referral_code: referred_by_code.trim().toUpperCase() } });
            if (referrer) {
                referredByUserId = referrer.id;
            }
        }

        let newReferralCode = null;
        if (role === 'student' || role === 'instructor') {
            let isUnique = false;
            while (!isUnique) {
                newReferralCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                const existing = await User.findOne({ where: { referral_code: newReferralCode } });
                if (!existing) isUnique = true;
            }
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            national_id_hash: nationalIdHash,
            birth_date: birthDate,
            age: age,
            governorate: governorate,
            risk_level: riskLevel,
            grade_level: role === 'student' ? grade_level : null,
            role,
            referral_code: newReferralCode,
            referred_by_user_id: referredByUserId,
        });

        // Auto-create instructor profile if role is instructor or assistant
        if (role === 'instructor' || role === 'assistant') {
            await InstructorProfile.create({
                user_id: user.id,
                specialization: req.body.specialization || (role === 'assistant' ? 'مشرف' : null),
                subject: req.body.subject || (role === 'assistant' ? 'إدارة' : null),
                bio: req.body.bio || null,
            });
        }

        // ─── Auto-attach pending admin invites ─────────────────
        let attachedInvites = 0;
        try {
            const pendingInvites = await AdminInvite.findAll({
                where: { email: email.toLowerCase(), status: 'pending' },
            });

            for (const invite of pendingInvites) {
                if (!invite.isExpired()) {
                    await CurriculumAdmin.create({
                        user_id: user.id,
                        curriculum_id: invite.curriculum_id,
                        permissions: invite.permissions,
                        status: 'active',
                    });
                    await invite.update({ status: 'accepted' });
                    await AdminActivityLog.create({
                        curriculum_id: invite.curriculum_id,
                        user_id: user.id,
                        action: 'accept_invite',
                        details: { via: 'auto_attach_on_signup', invite_id: invite.id },
                    });
                    attachedInvites++;
                } else {
                    await invite.update({ status: 'expired' });
                }
            }
        } catch (inviteErr) {
            // Don't fail registration if invite processing fails
            console.error('[Auto-attach invites error]', inviteErr.message);
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
                attachedInvites,
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
/**
 * GET /api/auth/me/permissions
 * Return all admin records (with curriculum info) for the current user.
 */
async function getMyPermissions(req, res, next) {
    try {
        const { Op } = require('sequelize');
        const { Curriculum } = require('../models');

        const adminRecords = await CurriculumAdmin.findAll({
            where: {
                user_id: req.user.id,
                status: { [Op.in]: ['active', 'pending'] },
            },
            include: [{
                model: Curriculum,
                as: 'curriculum',
                attributes: ['id', 'title', 'course_code', 'subject'],
            }],
            order: [['createdAt', 'DESC']],
        });

        res.json({
            success: true,
            data: {
                role: req.user.role,
                adminRecords: adminRecords.map((r) => ({
                    curriculumId: r.curriculum_id,
                    curriculum: r.curriculum,
                    permissions: r.permissions || [],
                    status: r.status,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/auth/profile
 * Update user profile (name, password, avatar).
 */
async function updateProfile(req, res, next) {
    try {
        const { name, password, currentPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, message: 'كلمة المرور الحالية مطلوبة لتغيير كلمة المرور.' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة.' });
            }
            user.password = await bcrypt.hash(password, 12);
        }

        if (name) {
            user.name = name;
        }

        if (req.file) {
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            user.avatar_url = avatarUrl;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar_url: user.avatar_url,
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/forgot-password
 * Send OTP to user email using Brevo.
 */
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Do not reveal if email exists or not
            return res.json({ success: true, message: 'إذا كان البريد مسجلاً، فقد تم إرسال رمز التحقق.' });
        }

        // Rate limit: Check if OTP was sent recently (60 seconds)
        if (user.last_otp_sent_at) {
            const now = new Date();
            const timeSinceLastOtp = (now.getTime() - user.last_otp_sent_at.getTime()) / 1000;
            if (timeSinceLastOtp < 60) {
                return res.status(429).json({ success: false, message: 'الرجاء الانتظار دقيقة قبل طلب رمز جديد.' });
            }
        }

        // Output previous otp sent at to rollback if sending email fails
        const previousLastOtpSentAt = user.last_otp_sent_at;

        // Generate 6 digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = await bcrypt.hash(otp, 12);

        user.reset_otp = hashedOtp;
        user.reset_otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        user.last_otp_sent_at = new Date();
        await user.save();

        // Send OTP using Brevo
        const sent = await sendOTP(email, otp);
        if (!sent) {
            // Revert rate limit lock out since email wasn't sent
            user.last_otp_sent_at = previousLastOtpSentAt;
            await user.save();
            return res.status(500).json({ success: false, message: 'فشل في إرسال رمز التحقق. الرجاء المحاولة لاحقاً.' });
        }

        res.json({ success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/verify-otp
 * Verify the OTP sent to user email.
 */
async function verifyOTP(req, res, next) {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني ورمز التحقق مطلوبان.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user || !user.reset_otp || !user.reset_otp_expires_at) {
            return res.status(400).json({ success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية.' });
        }

        if (new Date() > user.reset_otp_expires_at) {
            return res.status(400).json({ success: false, message: 'رمز التحقق منتهي الصلاحية.' });
        }

        const isMatch = await bcrypt.compare(otp.toString(), user.reset_otp);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح.' });
        }

        // Generate temporary reset token (valid for 15 minutes)
        const resetToken = jwt.sign(
            { id: user.id, resetAllowed: true },
            env.jwt.secret,
            { expiresIn: '15m' }
        );

        res.json({ success: true, message: 'تم التحقق بنجاح.', token: resetToken });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/reset-password
 * Reset password using the temporary reset token.
 */
async function resetPassword(req, res, next) {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'الرمز وكلمة المرور الجديدة مطلوبان.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, env.jwt.secret);
            if (!decoded.resetAllowed) {
                throw new Error('Invalid token type');
            }
        } catch (error) {
            return res.status(401).json({ success: false, message: 'الرمز غير صالح أو منتهي الصلاحية.' });
        }

        // Ensure new password isn't empty or null
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
        }

        // Reset password
        user.password = await bcrypt.hash(newPassword, 12);
        
        // Clear OTP fields
        user.reset_otp = null;
        user.reset_otp_expires_at = null;
        
        await user.save();

        res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح.' });
    } catch (error) {
        next(error);
    }
}

module.exports = { register, login, getMyPermissions, updateProfile, forgotPassword, verifyOTP, resetPassword };
