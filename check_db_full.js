const { sequelize } = require('./backend/src/models');

async function checkAllTableIndexes() {
  try {
    await sequelize.authenticate();
    const [tables] = await sequelize.query("SHOW TABLES");
    const dbName = 'fittnaclass';
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const [indexes] = await sequelize.query(`SHOW INDEX FROM ${tableName}`);
      const indexNames = new Set(indexes.map(r => r.Key_name));
      console.log(`Table: ${tableName}, Index Count: ${indexNames.size}`);
      if (indexNames.size > 50) {
        console.log(`  Indexes: ${Array.from(indexNames).join(', ')}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkAllTableIndexes();
