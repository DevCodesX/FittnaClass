const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCoursePricing } = require('../src/utils/freeLessonValidation');

test('allows zero price when free lesson is enabled', () => {
    const result = validateCoursePricing({ price: 0, isFreeLesson: true });
    assert.equal(result.valid, true);
});

test('rejects non-zero price when free lesson is enabled', () => {
    const result = validateCoursePricing({ price: 99, isFreeLesson: true });
    assert.equal(result.valid, false);
});

test('rejects zero price when free lesson is disabled', () => {
    const result = validateCoursePricing({ price: 0, isFreeLesson: false });
    assert.equal(result.valid, false);
});

test('allows positive price when free lesson is disabled', () => {
    const result = validateCoursePricing({ price: 120, isFreeLesson: false });
    assert.equal(result.valid, true);
});
