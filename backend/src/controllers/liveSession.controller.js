const { LiveSession, Curriculum, User, Enrollment, Notification } = require('../models');

// Start a new Live Session
exports.startLiveSession = async (req, res, next) => {
    try {
        const curriculumId = req.params.id;
        const { title, description } = req.body;
        const teacherId = req.user.id;

        // Check if there's already an active session for this curriculum
        const existingSession = await LiveSession.findOne({
            where: { curriculum_id: curriculumId, status: 'live' }
        });

        if (existingSession) {
            return res.status(400).json({
                success: false,
                message: 'A live session is already active for this curriculum.',
            });
        }

        const newSession = await LiveSession.create({
            curriculum_id: curriculumId,
            teacher_id: teacherId,
            title,
            description,
            status: 'live',
            started_at: new Date()
        });

        // Notify enrolled students
        const curriculum = await Curriculum.findByPk(curriculumId);
        const enrollments = await Enrollment.findAll({
            where: { curriculum_id: curriculumId, status: 'approved' }
        });

        if (enrollments && enrollments.length > 0) {
            const notifications = enrollments.map(enrollment => ({
                user_id: enrollment.student_id,
                type: 'live_session_started',
                title: 'Live session started',
                message: `The live session "${title}" has started in ${curriculum.title}.`,
                metadata: { curriculumId, liveSessionId: newSession.id },
                is_read: false
            }));

            await Notification.bulkCreate(notifications);
        }

        res.status(201).json({
            success: true,
            message: 'Live session started successfully',
            data: newSession,
        });
    } catch (error) {
        next(error);
    }
};

// End an active Live Session
exports.endLiveSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSession.findByPk(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Live session not found.',
            });
        }

        if (session.status !== 'live') {
            return res.status(400).json({
                success: false,
                message: 'This session is already ended.',
            });
        }

        session.status = 'ended';
        session.ended_at = new Date();
        await session.save();

        res.status(200).json({
            success: true,
            message: 'Live session ended successfully',
            data: session,
        });
    } catch (error) {
        next(error);
    }
};

// Get the currently active Live Session for a curriculum
exports.getActiveLiveSession = async (req, res, next) => {
    try {
        const curriculumId = req.params.id;

        const activeSession = await LiveSession.findOne({
            where: { curriculum_id: curriculumId, status: 'live' },
            include: [{ model: User, as: 'teacher', attributes: ['id', 'name'] }]
        });

        res.status(200).json({
            success: true,
            data: activeSession || null,
        });
    } catch (error) {
        next(error);
    }
};
