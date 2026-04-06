/**
 * Fix duplicate indexes on all tables.
 * sequelize.sync({ alter: true }) can accumulate duplicate indexes on MySQL.
 */
const { sequelize } = require('./src/models');

async function fixIndexes() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Get all tables
        const [tables] = await sequelize.query("SHOW TABLES");
        const tableKey = Object.keys(tables[0])[0];
        const tableNames = tables.map(t => t[tableKey]);

        for (const table of tableNames) {
            const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
            
            // Group by Key_name
            const indexMap = {};
            for (const idx of indexes) {
                const name = idx.Key_name;
                if (!indexMap[name]) indexMap[name] = [];
                indexMap[name].push(idx);
            }

            // Find duplicate indexes (same columns, different names)
            const colSignatures = {};
            const toDrop = [];
            
            for (const [name, cols] of Object.entries(indexMap)) {
                if (name === 'PRIMARY') continue;
                const sig = cols.map(c => `${c.Column_name}:${c.Non_unique}`).join(',');
                
                if (colSignatures[sig]) {
                    // This is a duplicate - drop the newer one
                    toDrop.push(name);
                } else {
                    colSignatures[sig] = name;
                }
            }

            if (toDrop.length > 0) {
                console.log(`Table ${table}: dropping ${toDrop.length} duplicate index(es): ${toDrop.join(', ')}`);
                for (const idxName of toDrop) {
                    try {
                        await sequelize.query(`DROP INDEX \`${idxName}\` ON \`${table}\``);
                        console.log(`  Dropped: ${idxName}`);
                    } catch (e) {
                        // Try dropping as foreign key
                        try {
                            await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${idxName}\``);
                            await sequelize.query(`DROP INDEX \`${idxName}\` ON \`${table}\``);
                            console.log(`  Dropped FK + index: ${idxName}`);
                        } catch (e2) {
                            console.log(`  Could not drop ${idxName}: ${e2.message}`);
                        }
                    }
                }
            }
        }

        // Now show final counts
        console.log('\n--- Final index counts ---');
        for (const table of tableNames) {
            const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
            const unique = new Set(indexes.map(i => i.Key_name));
            console.log(`  ${table}: ${unique.size} indexes`);
        }

        console.log('\nDone! Try starting the server now.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

fixIndexes();
