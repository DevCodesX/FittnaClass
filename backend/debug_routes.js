const app = require('./src/app');
const request = require('supertest');

async function debugRoutes() {
    try {
        console.log("Testing /api/courses/1...");
        const res = await request(app).get('/api/courses/1');
        console.log("Status:", res.status);
        console.log("Body:", res.body);

        console.log("Testing /api/courses/explore...");
        const res2 = await request(app).get('/api/courses/explore');
        console.log("Status:", res2.status);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
debugRoutes();
