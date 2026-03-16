import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('fittnaclass_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('fittnaclass_token');
                localStorage.removeItem('fittnaclass_user');
                window.location.href = '/?auth=login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// â”€â”€ Auth API â”€â”€
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
};

// â”€â”€ Instructor API â”€â”€
export const instructorAPI = {
    // Profile & Payment
    getProfileStatus: () => api.get('/instructor/profile-status'),
    getPaymentMethods: () => api.get('/instructor/payment-methods'),
    savePaymentSettings: (data) => api.post('/instructor/payment-settings', data),

    // Courses
    createCourse: (data) => api.post('/instructor/courses', data),
    getInstructorCourses: () => api.get('/instructor/courses'),
    getCourseWithLessons: (courseId) => api.get(`/instructor/courses/${courseId}`),
    updateCourse: (courseId, data) => api.put(`/instructor/courses/${courseId}`, data),
    publishCourse: (courseId) => api.patch(`/instructor/courses/${courseId}/publish`),

    // Content / Lessons
    uploadVideo: (courseId, formData, onProgress) =>
        api.post(`/instructor/courses/${courseId}/upload-video`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress,
        }),
    addContent: (courseId, data) => api.post(`/instructor/courses/${courseId}/content`, data),
    updateContent: (courseId, contentId, data) =>
        api.put(`/instructor/courses/${courseId}/content/${contentId}`, data),
    deleteContent: (courseId, contentId) =>
        api.delete(`/instructor/courses/${courseId}/content/${contentId}`),
    reorderContent: (courseId, items) =>
        api.patch(`/instructor/courses/${courseId}/content/reorder`, { items }),

    // Students
    getPendingStudents: () => api.get('/instructor/pending-students'),
    updateEnrollmentStatus: (id, status) =>
        api.patch(`/instructor/enrollments/${id}/approve`, { status }),
};

// â”€â”€ Student API â”€â”€
export const studentAPI = {
    exploreCourses: (query = '') => api.get(`/courses/explore${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    enrollInCourse: (courseId, formData) =>
        api.post(`/courses/${courseId}/enroll`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getMyCourses: () => api.get('/student/my-courses'),
    getCourseContent: (courseId) => api.get(`/courses/${courseId}/content`),
};

