const { sequelize, User } = require('./src/models');

async function syncUsers() {
    try {
        await User.sync({ alter: true });
        console.log("✅ Users table synchronized successfully with new columns.");
    } catch (err) {
        console.error("❌ Error syncing users table:", err);
    } finally {
        await sequelize.close();
    }
}

syncUsers();
