const app = require('./app');
const { sequelize } = require('./models');
const env = require('./config/env');

const PORT = env.port;

async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync all models (creates tables if they don't exist)
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized.');

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
