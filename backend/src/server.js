const app = require('./app');
const { sequelize } = require('./models');
const env = require('./config/env');
const CronService = require('./services/CronService');

const PORT = env.port;

async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync all models (creates tables if they don't exist)
        await sequelize.sync();
        console.log('✅ Database models synchronized.');

        // Validate Brevo API Key
        if (!env.brevo.apiKey || env.brevo.apiKey === 'your_brevo_api_key_here') {
            console.warn('⚠️ WARNING: BREVO_API_KEY is missing or invalid. Email services (like OTP) will fail.');
            // if (env.nodeEnv === 'production') throw new Error('BREVO_API_KEY is required in production');
        } else if (!env.brevo.apiKey.startsWith('xkeysib-')) {
             console.warn('⚠️ WARNING: BREVO_API_KEY format seems incorrect. It usually starts with "xkeysib-".');
        } else {
            console.log('✅ BREVO_API_KEY is configured.');
        }

        // Initialize Background Jobs
        CronService.init();

        // Seed gamification achievements
        const { seedAchievements } = require('./services/GamificationService');
        await seedAchievements();

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 FittnaClass API server running on port ${PORT}`);
            console.log(`📋 Environment: ${env.nodeEnv}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Unable to start server:', error.message);
        process.exit(1);
    }
}

startServer();
