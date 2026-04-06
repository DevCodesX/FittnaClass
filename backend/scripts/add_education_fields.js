const sequelize = require('../src/config/database');

async function migrate() {
    const t = await sequelize.transaction();
    try {
        console.log('🔄 Starting migration to add education_type and stage...\n');

        // Check if education_type exists
        const [educationCols] = await sequelize.query(
            "SHOW COLUMNS FROM `curricula` LIKE 'education_type'",
            { transaction: t }
        );

        if (educationCols.length === 0) {
            console.log('1️⃣  Adding education_type column to curricula');
            await sequelize.query(
                "ALTER TABLE `curricula` ADD COLUMN `education_type` VARCHAR(50) NULL AFTER `category`",
                { transaction: t }
            );
        } else {
            console.log('ℹ️  education_type already exists.');
        }

        // Check if stage exists
        const [stageCols] = await sequelize.query(
            "SHOW COLUMNS FROM `curricula` LIKE 'stage'",
            { transaction: t }
        );

        if (stageCols.length === 0) {
            console.log('2️⃣  Adding stage column to curricula');
            await sequelize.query(
                "ALTER TABLE `curricula` ADD COLUMN `stage` VARCHAR(50) NULL AFTER `education_type`",
                { transaction: t }
            );
        } else {
            console.log('ℹ️  stage already exists.');
        }

        await t.commit();
        console.log('\n✅ Migration complete! Added education_type and stage.');

    } catch (error) {
        await t.rollback();
        console.error('\n❌ Migration failed. All changes rolled back.');
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();
