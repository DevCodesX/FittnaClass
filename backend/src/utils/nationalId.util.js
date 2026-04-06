const governorates = {
    '01': 'القاهرة',
    '02': 'الإسكندرية',
    '03': 'بورسعيد',
    '04': 'السويس',
    '11': 'دمياط',
    '12': 'الدقهلية',
    '13': 'الشرقية',
    '14': 'القليوبية',
    '15': 'كفر الشيخ',
    '16': 'الغربية',
    '17': 'المنوفية',
    '18': 'البحيرة',
    '19': 'الإسماعيلية',
    '21': 'الجيزة',
    '22': 'بني سويف',
    '23': 'الفيوم',
    '24': 'المنيا',
    '25': 'أسيوط',
    '26': 'سوهاج',
    '27': 'قنا',
    '28': 'أسوان',
    '29': 'الأقصر',
    '31': 'البحر الأحمر',
    '32': 'الوادي الجديد',
    '33': 'مطروح',
    '34': 'شمال سيناء',
    '35': 'جنوب سيناء',
    '88': 'خارج الجمهورية',
};

/**
 * Validates and extracts data from an Egyptian National ID
 * @param {string} id National ID string
 * @returns {object} { isValid, errorMessage, data: { birthDate, age, governorate, riskLevel } }
 */
function validateAndExtractNationalId(id) {
    if (!id || typeof id !== 'string') {
        return { isValid: false, errorMessage: 'يرجى إدخال رقم قومي صحيح' };
    }

    if (!/^\d{14}$/.test(id)) {
        return { isValid: false, errorMessage: 'يرجى إدخال رقم قومي صحيح' };
    }

    const centuryCode = parseInt(id.charAt(0), 10);
    const yearCode = parseInt(id.substr(1, 2), 10);
    const monthCode = parseInt(id.substr(3, 2), 10);
    const dayCode = parseInt(id.substr(5, 2), 10);
    const govCode = id.substr(7, 2);

    // Validate century (2 for 1900-1999, 3 for 2000-2099)
    if (centuryCode !== 2 && centuryCode !== 3) {
        return { isValid: false, errorMessage: 'تحقق من الرقم القومي المدخل' };
    }

    const fullYear = (centuryCode === 2 ? 1900 : 2000) + yearCode;

    // Validate month and day
    if (monthCode < 1 || monthCode > 12) {
        return { isValid: false, errorMessage: 'تحقق من الرقم القومي المدخل' };
    }

    const daysInMonth = new Date(fullYear, monthCode, 0).getDate();
    if (dayCode < 1 || dayCode > daysInMonth) {
        return { isValid: false, errorMessage: 'تحقق من الرقم القومي المدخل' };
    }

    // Validate governorate
    if (!governorates[govCode]) {
        return { isValid: false, errorMessage: 'تحقق من الرقم القومي المدخل' };
    }

    // Date is structurally valid
    const birthDateStr = `${fullYear}-${String(monthCode).padStart(2, '0')}-${String(dayCode).padStart(2, '0')}`;
    const birthDate = new Date(fullYear, monthCode - 1, dayCode);

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Risk Analysis
    let riskLevel = 'low';
    if (age < 14 || (age > 20 && age <= 25)) {
        riskLevel = 'medium';
    } else if (age > 25 || age < 5) { // <5 to catch fake recent dates
        riskLevel = 'high';
    }

    return {
        isValid: true,
        errorMessage: null,
        data: {
            birthDate: birthDateStr,
            age,
            governorate: governorates[govCode],
            riskLevel,
            century: centuryCode,
        }
    };
}

module.exports = {
    validateAndExtractNationalId,
    governorates,
};
