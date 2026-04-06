const { Course } = require('./src/models');

async function checkCourses() {
    const courses = await Course.findAll();
    console.log("Existing courses:", courses.map(c => ({ id: c.id, title: c.title })));
    process.exit(0);
}

checkCourses();
