const { getDashboardData } = require('../services/GamificationService');

// ─── GET /student/gamification ─────────────────────────────────
async function getGamificationDashboard(req, res, next) {
    try {
        const data = await getDashboardData(req.user.id);
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

module.exports = { getGamificationDashboard };
