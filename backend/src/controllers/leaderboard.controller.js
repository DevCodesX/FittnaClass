const { LeaderboardScore, User, Sequelize } = require('../models');

// GET /student/leaderboard
exports.getLeaderboard = async (req, res) => {
    try {
        const { type = 'weekly', limit = 50, education_type, stage, grade_level, track } = req.query;
        const currentUserId = req.user.id;

        // 1. Build Filter Conditions based on User model
        const userFilters = {};
        if (education_type) userFilters.education_type = education_type;
        if (stage) userFilters.stage = stage;
        if (grade_level) userFilters.grade_level = grade_level;
        if (track) userFilters.track = track;

        // Ensure we only rank students
        userFilters.role = 'student';

        // 2. Determine sorting column
        const sortColumn = type === 'weekly' ? 'weekly_points' : 'total_points';
        
        // 3. Query the Top N users
        // Primary sort: points. Secondary sort: tasks_completed (break ties)
        let topQueryArgs = {
            attributes: ['id', 'user_id', 'total_points', 'weekly_points', 'tasks_completed'],
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'avatar_url', 'education_type', 'stage', 'grade_level'],
                where: Object.keys(userFilters).length > 0 ? userFilters : { role: 'student' }
            }],
            order: [
                [sortColumn, 'DESC'],
                ['tasks_completed', 'DESC'],
                ['id', 'ASC']
            ],
            limit: parseInt(limit, 10),
        };

        const topScores = await LeaderboardScore.findAll(topQueryArgs);

        // Compute rank values directly
        let currentRank = 1;
        const topList = topScores.map((score, index) => {
            const data = score.toJSON();
            // Handle ties visually if needed, but for simplicity: rank is just index+1
            data.rank = index + 1;
            return data;
        });

        // 4. Query Current User's Specific Rank and Score
        let currentUserData = topList.find(s => s.user_id === currentUserId);

        if (!currentUserData) {
            // User is not in the Top N, calculate their rank manually
            const currentUserScore = await LeaderboardScore.findOne({
                where: { user_id: currentUserId },
                attributes: ['id', 'user_id', 'total_points', 'weekly_points', 'tasks_completed'],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'avatar_url', 'education_type', 'stage', 'grade_level']
                }]
            });

            if (currentUserScore) {
                // Determine rank based on points & tasks
                const scoreValue = currentUserScore[sortColumn];
                const currentUserTasks = currentUserScore.tasks_completed;

                // Rank is 1 + the number of people who have strictly more points, or same points but more tasks_completed,
                // or same points, same tasks, but smaller ID
                const Op = Sequelize.Op;
                const higherCount = await LeaderboardScore.count({
                    where: {
                        [Op.or]: [
                            { [sortColumn]: { [Op.gt]: scoreValue } },
                            { [sortColumn]: scoreValue, tasks_completed: { [Op.gt]: currentUserTasks } },
                            { [sortColumn]: scoreValue, tasks_completed: currentUserTasks, id: { [Op.lt]: currentUserScore.id } }
                        ]
                    },
                    include: [{
                        model: User,
                        as: 'user',
                        where: Object.keys(userFilters).length > 0 ? userFilters : { role: 'student' },
                        required: true // must match filters
                    }]
                });

                const myData = currentUserScore.toJSON();
                myData.rank = higherCount + 1;
                // Double check they matched the filter? We only care to show their rank within this filter.
                // If they don't match the current filter, they might just have rank = N/A or we still display it.
                // Assuming they match but fell outside top 50
                currentUserData = myData;
            } else {
                // User hasn't earned any points yet
                const reqUser = await User.findByPk(currentUserId, { attributes: ['id', 'name', 'avatar_url', 'education_type', 'stage', 'grade_level'] });
                currentUserData = {
                    user_id: currentUserId,
                    total_points: 0,
                    weekly_points: 0,
                    tasks_completed: 0,
                    user: reqUser ? reqUser.toJSON() : null,
                    rank: '—', // Unranked
                };
            }
        }

        res.json({
            success: true,
            data: {
                top: topList,
                currentUser: currentUserData
            }
        });

    } catch (error) {
        console.error('[Leaderboard] Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
    }
};
