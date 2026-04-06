const { Op } = require('sequelize');
const { UserStats, ActivityLog, Achievement, UserAchievement, LeaderboardScore } = require('../models');

// ─── Level Definitions ──────────────────────────────────────────
const LEVELS = [
    { level: 1, min: 0, title: 'مبتدئ' },
    { level: 2, min: 100, title: 'متعلم' },
    { level: 3, min: 300, title: 'ملتزم' },
    { level: 4, min: 600, title: 'مجتهد' },
    { level: 5, min: 1000, title: 'متفوق' },
    { level: 6, min: 1500, title: 'بارع' },
    { level: 7, min: 2200, title: 'خبير' },
    { level: 8, min: 3000, title: 'عالم' },
    { level: 9, min: 4000, title: 'أسطورة' },
    { level: 10, min: 5500, title: 'عبقري' },
];

// ─── Point Values ───────────────────────────────────────────────
const POINTS = {
    lesson: 10,
    review: 15,
    timer: 8,
    custom: 5,
};

// ─── Helper: format date ─────────────────────────────────────
function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Calculate Level from Points ─────────────────────────────
function calculateLevel(points) {
    let currentLevel = LEVELS[0];
    for (const lvl of LEVELS) {
        if (points >= lvl.min) currentLevel = lvl;
        else break;
    }
    return currentLevel;
}

// ─── Award Points on Task Completion ─────────────────────────
// Called from planner updateTask when status becomes 'completed'
async function awardPoints(userId, taskType, studyMinutes = 0) {
    const today = fmtDate(new Date());
    const points = POINTS[taskType] || 5;

    try {
        // 1. Find or create UserStats
        const [stats] = await UserStats.findOrCreate({
            where: { user_id: userId },
            defaults: { user_id: userId, total_points: 0, current_streak: 0, longest_streak: 0, level: 1 },
        });

        // 2. Find or create daily ActivityLog
        const [activity, created] = await ActivityLog.findOrCreate({
            where: { user_id: userId, date: today },
            defaults: { user_id: userId, date: today, tasks_completed: 0, study_time: 0, points_earned: 0 },
        });

        // 3. Anti-cheat: limit daily points (max 50 tasks per day reasonable)
        if (activity.tasks_completed >= 50) {
            return { points: 0, antiCheat: true };
        }

        // 4. Update activity log
        activity.tasks_completed += 1;
        activity.study_time += studyMinutes;
        activity.points_earned += points;
        await activity.save();

        // 5. Update streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = fmtDate(yesterday);

        let newStreak = stats.current_streak;
        if (stats.last_active_date === today) {
            // Already active today — no streak change
        } else if (stats.last_active_date === yesterdayStr) {
            // Consecutive day — increment streak
            newStreak += 1;
        } else if (!stats.last_active_date) {
            // First ever activity
            newStreak = 1;
        } else {
            // Missed day(s) — reset streak
            newStreak = 1;
        }

        // 6. Update stats
        stats.total_points += points;
        stats.current_streak = newStreak;
        stats.longest_streak = Math.max(stats.longest_streak, newStreak);
        stats.last_active_date = today;

        // 6b. Update LeaderboardScore
        const [leaderboardScore] = await LeaderboardScore.findOrCreate({
            where: { user_id: userId },
            defaults: { user_id: userId }
        });

        leaderboardScore.total_points += points;
        leaderboardScore.weekly_points += points;
        leaderboardScore.tasks_completed += 1;
        if (taskType === 'review') {
            leaderboardScore.reviews_completed += 1;
        }
        await leaderboardScore.save();

        // 7. Recalculate level
        const levelInfo = calculateLevel(stats.total_points);
        const leveledUp = levelInfo.level > stats.level;
        stats.level = levelInfo.level;

        await stats.save();

        // 8. Check achievements (async, non-blocking)
        const newAchievements = await checkAchievements(userId, stats, activity);

        return {
            points,
            total_points: stats.total_points,
            current_streak: stats.current_streak,
            level: stats.level,
            level_title: levelInfo.title,
            leveled_up: leveledUp,
            new_achievements: newAchievements,
        };
    } catch (error) {
        console.error('[Gamification] Error awarding points:', error);
        return { points: 0, error: true };
    }
}

// ─── Revoke Points on Task Uncompletion ──────────────────────
async function revokePoints(userId, taskType) {
    const today = fmtDate(new Date());
    const points = POINTS[taskType] || 5;

    try {
        const stats = await UserStats.findOne({ where: { user_id: userId } });
        if (!stats) return;

        stats.total_points = Math.max(0, stats.total_points - points);
        const levelInfo = calculateLevel(stats.total_points);
        stats.level = levelInfo.level;
        await stats.save();

        const activity = await ActivityLog.findOne({ where: { user_id: userId, date: today } });
        if (activity) {
            activity.tasks_completed = Math.max(0, activity.tasks_completed - 1);
            activity.points_earned = Math.max(0, activity.points_earned - points);
            await activity.save();
        }

        const leaderboardScore = await LeaderboardScore.findOne({ where: { user_id: userId } });
        if (leaderboardScore) {
            leaderboardScore.total_points = Math.max(0, leaderboardScore.total_points - points);
            leaderboardScore.weekly_points = Math.max(0, leaderboardScore.weekly_points - points);
            leaderboardScore.tasks_completed = Math.max(0, leaderboardScore.tasks_completed - 1);
            if (taskType === 'review') {
                leaderboardScore.reviews_completed = Math.max(0, leaderboardScore.reviews_completed - 1);
            }
            await leaderboardScore.save();
        }
    } catch (error) {
        console.error('[Gamification] Error revoking points:', error);
    }
}

// ─── Check & Unlock Achievements ─────────────────────────────
async function checkAchievements(userId, stats, activity) {
    const newlyUnlocked = [];

    try {
        const allAchievements = await Achievement.findAll();
        const earned = await UserAchievement.findAll({
            where: { user_id: userId },
            attributes: ['achievement_id'],
        });
        const earnedIds = new Set(earned.map(e => e.achievement_id));

        // Also need total tasks (across all days)
        const totalTasks = await ActivityLog.sum('tasks_completed', { where: { user_id: userId } }) || 0;
        const totalReviews = await ActivityLog.count({ where: { user_id: userId, tasks_completed: { [Op.gt]: 0 } } }) || 0;

        for (const ach of allAchievements) {
            if (earnedIds.has(ach.id)) continue; // Already earned

            let met = false;

            switch (ach.condition_type) {
                case 'tasks_completed':
                    met = totalTasks >= ach.condition_value;
                    break;
                case 'streak_days':
                    met = stats.current_streak >= ach.condition_value;
                    break;
                case 'points_earned':
                    met = stats.total_points >= ach.condition_value;
                    break;
                case 'level_reached':
                    met = stats.level >= ach.condition_value;
                    break;
                case 'reviews_completed':
                    met = totalReviews >= ach.condition_value;
                    break;
            }

            if (met) {
                await UserAchievement.create({
                    user_id: userId,
                    achievement_id: ach.id,
                    unlocked_at: new Date(),
                });

                // Bonus points
                if (ach.points_reward > 0) {
                    stats.total_points += ach.points_reward;
                    const lvl = calculateLevel(stats.total_points);
                    stats.level = lvl.level;
                    await stats.save();
                }

                newlyUnlocked.push({
                    id: ach.id,
                    title: ach.title,
                    icon: ach.icon,
                    points_reward: ach.points_reward,
                });
            }
        }
    } catch (error) {
        console.error('[Gamification] Error checking achievements:', error);
    }

    return newlyUnlocked;
}

// ─── Get Full Dashboard Data ─────────────────────────────────
async function getDashboardData(userId) {
    // Stats
    const [stats] = await UserStats.findOrCreate({
        where: { user_id: userId },
        defaults: { user_id: userId },
    });

    const levelInfo = calculateLevel(stats.total_points);
    const nextLevel = LEVELS.find(l => l.min > stats.total_points);

    // Activity heatmap (last 180 days)
    const since = new Date();
    since.setDate(since.getDate() - 180);
    const activities = await ActivityLog.findAll({
        where: { user_id: userId, date: { [Op.gte]: fmtDate(since) } },
        attributes: ['date', 'tasks_completed', 'study_time', 'points_earned'],
        order: [['date', 'ASC']],
    });

    // Achievements
    const allAchievements = await Achievement.findAll({ order: [['condition_value', 'ASC']] });
    const earned = await UserAchievement.findAll({
        where: { user_id: userId },
        attributes: ['achievement_id', 'unlocked_at'],
    });
    const earnedMap = {};
    for (const e of earned) earnedMap[e.achievement_id] = e.unlocked_at;

    const achievements = allAchievements.map(a => ({
        id: a.id,
        key: a.key,
        title: a.title,
        description: a.description,
        icon: a.icon,
        condition_type: a.condition_type,
        condition_value: a.condition_value,
        points_reward: a.points_reward,
        unlocked: !!earnedMap[a.id],
        unlocked_at: earnedMap[a.id] || null,
    }));

    return {
        stats: {
            total_points: stats.total_points,
            current_streak: stats.current_streak,
            longest_streak: stats.longest_streak,
            level: stats.level,
            level_title: levelInfo.title,
            next_level: nextLevel ? { level: nextLevel.level, title: nextLevel.title, min: nextLevel.min, points_needed: nextLevel.min - stats.total_points } : null,
        },
        heatmap: activities.map(a => ({
            date: a.date,
            tasks: a.tasks_completed,
            minutes: a.study_time,
            points: a.points_earned,
        })),
        achievements,
        levels: LEVELS,
    };
}

// ─── Seed Default Achievements ───────────────────────────────
async function seedAchievements() {
    const defaults = [
        { key: 'first_task', title: 'البداية', description: 'أكمل أول مهمة', icon: 'flag', condition_type: 'tasks_completed', condition_value: 1, points_reward: 5 },
        { key: 'ten_tasks', title: 'أول 10 مهام', description: 'أكمل 10 مهام', icon: 'looks_one', condition_type: 'tasks_completed', condition_value: 10, points_reward: 15 },
        { key: 'fifty_tasks', title: '50 مهمة مكتملة', description: 'أكمل 50 مهمة', icon: 'military_tech', condition_type: 'tasks_completed', condition_value: 50, points_reward: 30 },
        { key: 'hundred_tasks', title: 'المئة الأولى', description: 'أكمل 100 مهمة', icon: 'workspace_premium', condition_type: 'tasks_completed', condition_value: 100, points_reward: 50 },
        { key: 'streak_3', title: '3 أيام متواصلة', description: 'حافظ على 3 أيام دراسة متتالية', icon: 'local_fire_department', condition_type: 'streak_days', condition_value: 3, points_reward: 10 },
        { key: 'streak_7', title: 'أسبوع كامل', description: '7 أيام متواصلة من المذاكرة', icon: 'whatshot', condition_type: 'streak_days', condition_value: 7, points_reward: 25 },
        { key: 'streak_14', title: 'أسبوعان متواصلان', description: '14 يوم متواصل!', icon: 'bolt', condition_type: 'streak_days', condition_value: 14, points_reward: 40 },
        { key: 'streak_30', title: 'شهر من الالتزام', description: '30 يوم متواصل — أنت مذهل!', icon: 'diamond', condition_type: 'streak_days', condition_value: 30, points_reward: 100 },
        { key: 'points_100', title: 'أول 100 نقطة', description: 'اجمع 100 نقطة', icon: 'star', condition_type: 'points_earned', condition_value: 100, points_reward: 10 },
        { key: 'points_500', title: 'نجم المذاكرة', description: 'اجمع 500 نقطة', icon: 'stars', condition_type: 'points_earned', condition_value: 500, points_reward: 25 },
        { key: 'points_1000', title: 'ألف نقطة!', description: 'اجمع 1000 نقطة', icon: 'auto_awesome', condition_type: 'points_earned', condition_value: 1000, points_reward: 50 },
        { key: 'level_3', title: 'ملتزم', description: 'وصلت إلى المستوى 3', icon: 'trending_up', condition_type: 'level_reached', condition_value: 3, points_reward: 15 },
        { key: 'level_5', title: 'متفوق', description: 'وصلت إلى المستوى 5', icon: 'rocket_launch', condition_type: 'level_reached', condition_value: 5, points_reward: 30 },
        { key: 'level_8', title: 'عالم', description: 'وصلت إلى المستوى 8', icon: 'school', condition_type: 'level_reached', condition_value: 8, points_reward: 75 },
    ];

    for (const ach of defaults) {
        await Achievement.findOrCreate({
            where: { key: ach.key },
            defaults: ach,
        });
    }

    console.log('✅ Achievements seeded.');
}

module.exports = {
    awardPoints,
    revokePoints,
    getDashboardData,
    seedAchievements,
    calculateLevel,
    LEVELS,
    POINTS,
};
