const test = require('node:test');
const assert = require('node:assert/strict');
const { authorizeRole } = require('../src/middleware/auth');

function createMockRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.payload = body;
            return this;
        },
    };
}

test('allows instructor role for upload routes', () => {
    const req = { user: { role: 'instructor' } };
    const res = createMockRes();
    let called = false;
    const next = () => { called = true; };

    authorizeRole('instructor')(req, res, next);
    assert.equal(called, true);
    assert.equal(res.statusCode, 200);
});

test('blocks student role for upload routes', () => {
    const req = { user: { role: 'student' } };
    const res = createMockRes();
    let called = false;
    const next = () => { called = true; };

    authorizeRole('instructor')(req, res, next);
    assert.equal(called, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.success, false);
});
