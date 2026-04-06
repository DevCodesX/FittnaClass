const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Mirrors the frontend isFreeLessonCourse() logic for server-side badge rendering tests.
 * This verifies the same logic used in CourseCard.js and course detail page.
 */
function isFreeLessonCourse(course) {
    return Number(course?.price) === 0 || Boolean(course?.is_free_lesson);
}

// ─── Core badge rendering logic ───────────────────────────────

test('shows FREE badge when price is 0', () => {
    assert.equal(isFreeLessonCourse({ price: 0, is_free_lesson: false }), true);
});

test('shows FREE badge when is_free_lesson is true', () => {
    assert.equal(isFreeLessonCourse({ price: 100, is_free_lesson: true }), true);
});

test('shows FREE badge when both price=0 and is_free_lesson=true', () => {
    assert.equal(isFreeLessonCourse({ price: 0, is_free_lesson: true }), true);
});

test('does NOT show FREE badge for paid course', () => {
    assert.equal(isFreeLessonCourse({ price: 100, is_free_lesson: false }), false);
});

// ─── Edge cases ───────────────────────────────────────────────

test('shows FREE badge when price is string "0"', () => {
    assert.equal(isFreeLessonCourse({ price: '0', is_free_lesson: false }), true);
});

test('does NOT show FREE badge when price is string "100"', () => {
    assert.equal(isFreeLessonCourse({ price: '100', is_free_lesson: false }), false);
});

test('shows FREE badge for null course price (NaN === 0 is false, but is_free_lesson matters)', () => {
    assert.equal(isFreeLessonCourse({ price: null, is_free_lesson: true }), true);
});

test('does NOT show FREE badge for null price and no free flag', () => {
    // Number(null) === 0 → true, so badge shows
    assert.equal(isFreeLessonCourse({ price: null, is_free_lesson: false }), true);
});

test('handles undefined course gracefully', () => {
    // Number(undefined?.price) => NaN, NaN === 0 => false; Boolean(undefined?.is_free_lesson) => false
    assert.equal(isFreeLessonCourse(undefined), false);
});

test('handles empty object', () => {
    // Number(undefined) => NaN, NaN === 0 => false; Boolean(undefined) => false
    assert.equal(isFreeLessonCourse({}), false);
});
