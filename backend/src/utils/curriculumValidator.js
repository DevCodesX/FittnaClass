const { Section, Lesson } = require('../models');

/**
 * Reusable validation: ensures a curriculum meets minimum requirements before publish.
 * Returns { valid: boolean, errors: string[] }
 */
async function validateCurriculumBeforePublish(curriculum) {
    const errors = [];

    // 1. Title must exist
    if (!curriculum.title || !curriculum.title.trim()) {
        errors.push('عنوان المقرر مطلوب.');
    }

    // 2. Thumbnail must exist
    if (!curriculum.thumbnail_url) {
        errors.push('صورة المقرر (Thumbnail) مطلوبة.');
    }

    // 3. Price or free flag
    if (!curriculum.is_free_lesson && (!curriculum.price || Number(curriculum.price) <= 0)) {
        errors.push('المقرر غير المجاني يجب أن يكون له سعر.');
    }

    // 4. At least 1 lesson
    const sections = await Section.findAll({
        where: { curriculum_id: curriculum.id },
        include: [{ model: Lesson, as: 'lessons', attributes: ['id'] }],
    });

    let totalLessons = 0;
    for (const section of sections) {
        totalLessons += (section.lessons || []).length;
    }
    if (totalLessons === 0) {
        errors.push('لا يمكن نشر مقرر بدون دروس. أضف درساً واحداً على الأقل.');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

module.exports = { validateCurriculumBeforePublish };
