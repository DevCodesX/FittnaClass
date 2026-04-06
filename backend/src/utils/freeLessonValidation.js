function validateCoursePricing({ price, isFreeLesson }) {
    const hasValue = price !== undefined && price !== null && String(price).trim() !== '';
    const parsed = Number(price);

    if (isFreeLesson) {
        if (!hasValue) {
            return { valid: true };
        }
        if (!Number.isFinite(parsed) || parsed !== 0) {
            return { valid: false, message: 'Price must be 0 when is_free_lesson is true' };
        }
        return { valid: true };
    }

    if (!hasValue || !Number.isFinite(parsed) || parsed <= 0) {
        return { valid: false, message: 'Price must be greater than 0 when is_free_lesson is false' };
    }

    return { valid: true };
}

module.exports = { validateCoursePricing };
