const { sequelize } = require('./backend/src/models');

async function checkIndexes() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query("SHOW INDEX FROM users");
    console.log('Indexes for users:', results.map(r => r.Key_name));
    
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log('Tables:', tables);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkIndexes();
