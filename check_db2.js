require('dotenv').config({ path: './backend/.env' });
const { sequelize, Course } = require('./backend/src/models');

async function check() {
  try {
    await sequelize.authenticate();
    const courses = await Course.findAll({ raw: true });
    console.log('Courses:', courses);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
