const s = require('./src/config/database');

async function fixUserColumns() {
    try {
        await s.authenticate();
        console.log('Connected to DB...');

        const [cols] = await s.query("SHOW COLUMNS FROM users");
        const columnNames = cols.map(c => c.Field);

        const needed = [
            { name: 'education_type', def: "ENUM('عام', 'أزهر') NULL" },
            { name: 'stage', def: "ENUM('ابتدائي', 'اعدادي', 'ثانوي') NULL" },
            { name: 'track', def: "VARCHAR(50) NULL" },
        ];

        for (const col of needed) {
            if (!columnNames.includes(col.name)) {
                console.log(`Adding missing column: ${col.name}`);
                await s.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
            } else {
                console.log(`Column ${col.name} already exists.`);
            }
        }

        console.log('Done.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await s.close();
    }
}

fixUserColumns();
