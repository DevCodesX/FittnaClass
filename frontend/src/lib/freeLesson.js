export function buildCoursePayload(source) {
    return {
        ...source,
        is_free_lesson: Boolean(source.is_free_lesson),
        price: source.is_free_lesson ? 0 : Number(source.price || 0),
    };
}

export function isFreeLessonCourse(course) {
    return Number(course?.price) === 0 || Boolean(course?.is_free_lesson);
}
