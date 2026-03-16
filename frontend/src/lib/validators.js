import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const registerStep1Schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['student', 'instructor'], { required_error: 'Please select a role' }),
});

export const registerStudentStep2Schema = z.object({
    national_id: z
        .string()
        .length(14, 'National ID must be exactly 14 digits')
        .regex(/^\d{14}$/, 'National ID must contain only digits'),
    grade_level: z.string().min(1, 'Grade level is required'),
});

export const registerInstructorStep2Schema = z.object({
    specialization: z.string().min(1, 'Specialization is required'),
    subject: z.string().min(1, 'Subject is required'),
    bio: z.string().optional(),
});

export const courseSchema = z.object({
    title: z.string().min(1, 'Course title is required').max(255),
    description: z.string().optional(),
    subject: z.string().min(1, 'Subject is required'),
    category: z.string().optional(),
    price: z.coerce.number().min(0, 'Price must be a positive number'),
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
