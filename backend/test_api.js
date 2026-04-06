require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');

// Generate a token for student user id=1
const secret = process.env.JWT_SECRET || 'fittnaclass_jwt_secret_change_in_production_2026';
const token = jwt.sign({ id: 1, role: 'student' }, secret, { expiresIn: '1h' });

const endpoints = [
    '/api/notifications/unread-count',
    '/api/student/planner?date_from=2026-04-04&date_to=2026-04-10',
    '/api/student/planner/srs/stats',
];

async function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`\n=== ${path} ===`);
                console.log(`Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(data);
                    console.log('Response:', JSON.stringify(parsed, null, 2));
                } catch {
                    console.log('Raw response:', data.slice(0, 500));
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`\n=== ${path} ===`);
            console.log(`Connection error: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

async function run() {
    console.log('Token generated for user id=1');
    console.log('Testing endpoints against http://localhost:5000...\n');
    
    for (const ep of endpoints) {
        await testEndpoint(ep);
    }
}

run();
