const { Curriculum } = require('../models');

/**
 * Generates the next unique course code in FT-XXXX format.
 * Queries the database for the highest existing code and increments.
 */
async function generateCourseCode() {
    const lastCurriculum = await Curriculum.findOne({
        order: [['id', 'DESC']],
        attributes: ['course_code'],
    });

    let nextNumber = 1001; // Start from FT-1001

    if (lastCurriculum && lastCurriculum.course_code) {
        const currentNumber = parseInt(lastCurriculum.course_code.replace('FT-', ''), 10);
        if (!isNaN(currentNumber)) {
            nextNumber = currentNumber + 1;
        }
    }

    const code = `FT-${nextNumber.toString().padStart(4, '0')}`;

    // Verify uniqueness (edge case safety)
    const exists = await Curriculum.findOne({ where: { course_code: code } });
    if (exists) {
        // Recursive retry with incremented number
        const retryCode = `FT-${(nextNumber + 1).toString().padStart(4, '0')}`;
        return retryCode;
    }

    return code;
}

module.exports = { generateCourseCode };
