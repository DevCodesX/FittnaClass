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
 * Validates Egyptian National ID and provides real-time feedback
 * @param {string} id National ID string
 * @returns {object} { isValid, status: 'invalid'|'warning'|'valid', message: string, data: object }
 */
export function validateNationalIdRealtime(id) {
    if (!id) {
        return { isValid: false, status: 'invalid', message: '', data: null };
    }

    if (!/^\d+$/.test(id)) {
        return { isValid: false, status: 'invalid', message: 'يرجى إدخال أرقام فقط', data: null };
    }

    if (id.length < 14) {
        return { isValid: false, status: 'invalid', message: `متبقي ${14 - id.length} أرقام`, data: null };
    }

    if (id.length > 14) {
        return { isValid: false, status: 'invalid', message: 'يرجى إدخال 14 رقماً فقط', data: null };
    }

    const centuryCode = parseInt(id.charAt(0), 10);
    const yearCode = parseInt(id.substr(1, 2), 10);
    const monthCode = parseInt(id.substr(3, 2), 10);
    const dayCode = parseInt(id.substr(5, 2), 10);
    const govCode = id.substr(7, 2);

    // Validate century
    if (centuryCode !== 2 && centuryCode !== 3) {
        return { isValid: false, status: 'warning', message: 'تحقق من الرقم القومي المدخل', data: null };
    }

    const fullYear = (centuryCode === 2 ? 1900 : 2000) + yearCode;

    // Validate month and day
    if (monthCode < 1 || monthCode > 12) {
        return { isValid: false, status: 'warning', message: 'تحقق من الرقم القومي المدخل', data: null };
    }

    const daysInMonth = new Date(fullYear, monthCode, 0).getDate();
    if (dayCode < 1 || dayCode > daysInMonth) {
        return { isValid: false, status: 'warning', message: 'تحقق من الرقم القومي المدخل', data: null };
    }

    // Validate governorate
    if (!governorates[govCode]) {
        return { isValid: false, status: 'warning', message: 'تحقق من الرقم القومي المدخل', data: null };
    }

    // Calculate age
    const birthDate = new Date(fullYear, monthCode - 1, dayCode);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Risk Analysis
    let riskLevel = 'low';
    let status = 'valid';
    let message = 'رقم قومي صالح';

    if (age < 14 || (age > 20 && age <= 25)) {
        riskLevel = 'medium';
    } else if (age > 25 || age < 5) { // <5 to catch fake recent dates
        riskLevel = 'high';
        status = 'warning';
        message = 'تحقق من الرقم القومي المدخل';
    }

    return {
        isValid: true,
        status, 
        message, 
        data: {
            age,
            governorate: governorates[govCode],
            riskLevel
        }
    };
}
