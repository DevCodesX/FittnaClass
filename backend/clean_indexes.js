const s = require('./src/config/database');

async function fixDuplicateIndexes() {
    try {
        await s.authenticate();
        console.log('Connected to Database.');

        const tables = await s.getQueryInterface().showAllTables();
        
        for (const table of tables) {
            console.log(`\nChecking table: ${table}`);
            const [indexes] = await s.query(`SHOW INDEXES FROM ${table}`);
            
            const indexNames = indexes.map(i => i.Key_name);
            const indexCounts = {};
            indexNames.forEach(i => {
                indexCounts[i] = (indexCounts[i] || 0) + 1;
            });
            
            // Actually what happens with Sequelize alter is it creates multiple indexes for the same column
            // for example email, email_2, email_3, etc. OR users_email_unique, users_email_unique_1, etc.
            
            const toDrop = indexNames.filter(name => 
                name !== 'PRIMARY' && 
                (name.match(/_\d+$/) || name.startsWith('email_') || name.startsWith('users_email_'))
            );
            
            // Remove duplicates from the drop list (since SHOW INDEX returns a row per column in index)
            const uniqueToDrop = [...new Set(toDrop)];
            
            if (uniqueToDrop.length > 0) {
                console.log(`Found ${uniqueToDrop.length} suspicious indexes to drop in ${table}`);
                for (const idxName of uniqueToDrop) {
                    try {
                        await s.query(`ALTER TABLE ${table} DROP INDEX \`${idxName}\``);
                        console.log(`  Dropped index: ${idxName}`);
                    } catch (e) {
                        console.log(`  Failed to drop index ${idxName}: ${e.message}`);
                    }
                }
            } else {
                console.log(`  No suspicious indexes found.`);
            }
            
            // Let's also print total index count
            const [finalIndexes] = await s.query(`SHOW INDEXES FROM ${table}`);
            const finalUnique = [...new Set(finalIndexes.map(i => i.Key_name))];
            console.log(`  Total indexes currently: ${finalUnique.length}`);
            
            // Let's systematically drop if > 50 indexes
            if (finalUnique.length > 50) {
                console.log(`  CRITICAL: Table ${table} still has ${finalUnique.length} indexes! We need to truncate extras.`);
                for(let k = 0; k < finalUnique.length; k++) {
                    const idxName = finalUnique[k];
                    if (idxName !== 'PRIMARY' && !idxName.endsWith('_ibfk_1') && !idxName.endsWith('_ibfk_2')) {
                        try {
                            await s.query(`ALTER TABLE ${table} DROP INDEX \`${idxName}\``);
                            console.log(`  Brute-force dropped index: ${idxName}`);
                        } catch (e) { }
                    }
                }
            }
        }
        
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await s.close();
    }
}

fixDuplicateIndexes();
