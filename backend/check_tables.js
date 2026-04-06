const s = require('./src/config/database');

async function check() {
    try {
        await s.authenticate();
        console.log('DB connected');
        const tables = await s.getQueryInterface().showAllTables();
        console.log('All tables:');
        tables.forEach(t => console.log('  -', t));
        
        // Check for our specific tables
        const needed = ['notifications', 'study_plans', 'study_tasks', 'spaced_repetitions'];
        console.log('\nNeeded tables check:');
        for (const t of needed) {
            console.log(`  ${t}: ${tables.includes(t) ? 'EXISTS' : 'MISSING'}`);
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await s.close();
    }
}

check();
