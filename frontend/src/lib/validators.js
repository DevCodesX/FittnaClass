import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const registerStep1Schema = z.object({
    name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100),
    email: z.string().email('البريد الإلكتروني غير صحيح'),
    password: z.string().min(6, 'كلمة المرور يجب أن لا تقل عن 6 أحرف'),
    role: z.enum(['student', 'instructor', 'assistant'], { required_error: 'يرجى تحديد نوع الحساب' }),
});

export const registerStudentStep2Schema = z.object({
    national_id: z
        .string()
        .length(14, 'الرقم القومي يجب أن يتكون من 14 رقماً')
        .regex(/^\d{14}$/, 'الرقم القومي يجب أن يحتوي على أرقام فقط'),
    grade_level: z.string().min(1, 'يرجى تحديد المرحلة الدراسية'),
});

export const registerTeacherStep2Schema = z.object({
    specialization: z.string().min(1, 'التخصص مطلوب'),
    subject: z.string().min(1, 'اسم المادة مطلوب'),
    bio: z.string().optional(),
});

export const courseSchema = z.object({
    title: z.string().min(1, 'Course title is required').max(255),
    description: z.string().optional(),
    subject: z.string().min(1, 'Subject is required'),
    category: z.string().optional(),
    is_free_lesson: z.boolean().optional().default(false),
    price: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if (data.is_free_lesson) {
        if (Number(data.price ?? 0) !== 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['price'],
                message: 'Price must be 0 when free lesson is enabled',
            });
        }
        return;
    }

    if (!Number.isFinite(Number(data.price)) || Number(data.price) <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['price'],
            message: 'Price must be greater than 0',
        });
    }
});

export const paymentSchema = z.object({
    provider: z.enum(['vodafone_cash', 'instapay', 'fawry', 'other'], {
        required_error: 'Please select a payment provider',
    }),
    wallet_number: z
        .string()
        .min(1, 'Wallet number is required')
        .max(50),
    details: z.string().optional(),
});

export function validateForm(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = {};
        result.error.issues.forEach((issue) => {
            const path = issue.path.join('.');
            if (!errors[path]) {
                errors[path] = issue.message;
            }
        });
        return { success: false, errors };
    }
    return { success: true, data: result.data, errors: {} };
}
