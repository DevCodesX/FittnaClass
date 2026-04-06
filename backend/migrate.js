/**
 * Migration script: Convert old Course/Content flat system to Curriculum/Section/Lesson system.
 * 
 * Performs the following transformations:
 * 1. Renames 'courses' table → 'curricula'
 * 2. Creates 'sections' table
 * 3. Renames 'contents' table → 'lessons'
 * 4. Creates a default section "بدون تصنيف" for each curriculum
 * 5. Migrates lessons from course_id to section_id
 * 6. Renames enrollment column course_id → curriculum_id
 * 
 * Usage: node migrate.js
 */

const sequelize = require('./src/config/database');

async function migrate() {
    const qi = sequelize.getQueryInterface();
    const t = await sequelize.transaction();

    try {
        console.log('🔄 Starting migration...\n');

        // Step 1: Check if 'courses' table exists (hasn't been migrated yet)
        const [tables] = await sequelize.query(
            "SHOW TABLES LIKE 'courses'",
            { transaction: t }
        );

        if (tables.length === 0) {
            console.log('ℹ️  Table "courses" not found. Migration may have already been applied.');
            console.log('   Checking for "curricula" table...');
            const [curriculaTable] = await sequelize.query(
                "SHOW TABLES LIKE 'curricula'",
                { transaction: t }
            );
            if (curriculaTable.length > 0) {
                console.log('✅ "curricula" table already exists. Migration already applied.');
                await t.commit();
                return;
            }
            console.log('❌ Neither "courses" nor "curricula" found. Cannot migrate.');
            await t.rollback();
            return;
        }

        // Step 2: Rename courses → curricula
        console.log('1️⃣  Renaming table: courses → curricula');
        await sequelize.query('RENAME TABLE `courses` TO `curricula`', { transaction: t });

        // Step 3: Add grade_level column to curricula
        console.log('2️⃣  Adding grade_level column to curricula');
        await sequelize.query(
            "ALTER TABLE `curricula` ADD COLUMN `grade_level` VARCHAR(100) NULL AFTER `category`",
            { transaction: t }
        );

        // Step 4: Create sections table
        console.log('3️⃣  Creating sections table');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS \`sections\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`curriculum_id\` INT NOT NULL,
                \`parent_id\` INT NULL,
                \`title\` VARCHAR(255) NOT NULL,
                \`order\` INT NOT NULL DEFAULT 0,
                \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                FOREIGN KEY (\`curriculum_id\`) REFERENCES \`curricula\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY (\`parent_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `, { transaction: t });

        // Step 5: Check if 'contents' table exists
        const [contentsTable] = await sequelize.query(
            "SHOW TABLES LIKE 'contents'",
            { transaction: t }
        );

        if (contentsTable.length > 0) {
            // Step 6: Add section_id and type to contents BEFORE renaming
            console.log('4️⃣  Adding section_id and type columns to contents');
            await sequelize.query(
                "ALTER TABLE `contents` ADD COLUMN `section_id` INT NULL AFTER `course_id`",
                { transaction: t }
            );
            await sequelize.query(
                "ALTER TABLE `contents` ADD COLUMN `type` ENUM('video', 'live') NOT NULL DEFAULT 'video' AFTER `title`",
                { transaction: t }
            );

            // Make video_url nullable (lessons can be non-video)
            await sequelize.query(
                "ALTER TABLE `contents` MODIFY COLUMN `video_url` VARCHAR(500) NULL",
                { transaction: t }
            );

            // Step 7: Create default section for each curriculum and migrate lessons
            console.log('5️⃣  Creating default sections and migrating lessons...');
            const [curricula] = await sequelize.query(
                "SELECT id FROM `curricula`",
                { transaction: t }
            );

            for (const curr of curricula) {
                // Create default section
                const [result] = await sequelize.query(
                    `INSERT INTO \`sections\` (\`curriculum_id\`, \`title\`, \`order\`, \`created_at\`, \`updated_at\`)
                     VALUES (?, 'بدون تصنيف', 0, NOW(), NOW())`,
                    { replacements: [curr.id], transaction: t }
                );
                const sectionId = result;

                // Update all lessons for this curriculum to use the new section
                await sequelize.query(
                    "UPDATE `contents` SET `section_id` = ? WHERE `course_id` = ?",
                    { replacements: [sectionId, curr.id], transaction: t }
                );
            }

            // Step 8: Make section_id NOT NULL and add FK
            console.log('6️⃣  Finalizing lesson table structure');

            // For any orphaned lessons without a section, handle gracefully
            const [orphans] = await sequelize.query(
                "SELECT COUNT(*) as cnt FROM `contents` WHERE `section_id` IS NULL",
                { transaction: t }
            );
            if (orphans[0].cnt > 0) {
                console.log(`   ⚠️  Found ${orphans[0].cnt} orphaned lessons, deleting...`);
                await sequelize.query(
                    "DELETE FROM `contents` WHERE `section_id` IS NULL",
                    { transaction: t }
                );
            }

            await sequelize.query(
                "ALTER TABLE `contents` MODIFY COLUMN `section_id` INT NOT NULL",
                { transaction: t }
            );

            // Drop old course_id FK if exists
            try {
                const [fks] = await sequelize.query(
                    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                     WHERE TABLE_NAME = 'contents' AND COLUMN_NAME = 'course_id' 
                     AND REFERENCED_TABLE_NAME IS NOT NULL`,
                    { transaction: t }
                );
                for (const fk of fks) {
                    await sequelize.query(
                        `ALTER TABLE \`contents\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
                        { transaction: t }
                    );
                }
            } catch (e) {
                console.log('   (No FK constraint to drop on contents.course_id)');
            }

            // Drop old course_id column
            await sequelize.query(
                "ALTER TABLE `contents` DROP COLUMN `course_id`",
                { transaction: t }
            );

            // Add FK for section_id
            await sequelize.query(
                "ALTER TABLE `contents` ADD CONSTRAINT `fk_lessons_section` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
                { transaction: t }
            );

            // Step 9: Rename contents → lessons
            console.log('7️⃣  Renaming table: contents → lessons');
            await sequelize.query('RENAME TABLE `contents` TO `lessons`', { transaction: t });
        } else {
            console.log('ℹ️  No "contents" table found. Creating lessons table from scratch.');
        }

        // Step 10: Update enrollments table - rename course_id → curriculum_id
        console.log('8️⃣  Updating enrollments table');
        const [enrollmentCols] = await sequelize.query(
            "SHOW COLUMNS FROM `enrollments` LIKE 'course_id'",
            { transaction: t }
        );

        if (enrollmentCols.length > 0) {
            // Drop old FK on course_id
            try {
                const [fks] = await sequelize.query(
                    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                     WHERE TABLE_NAME = 'enrollments' AND COLUMN_NAME = 'course_id' 
                     AND REFERENCED_TABLE_NAME IS NOT NULL`,
                    { transaction: t }
                );
                for (const fk of fks) {
                    await sequelize.query(
                        `ALTER TABLE \`enrollments\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
                        { transaction: t }
                    );
                }
            } catch (e) {
                console.log('   (No FK to drop on enrollments.course_id)');
            }

            // Drop old unique index if exists
            try {
                await sequelize.query(
                    "ALTER TABLE `enrollments` DROP INDEX `unique_student_course`",
                    { transaction: t }
                );
            } catch (e) {
                console.log('   (No unique_student_course index to drop)');
            }

            // Rename column
            await sequelize.query(
                "ALTER TABLE `enrollments` CHANGE COLUMN `course_id` `curriculum_id` INT NOT NULL",
                { transaction: t }
            );

            // Add new FK
            await sequelize.query(
                "ALTER TABLE `enrollments` ADD CONSTRAINT `fk_enrollments_curriculum` FOREIGN KEY (`curriculum_id`) REFERENCES `curricula`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
                { transaction: t }
            );

            // Add new unique index
            await sequelize.query(
                "ALTER TABLE `enrollments` ADD UNIQUE INDEX `unique_student_curriculum` (`student_id`, `curriculum_id`)",
                { transaction: t }
            );
        } else {
            console.log('   ℹ️  enrollments.course_id not found (already migrated or new schema)');
        }

        await t.commit();
        console.log('\n✅ Migration complete! All data preserved.');
        console.log('   - courses → curricula');
        console.log('   - contents → lessons (with section_id)');
        console.log('   - enrollments.course_id → enrollments.curriculum_id');
        console.log('   - Default section "بدون تصنيف" created for each curriculum');

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
