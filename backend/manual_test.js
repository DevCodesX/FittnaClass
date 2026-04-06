const http = require('http');

async function run() {
    try {
        console.log('--- Registering ---');
        const r = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test ' + Date.now(),
                email: 'test_' + Date.now() + '@test.com',
                password: 'password',
                role: 'instructor'
            })
        });
        const res = await r.json();
        console.log('Register STATUS:', r.status);
        if (!res.success) {
            console.error(res);
            return;
        }

        const token = res.token;
        console.log('TOKEN:', token);
        
        console.log('--- Adding valid payment setting ---');
        const pReq = await fetch('http://localhost:5000/api/instructor/payment-settings', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                provider: 'vodafone_cash',
                wallet_number: '01012345678'
            })
        });
        const pRes = await pReq.json();
        console.log('Payment STATUS:', pReq.status);
        console.log(pRes);
    } catch (e) {
        console.error('Network Error:', e);
    }
}
run();
