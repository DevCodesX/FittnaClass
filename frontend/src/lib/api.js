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
        if (process.env.NODE_ENV === 'development') {
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
    (response) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} | Status: ${response.status}`, response.data);
        }
        return response;
    },
    (error) => {
        if (process.env.NODE_ENV === 'development') {
            console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: ${error.response?.status}`, error.response?.data);
        }
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

// ─── Auth API ───
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMyPermissions: () => api.get('/auth/me/permissions'),
    updateProfile: (formData) => api.put('/auth/profile', formData, {
        // Axios sets Content-Type automatically for FormData
    }),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    verifyOTP: (data) => api.post('/auth/verify-otp', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── Teacher API ───
export const teacherAPI = {
    // Profile & Payment
    getProfileStatus: () => api.get('/Teacher/profile-status'),
    getPaymentMethods: () => api.get('/Teacher/payment-methods'),
    savePaymentSettings: (data) => api.post('/Teacher/payment-settings', data),

    // Curricula (مقررات)
    createCurriculum: (data) => api.post('/Teacher/curricula', data),
    getTeacherCurricula: () => api.get('/Teacher/curricula'),
    getCurriculumDetails: (id) => api.get(`/Teacher/curricula/${id}`),
    getCurriculumDashboardMetrics: (id) => api.get(`/Teacher/curricula/${id}/dashboard-metrics`),
    updateCurriculum: (id, data) => api.put(`/Teacher/curricula/${id}`, data),
    publishCurriculum: (id) => api.patch(`/Teacher/curricula/${id}/publish`),
    scheduleCurriculum: (id, data) => api.patch(`/Teacher/curricula/${id}/schedule`, data),
    submitForReview: (id) => api.patch(`/Teacher/curricula/${id}/submit-review`),
    unpublishCurriculum: (id) => api.patch(`/Teacher/curricula/${id}/unpublish`),
    reviewCurriculum: (id, action) => api.patch(`/Teacher/curricula/${id}/review`, { action }),
    deleteCurriculum: (id) => api.delete(`/Teacher/curricula/${id}`),
    uploadCurriculumThumbnail: (id, formData) =>
        api.post(`/Teacher/curricula/${id}/thumbnail`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    // Sections (وحدات)
    createSection: (curriculumId, data) => api.post(`/Teacher/curricula/${curriculumId}/sections`, data),
    updateSection: (curriculumId, sectionId, data) => api.put(`/Teacher/curricula/${curriculumId}/sections/${sectionId}`, data),
    deleteSection: (curriculumId, sectionId) => api.delete(`/Teacher/curricula/${curriculumId}/sections/${sectionId}`),
    reorderSections: (curriculumId, items) => api.patch(`/Teacher/curricula/${curriculumId}/sections/reorder`, { items }),

    // Lessons (دروس)
    createLesson: (curriculumId, sectionId, data) => api.post(`/Teacher/curricula/${curriculumId}/sections/${sectionId}/lessons`, data),
    uploadLessonVideoMedia: (curriculumId, formData, onProgress) =>
        api.post(`/Teacher/curricula/${curriculumId}/upload-video-media`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress,
        }),
    updateLesson: (curriculumId, sectionId, lessonId, data, onProgress) => {
        return api.put(`/Teacher/curricula/${curriculumId}/sections/${sectionId}/lessons/${lessonId}`, data, {
            onUploadProgress: onProgress,
        });
    },
    deleteLesson: (curriculumId, sectionId, lessonId) =>
        api.delete(`/Teacher/curricula/${curriculumId}/sections/${sectionId}/lessons/${lessonId}`),
    reorderLessons: (curriculumId, sectionId, items) =>
        api.patch(`/Teacher/curricula/${curriculumId}/sections/${sectionId}/lessons/reorder`, { items }),

    // Live Sessions (بث مباشر للمقرر)
    getActiveLiveSession: (curriculumId) => api.get(`/Teacher/curricula/${curriculumId}/live`),
    startLiveSession: (curriculumId, data) => api.post(`/Teacher/curricula/${curriculumId}/live`, data),
    endLiveSession: (curriculumId, sessionId) => api.put(`/Teacher/curricula/${curriculumId}/live/${sessionId}/end`),
    createEvent: (curriculumId, data) => api.post(`/Teacher/curricula/${curriculumId}/events`, data),
    getEvents: (curriculumId) => api.get(`/Teacher/curricula/${curriculumId}/events`),
    updateEvent: (curriculumId, eventId, data) => api.put(`/Teacher/curricula/${curriculumId}/events/${eventId}`, data),
    deleteEvent: (curriculumId, eventId) => api.delete(`/Teacher/curricula/${curriculumId}/events/${eventId}`),

    // Admins (المشرفين)
    getAdmins: (curriculumId) => api.get(`/Teacher/curricula/${curriculumId}/admins`),
    addAdmin: (curriculumId, data) => api.post(`/Teacher/curricula/${curriculumId}/admins`, data),
    updateAdmin: (curriculumId, adminId, data) => api.put(`/Teacher/curricula/${curriculumId}/admins/${adminId}`, data),
    removeAdmin: (curriculumId, adminId) => api.delete(`/Teacher/curricula/${curriculumId}/admins/${adminId}`),
    getAdminActivityLog: (curriculumId, page = 1) => api.get(`/Teacher/curricula/${curriculumId}/admins/activity-log?page=${page}`),
    getMyAdminCurricula: () => api.get('/Teacher/my-admin-curricula'),
    getMyPendingInvites: () => api.get('/Teacher/my-admin-invites'),
    acceptAdminInvite: (curriculumId) => api.post(`/Teacher/admin-invites/${curriculumId}/accept`),
    declineAdminInvite: (curriculumId) => api.post(`/Teacher/admin-invites/${curriculumId}/decline`),

    // Invites (الدعوات)
    getInvites: (curriculumId) => api.get(`/Teacher/curricula/${curriculumId}/invites`),
    cancelInvite: (curriculumId, inviteId) => api.delete(`/Teacher/curricula/${curriculumId}/invites/${inviteId}`),
    resendInvite: (curriculumId, inviteId) => api.post(`/Teacher/curricula/${curriculumId}/invites/${inviteId}/resend`),

    // Students
    getPendingStudents: () => api.get('/Teacher/pending-students'),
    updateEnrollmentStatus: (id, status) => api.patch(`/Teacher/enrollments/${id}/approve`, { status }),
    getAcceptedStudents: () => api.get('/Teacher/accepted-students'),
    suspendStudent: (id, is_suspended) => api.patch(`/Teacher/enrollments/${id}/suspend`, { is_suspended }),
    deleteStudent: (id) => api.delete(`/Teacher/enrollments/${id}`),

    // Coupons (كوبونات)
    getCoupons: () => api.get('/Teacher/coupons'),
    createCoupon: (data) => api.post('/Teacher/coupons', data),
    updateCouponStatus: (id, is_active) => api.put(`/Teacher/coupons/${id}/status`, { is_active }),

    // Installments (أقساط)
    configureInstallmentPlan: (curriculumId, data) => api.post(`/Teacher/curricula/${curriculumId}/installment-plan`, data),
    getInstallmentPlan: (curriculumId) => api.get(`/Teacher/curricula/${curriculumId}/installment-plan`),
    deleteInstallmentPlan: (curriculumId) => api.delete(`/Teacher/curricula/${curriculumId}/installment-plan`),
    getPendingInstallments: () => api.get('/Teacher/pending-installments'),
    reviewInstallment: (id, status) => api.patch(`/Teacher/installments/${id}/review`, { status }),
};

// ─── Public Invite API ─────────────────────────────────────────
export const inviteAPI = {
    verify: (token) => api.get(`/invite/${token}`),
    accept: (token) => api.post(`/invite/${token}/accept`),
};

// ─── Student API ───
export const studentAPI = {
    exploreCurricula: (q = '', education_type = '', stage = '', grade_level = '', category = '', subject = '', free = false) => {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (education_type && education_type !== 'all') params.append('education_type', education_type);
        if (stage && stage !== 'all') params.append('stage', stage);
        if (grade_level && grade_level !== 'all') params.append('grade_level', grade_level);
        if (category && category !== 'all') params.append('category', category);
        if (subject && subject !== 'all') params.append('subject', subject);
        if (free) params.append('free', 'true');
        const queryString = params.toString();
        return api.get(`/curricula/explore${queryString ? `?${queryString}` : ''}`);
    },
    enrollInCurriculum: (curriculumId, formData) =>
        api.post(`/curricula/${curriculumId}/enroll`, formData, {
            // Axios correctly sets the boundary for multipart/form-data requests
        }),
    getMyCourses: () => api.get('/student/my-courses'),
    getCurriculumContent: (id) => api.get(`/curricula/${id}/content`),
    getCurriculumDetails: (id) => api.get(`/curricula/${id}`),
    checkEnrollmentStatus: (id) => api.get(`/curricula/${id}/enrollment-status`),
    uploadReceipt: (enrollmentId, formData) =>
        api.post(`/enrollments/${enrollmentId}/upload-receipt`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    getActiveLiveSession: (curriculumId) => api.get(`/curricula/${curriculumId}/live`),
    getEvents: () => api.get('/student/events'),
    validateCoupon: (data) => api.post('/validate-coupon', data),

    // Installments
    getInstallmentPlan: (curriculumId) => api.get(`/curricula/${curriculumId}/installment-plan`),
    payInstallment: (curriculumId, formData) =>
        api.post(`/curricula/${curriculumId}/pay-installment`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    getMyInstallments: (curriculumId) => api.get(`/curricula/${curriculumId}/my-installments`),

    // Planner V2 (جدول المذاكرة)
    getPlannerCourses: () => api.get('/student/planner/courses'),
    getPlan: (date) => api.get(`/student/planner?date=${date}`),
    getPlanRange: (dateFrom, dateTo) => api.get(`/student/planner?date_from=${dateFrom}&date_to=${dateTo}`),
    createTask: (data) => api.post('/student/planner/tasks', data),
    updateTask: (id, data) => api.patch(`/student/planner/tasks/${id}`, data),
    deleteTask: (id) => api.delete(`/student/planner/tasks/${id}`),
    reorderTasks: (data) => api.patch('/student/planner/tasks/reorder', data),
    aiGeneratePlan: (data) => api.post('/student/planner/ai-generate', data),

    // SRS (المراجعة المتكررة)
    submitDifficulty: (data) => api.post('/student/planner/srs/submit', data),
    getTodayReviews: () => api.get('/student/planner/srs/today'),
    getSRSStats: () => api.get('/student/planner/srs/stats'),

    // Gamification (الإنجازات)
    getGamification: () => api.get('/student/gamification'),
    getLeaderboard: (params) => api.get('/student/leaderboard', { params }),
};

// ─── Notification API ───
export const notificationAPI = {
    getMyNotifications: (limit = 20, offset = 0) => api.get(`/notifications?limit=${limit}&offset=${offset}`),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/mark-all-read'),
};
