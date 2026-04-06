const s = require('./src/config/database');

async function check() {
    try {
        await s.authenticate();
        
        // Check for table name conflicts - both 'courses' and 'curricula' exist, and both 'contents' and 'lessons'
        const [tables] = await s.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        console.log('=== POTENTIAL CONFLICTS ===');
        const hasContents = tableNames.includes('contents');
        const hasLessons = tableNames.includes('lessons');
        const hasCourses = tableNames.includes('courses');
        const hasCurricula = tableNames.includes('curricula');
        const hasCourseAdmins = tableNames.includes('course_admins');
        
        console.log('contents table:', hasContents ? 'EXISTS (LEGACY!)' : 'not found');
        console.log('lessons table:', hasLessons ? 'EXISTS' : 'not found');
        console.log('courses table:', hasCourses ? 'EXISTS (LEGACY!)' : 'not found');
        console.log('curricula table:', hasCurricula ? 'EXISTS' : 'not found');
        console.log('course_admins table:', hasCourseAdmins ? 'EXISTS (LEGACY!)' : 'not found');
        
        if (hasContents) {
            console.log('\n=== CONTENTS TABLE COLUMNS ===');
            const [cols] = await s.query("SHOW COLUMNS FROM contents");
            cols.forEach(c => console.log(`  ${c.Field} | ${c.Type}`));
        }
        
        // Check if alter:true is causing issues
        // Look at what sync({ alter: true }) would try to do
        console.log('\n=== CHECKING FOR SYNC ERRORS ===');
        console.log('Trying to see what ALTER statements sequelize would generate...');
        
        // Check all users who are students
        const [students] = await s.query("SELECT id, name, email, role FROM users WHERE role = 'student'");
        console.log('\n=== STUDENT USERS ===');
        students.forEach(u => console.log(`  id=${u.id} name=${u.name} email=${u.email}`));
        
        // Check the backend server logs for actual error
        // The 500 error should have been logged by the errorHandler
        // Let me check if there's a `sync({ alter: true })` issue
        console.log('\n=== TESTING sync({ alter: true }) on each model ===');
        
        const { Notification, StudyPlan, StudyTask, SpacedRepetition } = require('./src/models');
        
        const models = [
            { name: 'Notification', model: Notification },
            { name: 'StudyPlan', model: StudyPlan },
            { name: 'StudyTask', model: StudyTask },
            { name: 'SpacedRepetition', model: SpacedRepetition },
        ];
        
        for (const m of models) {
            try {
                await m.model.sync({ alter: true });
                console.log(`  ${m.name}: sync OK`);
            } catch (e) {
                console.error(`  ${m.name}: SYNC ERROR - ${e.message}`);
                if (e.original) console.error(`    SQL: ${e.original.message}`);
            }
        }
        
    } catch (e) {
        console.error('Fatal:', e.message);
    } finally {
        await s.close();
    }
}

check();
