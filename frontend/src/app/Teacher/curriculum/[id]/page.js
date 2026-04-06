'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { teacherAPI } from '@/lib/api';
import { getTrackLabel } from '@/lib/categories';
import Modal from '@/components/ui/Modal';
import { ArrowRight, StopCircle, Radio, BarChart, ShieldAlert, Edit2, ImagePlus, Plus, FolderOpen, Folder, Trash2, PlayCircle, PlusCircle, Video, GripVertical, Tv, Clock, Film, X, FileVideo, UploadCloud, CalendarClock, Ban, Send, Settings, AlertTriangle } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { EDUCATION_TYPES, STAGES, GRADES, TRACKS_BY_SYSTEM, getAvailableSubjects } from '@/lib/education_flow';

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} جيجابايت`;
}

export default function CurriculumManagePage() {
    const toast = useToast();
    const router = useRouter();
    const params = useParams();
    const confirm = useConfirm();
    const curriculumId = params.id;
    const fileInputRef = useRef(null);
    const thumbnailInputRef = useRef(null);

    const [curriculum, setCurriculum] = useState(null);
    const [sections, setSections] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Section state
    const [addingSectionTitle, setAddingSectionTitle] = useState('');
    const [showAddSection, setShowAddSection] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState(null);
    const [editingSectionTitle, setEditingSectionTitle] = useState('');

    // Lesson state
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [lessonFormMode, setLessonFormMode] = useState('add'); // 'add' or 'edit'
    const [lessonForm, setLessonForm] = useState({ id: null, title: '', description: '', videoFile: null, videoUrl: null });
    const [isSavingLesson, setIsSavingLesson] = useState(false);

    // New Advanced Upload States
    const [lessonUploadState, setLessonUploadState] = useState('idle'); // idle | uploading | success | error
    const [lessonUploadProgress, setLessonUploadProgress] = useState(0);
    const [lessonUploadStats, setLessonUploadStats] = useState({ uploadedBytes: 0, totalBytes: 0, speed: '0 MB/s' });
    const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
    const [uploadErrorMsg, setUploadErrorMsg] = useState('');

    // Publishing & Scheduling
    const [publishing, setPublishing] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');

    // Live Session state
    const [activeLiveSession, setActiveLiveSession] = useState(null);
    const [showLiveModal, setShowLiveModal] = useState(false);
    const [liveForm, setLiveForm] = useState({ title: '', description: '' });
    const [isManagingLive, setIsManagingLive] = useState(false);

    // Thumbnail state
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

    // Curriculum Edit State
    const [showEditCurriculumModal, setShowEditCurriculumModal] = useState(false);
    const [editCurriculumForm, setEditCurriculumForm] = useState(null);
    const [editCurriculumErrors, setEditCurriculumErrors] = useState({});
    const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);

    // Curriculum Delete State
    const [showDeleteCurriculumModal, setShowDeleteCurriculumModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeletingCurriculum, setIsDeletingCurriculum] = useState(false);

    useEffect(() => {
        fetchCurriculum();
    }, [curriculumId]);

    async function fetchCurriculum() {
        try {
            const [res, liveRes] = await Promise.all([
                teacherAPI.getCurriculumDetails(curriculumId),
                teacherAPI.getActiveLiveSession(curriculumId).catch(() => ({ data: { data: null } }))
            ]);
            
            const data = res.data?.data;
            setCurriculum(data);
            setActiveLiveSession(liveRes.data?.data || null);
            setThumbnailPreview(data?.thumbnail_url || data?.thumbnail || data?.cover_image || null);
            const secs = data?.sections || [];
            setSections(secs);
            if (secs.length > 0 && !selectedSectionId) {
                setSelectedSectionId(secs[0].id);
            }
        } catch (err) {
            toast.error('فشل تحميل بيانات المقرر.');
            router.push('/Teacher/upload-center');
        } finally {
            setLoading(false);
        }
    }

    const selectedSection = sections.find((s) => s.id === selectedSectionId);
    const lessons = selectedSection?.lessons || [];

    // ─── Section CRUD ────────────────────────
    const handleAddSection = async () => {
        if (!addingSectionTitle.trim()) return;
        try {
            const res = await teacherAPI.createSection(curriculumId, { title: addingSectionTitle.trim() });
            const newSection = res.data.data;
            setSections((prev) => [...prev, { ...newSection, lessons: [] }]);
            setSelectedSectionId(newSection.id);
            setAddingSectionTitle('');
            setShowAddSection(false);
            toast.success('تمت إضافة الوحدة.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إضافة الوحدة.');
        }
    };

    const handleEditSectionSave = async (sectionId) => {
        if (!editingSectionTitle.trim()) return;
        try {
            await teacherAPI.updateSection(curriculumId, sectionId, { title: editingSectionTitle.trim() });
            setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, title: editingSectionTitle.trim() } : s));
            setEditingSectionId(null);
            toast.success('تم تحديث الوحدة.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل تحديث الوحدة.');
        }
    };

    const handleDeleteSection = async (sectionId) => {
        const isConfirmed = await confirm({
            title: 'حذف الوحدة',
            message: 'هل تريد حذف هذه الوحدة وجميع دروسها؟ لا يمكن التراجع.'
        });
        if (!isConfirmed) return;
        try {
            await teacherAPI.deleteSection(curriculumId, sectionId);
            const remaining = sections.filter((s) => s.id !== sectionId);
            setSections(remaining);
            if (selectedSectionId === sectionId) {
                setSelectedSectionId(remaining.length > 0 ? remaining[0].id : null);
            }
            toast.success('تم حذف الوحدة.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل حذف الوحدة.');
        }
    };

    // ─── Lesson CRUD (Unified Flow) ─────────────────────────
    const handleOpenLessonModal = (mode = 'add', lesson = null) => {
        setLessonFormMode(mode);
        // Reset advanced upload states
        setLessonUploadState('idle');
        setLessonUploadProgress(0);
        setLessonUploadStats({ uploadedBytes: 0, totalBytes: 0, speed: '0 MB/s' });
        setUploadedVideoUrl(lesson?.video_url || null);
        setUploadErrorMsg('');

        if (mode === 'edit' && lesson) {
            setLessonForm({
                id: lesson.id,
                title: lesson.title || '',
                description: lesson.description || '',
                videoFile: null,
                videoUrl: lesson.video_url || null,
            });
            // If editing an existing lesson with a video, we consider it purely a metadata update unless they choose a new file
            setLessonUploadState('success'); 
        } else {
            setLessonForm({ id: null, title: '', description: '', videoFile: null, videoUrl: null });
        }
        setShowLessonModal(true);
    };

    const handleLessonVideoDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
        if (!file) return;
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        if (!validTypes.includes(file.type)) {
            toast.error('نوع ملف غير صالح. يرجى اختيار MP4 أو MOV أو AVI أو WebM.');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            setLessonUploadState('error');
            setUploadErrorMsg('حجم الفيديو كبير جدًا (الحد الأقصى 100 ميجابايت).');
            return;
        }
        
        setLessonForm(prev => ({ ...prev, videoFile: file }));
        if (!lessonForm.title) {
            setLessonForm(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
        }

        // START UPLOAD IMMEDIATELY
        setLessonUploadState('uploading');
        setLessonUploadProgress(0);
        setUploadErrorMsg('');
        const startTime = Date.now();

        try {
            const formData = new FormData();
            formData.append('video', file);

            const res = await teacherAPI.uploadLessonVideoMedia(curriculumId, formData, (evt) => {
                const percent = Math.round((evt.loaded * 100) / evt.total);
                setLessonUploadProgress(percent);

                // Calculate speed
                const timeElapsed = (Date.now() - startTime) / 1000; // seconds
                if (timeElapsed > 0) {
                    const speedBps = evt.loaded / timeElapsed;
                    const speedMbps = (speedBps / (1024 * 1024)).toFixed(1);
                    setLessonUploadStats({
                        uploadedBytes: evt.loaded,
                        totalBytes: evt.total,
                        speed: `${speedMbps} MB/s`
                    });
                }
            });

            setUploadedVideoUrl(res.data.data.video_url);
            setLessonUploadState('success');
            toast.success('تم رفع الفيديو بنجاح.');
        } catch (err) {
            console.error('Video upload error:', err);
            setLessonUploadState('error');
            setUploadErrorMsg(err.response?.data?.message || 'تعذر رفع الفيديو، يرجى المحاولة مرة أخرى.');
            toast.error('فشل رفع الفيديو.');
        }
    };

    const handleSaveLesson = async (e) => {
        if (e) e.preventDefault();
        if (!lessonForm.title.trim()) {
            toast.error('يرجى إدخال عنوان الدرس.');
            return;
        }
        
        // Disable submission if the video is still uploading, or hasn't started/failed
        if (lessonUploadState === 'uploading') {
            toast.error('يرجى الانتظار حتى يكتمل رفع الفيديو.');
            return;
        }
        if (lessonFormMode === 'add' && lessonUploadState !== 'success' && !uploadedVideoUrl) {
            toast.error('يرجى رفع فيديو الدرس أولاً بنجاح.');
            return;
        }

        setIsSavingLesson(true);

        try {
            if (lessonFormMode === 'add') {
                const dataToSubmit = {
                    title: lessonForm.title.trim(),
                    description: lessonForm.description?.trim() || null,
                    video_url: uploadedVideoUrl // Pass the pre-uploaded URL
                };

                const res = await teacherAPI.createLesson(curriculumId, selectedSectionId, dataToSubmit);

                setSections(prev => prev.map(s => 
                    s.id === selectedSectionId ? { ...s, lessons: [...(s.lessons || []), res.data.data] } : s
                ));
                toast.success('تم إنشاء الدرس بنجاح.');
            } else {
                let dataToSubmit;
                // If they uploaded a new video, `lessonForm.videoFile` is present, but actually we use uploadedVideoUrl
                if (lessonForm.videoFile && uploadedVideoUrl) {
                    dataToSubmit = {
                        title: lessonForm.title.trim(),
                        description: lessonForm.description?.trim() || null,
                        video_url: uploadedVideoUrl
                    };
                } else {
                    dataToSubmit = {
                        title: lessonForm.title.trim(),
                        description: lessonForm.description?.trim() || null
                    };
                }

                // Call updateLesson without formData and onProgress since it's decoupled now
                const res = await teacherAPI.updateLesson(curriculumId, selectedSectionId, lessonForm.id, dataToSubmit);

                setSections(prev => prev.map(s => 
                    s.id === selectedSectionId 
                        ? { ...s, lessons: (s.lessons || []).map(l => l.id === lessonForm.id ? res.data.data : l) }
                        : s
                ));
                toast.success('تم تحديث الدرس بنجاح.');
            }
            setShowLessonModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل حفظ الدرس.');
        } finally {
            setIsSavingLesson(false);
        }
    };

    const handleDeleteLesson = async (lessonId) => {
        const isConfirmed = await confirm({
            title: 'حذف الدرس',
            message: 'هل تريد حذف هذا الدرس؟'
        });
        if (!isConfirmed) return;
        try {
            await teacherAPI.deleteLesson(curriculumId, selectedSectionId, lessonId);
            setSections((prev) => prev.map((s) =>
                s.id === selectedSectionId
                    ? { ...s, lessons: (s.lessons || []).filter((l) => l.id !== lessonId) }
                    : s
            ));
            toast.success('تم حذف الدرس.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل حذف الدرس.');
        }
    };

    // ─── Thumbnail Upload ────────────────────────
    const handleThumbnailSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('صيغة الصورة غير مدعومة. يرجى استخدام JPG, PNG, أو WebP.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت.');
            return;
        }

        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
    };

    const handleThumbnailDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            // Re-use select logic via a synthesized event object
            handleThumbnailSelect({ target: { files: [file] } });
        }
    };

    const handleThumbnailSave = async () => {
        if (!thumbnailFile) return;
        setUploadingThumbnail(true);
        const formData = new FormData();
        formData.append('thumbnail', thumbnailFile);

        try {
            const res = await teacherAPI.uploadCurriculumThumbnail(curriculumId, formData);
            const newUrl = res.data.data.thumbnail_url;
            setCurriculum(prev => ({ ...prev, thumbnail_url: newUrl }));
            setThumbnailPreview(newUrl);
            setThumbnailFile(null);
            toast.success('تم حفظ صورة المقرر بنجاح.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل رفع الصورة.');
        } finally {
            setUploadingThumbnail(false);
        }
    };

    const handleThumbnailCancel = () => {
        setThumbnailFile(null);
        if (thumbnailPreview && thumbnailPreview !== curriculum?.thumbnail_url) {
            URL.revokeObjectURL(thumbnailPreview);
        }
        setThumbnailPreview(curriculum?.thumbnail_url || curriculum?.thumbnail || curriculum?.cover_image || null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            await teacherAPI.publishCurriculum(curriculumId);
            toast.success('تم نشر المقرر بنجاح! 🎉');
            setCurriculum((prev) => ({ ...prev, status: 'published', scheduled_publish_at: null }));
        } catch (err) {
            if (err.response?.data?.code === 'PAYMENT_SETUP_REQUIRED') {
                toast.error('يرجى إعداد طرق الدفع أولاً.');
                return;
            }
            toast.error(err.response?.data?.message || 'فشل نشر المقرر.');
        } finally {
            setPublishing(false);
        }
    };

    const handleSchedule = async () => {
        if (!scheduleDate) {
            toast.error('يرجى اختيار تاريخ ووقت صالحين.');
            return;
        }
        setPublishing(true);
        try {
            await teacherAPI.scheduleCurriculum(curriculumId, { scheduled_publish_at: scheduleDate });
            toast.success('تمت جدولة نشر المقرر بنجاح.');
            setCurriculum((prev) => ({ ...prev, status: 'scheduled', scheduled_publish_at: scheduleDate }));
            setShowScheduleModal(false);
            setScheduleDate('');
        } catch (err) {
            if (err.response?.data?.code === 'PAYMENT_SETUP_REQUIRED') {
                toast.error('يرجى إعداد طرق الدفع أولاً.');
                return;
            }
            toast.error(err.response?.data?.message || 'فشل جدولة النشر.');
        } finally {
            setPublishing(false);
        }
    };

    const handleSubmitForReview = async () => {
        const isConfirmed = await confirm({
            title: 'طلب مراجعة',
            message: 'هل أنت متأكد من إرسال هذا المقرر للمراجعة؟ سيقوم المشرفون بمراجعته قبل النشر.',
        });
        if (!isConfirmed) return;
        setPublishing(true);
        try {
            await teacherAPI.submitForReview(curriculumId);
            toast.success('تم إرسال المقرر للمراجعة بنجاح.');
            setCurriculum((prev) => ({ ...prev, status: 'in_review' }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إرسال المقرر للمراجعة.');
        } finally {
            setPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        const isConfirmed = await confirm({
            title: 'إلغاء النشر',
            message: 'هل أنت متأكد من إلغاء نشر (أو جدولة) هذا المقرر؟ سيعود كمسودة ولن يظهر للطلاب.',
        });
        if (!isConfirmed) return;
        setPublishing(true);
        try {
            await teacherAPI.unpublishCurriculum(curriculumId);
            toast.success('تم إلغاء النشر. المقرر الآن مسودة.');
            setCurriculum((prev) => ({ ...prev, status: 'draft', scheduled_publish_at: null }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إلغاء النشر.');
        } finally {
            setPublishing(false);
        }
    };

    // ─── Curriculum Edit & Delete ────────────────────────────
    const handleOpenEditCurriculumModal = () => {
        setEditCurriculumForm({
            title: curriculum.title || '',
            description: curriculum.description || '',
            education_type: curriculum.education_type || '',
            stage: curriculum.stage || '',
            grade_level: curriculum.grade_level || '',
            category: curriculum.category || '',
            subject: curriculum.subject || '',
            price: Number(curriculum.price) === 0 ? '' : curriculum.price,
            is_free_lesson: curriculum.is_free_lesson || false,
        });
        setEditCurriculumErrors({});
        setShowEditCurriculumModal(true);
    };

    const handleEditCurriculumChange = (e) => {
        setEditCurriculumForm({ ...editCurriculumForm, [e.target.name]: e.target.value });
        if (editCurriculumErrors[e.target.name]) {
            setEditCurriculumErrors({ ...editCurriculumErrors, [e.target.name]: '' });
        }
    };

    const handleEditCurriculumFreeLessonToggle = () => {
        setEditCurriculumForm((prev) => ({
            ...prev,
            is_free_lesson: !prev.is_free_lesson,
            price: !prev.is_free_lesson ? '0' : '',
        }));
    };

    const handleSaveCurriculum = async () => {
        const newErrors = {};
        if (!editCurriculumForm.title.trim()) newErrors.title = 'عنوان المقرر مطلوب';
        if (!editCurriculumForm.education_type) newErrors.education_type = 'نوع التعليم مطلوب';
        if (!editCurriculumForm.stage) newErrors.stage = 'المرحلة مطلوبة';
        if (!editCurriculumForm.grade_level) newErrors.grade_level = 'الصف الدراسي مطلوب';
        if (editCurriculumForm.stage === 'ثانوي' && !editCurriculumForm.category) newErrors.category = 'الشعبة مطلوبة';
        if (!editCurriculumForm.subject.trim()) newErrors.subject = 'المادة مطلوبة';
        if (!editCurriculumForm.is_free_lesson && (!editCurriculumForm.price || Number(editCurriculumForm.price) <= 0)) newErrors.price = 'السعر مطلوب';
        if (Object.keys(newErrors).length > 0) { setEditCurriculumErrors(newErrors); return; }

        setIsSavingCurriculum(true);
        try {
            const payload = { ...editCurriculumForm, price: editCurriculumForm.is_free_lesson ? 0 : Number(editCurriculumForm.price) };
            const res = await teacherAPI.updateCurriculum(curriculumId, payload);
            setCurriculum(res.data.data);
            toast.success('تم تحديث إعدادات المقرر بنجاح.');
            setShowEditCurriculumModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل تحديث المقرر.');
        } finally {
            setIsSavingCurriculum(false);
        }
    };

    const handleOpenDeleteModal = () => {
        setDeleteConfirmText('');
        setShowDeleteCurriculumModal(true);
    };

    const handleDeleteCurriculum = async () => {
        if (deleteConfirmText !== 'DELETE') {
            toast.error('الرجاء كتابة كلمة DELETE بشكل صحيح لتأكيد الحذف.');
            return;
        }
        setIsDeletingCurriculum(true);
        try {
            await teacherAPI.deleteCurriculum(curriculumId);
            toast.success('تم حذف المقرر (نقل للأرشيف) بنجاح.');
            setShowDeleteCurriculumModal(false);
            router.push('/Teacher/upload-center');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل حذف المقرر.');
            setIsDeletingCurriculum(false);
        }
    };

    // ─── Live Session ────────────────────────────
    const handleStartLive = async (e) => {
        e.preventDefault();
        if (!liveForm.title.trim()) {
            toast.error('يرجى إدخال عنوان البث');
            return;
        }
        setIsManagingLive(true);
        try {
            const res = await teacherAPI.startLiveSession(curriculumId, liveForm);
            setActiveLiveSession(res.data.data);
            setShowLiveModal(false);
            setLiveForm({ title: '', description: '' });
            toast.success('تم بدء البث المباشر وإشعار الطلاب بنجاح 🎉');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل بدء البث');
        } finally {
            setIsManagingLive(false);
        }
    };

    const handleEndLive = async () => {
        if (!activeLiveSession) return;
        const isConfirmed = await confirm({
            title: 'إنهاء البث',
            message: 'هل أنت متأكد من رغبتك في إنهاء البث المباشر الحالي؟ لن يتمكن الطلاب من الدخول إليه بعد الآن.',
        });
        if (!isConfirmed) return;
        
        setIsManagingLive(true);
        try {
            await teacherAPI.endLiveSession(curriculumId, activeLiveSession.id);
            setActiveLiveSession(null);
            toast.success('تم إنهاء البث المباشر بنجاح');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إنهاء البث');
        } finally {
            setIsManagingLive(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const totalLessons = sections.reduce((acc, s) => acc + (s.lessons || []).length, 0);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <button
                        onClick={() => router.push('/Teacher/upload-center')}
                        className="text-sm text-slate-400 hover:text-primary mb-2 flex items-center gap-1 transition-colors"
                    >
                        <ArrowRight className="w-4 h-4" />
                        العودة للمقررات
                    </button>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{curriculum?.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                        <span className="font-mono text-primary font-bold">{curriculum?.course_code}</span>
                        <span>•</span>
                        <span>{[curriculum?.subject, curriculum?.grade_level, curriculum?.category ? getTrackLabel(curriculum?.category) : null].filter(Boolean).join(' • ')}</span>
                        {curriculum?.status === 'published' && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">منشور</span>
                        )}
                        {curriculum?.status === 'scheduled' && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                                مجدول ({new Date(curriculum.scheduled_publish_at).toLocaleDateString('ar-EG')})
                            </span>
                        )}
                        {curriculum?.status === 'in_review' && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700">قيد المراجعة</span>
                        )}
                        {curriculum?.status === 'archived' && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">مؤرشف</span>
                        )}
                        {curriculum?.status === 'draft' && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">مسودة</span>
                        )}
                        {activeLiveSession && (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 animate-pulse border border-red-200">
                                <span className="size-1.5 rounded-full bg-red-500"></span>
                                بث مباشر: {activeLiveSession.title}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    {curriculum?.userRole === 'owner' && (
                        <>
                            {activeLiveSession ? (
                                <button
                                    onClick={handleEndLive}
                                    disabled={isManagingLive}
                                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    <StopCircle className="w-4 h-4" />
                                    {isManagingLive ? '...إنهاء' : 'إنهاء البث'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowLiveModal(true)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Radio className="w-4 h-4" />
                                    بدء بث مباشر
                                </button>
                            )}
                            <Link
                                href={`/Teacher/curriculum/${curriculumId}/dashboard`}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <BarChart className="w-4 h-4" />
                                لوحة المتابعة
                            </Link>
                        </>
                    )}
                    <Link
                        href={`/Teacher/curriculum/${curriculumId}/admins`}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <ShieldAlert className="w-4 h-4" /> المشرفين
                    </Link>
                    {/* Edit Curriculum Button */}
                    {(curriculum?.userRole === 'owner' || curriculum?.userPermissions?.includes('edit_lessons')) && (
                        <button
                            onClick={handleOpenEditCurriculumModal}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" /> إعدادات المقرر
                        </button>
                    )}
                    {/* Delete Curriculum Button */}
                    {curriculum?.userRole === 'owner' && (
                        <button
                            onClick={handleOpenDeleteModal}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" /> حذف المقرر
                        </button>
                    )}

                    {/* Dynamic Publishing Actions */}
                    {['published', 'scheduled', 'in_review'].includes(curriculum?.status) ? (
                        <button
                            onClick={handleUnpublish}
                            disabled={publishing}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Ban className="w-4 h-4" />
                            {publishing ? '...' : (curriculum?.status === 'published' ? 'إلغاء النشر' : 'إلغاء الطلب/الجدولة')}
                        </button>
                    ) : (
                        <div className="flex gap-2 relative group pb-2 -mb-2">
                            {/* Schedule Publish Button */}
                            <button
                                onClick={() => setShowScheduleModal(true)}
                                disabled={publishing || totalLessons === 0}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <CalendarClock className="w-4 h-4" />
                                جدولة
                            </button>

                            {/* Options Dropdown Trigger & Primary Publish */}
                            <div className="relative">
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing || totalLessons === 0}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {publishing ? 'جارٍ النشر...' : 'نشر الآن'}
                                </button>
                                
                                {/* Hover Dropdown for "Submit for Review" (Optional step if school/platform requires review) */}
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <button 
                                        onClick={handleSubmitForReview}
                                        disabled={publishing || totalLessons === 0}
                                        className="w-full text-right px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-2 rounded-xl"
                                    >
                                        <Send className="w-4 h-4" />
                                        طلب مراجعة
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ─── Sidebar: Sections & Thumbnail ─────────────── */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                    {/* Thumbnail Card */}
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700">صورة المقرر</h3>
                        </div>
                        <div className="p-4">
                            <input 
                                type="file" 
                                ref={thumbnailInputRef} 
                                className="hidden" 
                                accept="image/jpeg,image/png,image/webp" 
                                onChange={handleThumbnailSelect} 
                            />
                            
                            <div 
                                onClick={() => thumbnailInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleThumbnailDrop}
                                className={`relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group ${!thumbnailPreview ? 'border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-primary/50' : 'bg-slate-100 ring-1 ring-slate-200'} transition-all flex flex-col items-center justify-center`}
                            >
                                {thumbnailPreview ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Edit2 className="w-8 h-8 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <ImagePlus className="w-6 h-6 text-slate-500" />
                                        </div>
                                        <p className="text-xs font-medium text-slate-500">اضغط أو اسحب صورة هنا</p>
                                        <p className="text-[10px] text-slate-400 mt-1">16:9 • JPG, PNG, WebP</p>
                                    </>
                                )}
                            </div>

                            {thumbnailFile && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                    <button 
                                        onClick={handleThumbnailSave} 
                                        disabled={uploadingThumbnail}
                                        className="flex-1 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {uploadingThumbnail ? 'جارٍ الحفظ...' : 'حفظ'}
                                    </button>
                                    <button 
                                        onClick={handleThumbnailCancel}
                                        disabled={uploadingThumbnail} 
                                        className="flex-1 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sections Card */}
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] overflow-hidden sticky top-24">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700">الوحدات ({sections.length})</h3>
                            <button
                                onClick={() => setShowAddSection(true)}
                                className="text-primary hover:bg-primary/5 rounded-lg p-1 transition-colors"
                                title="إضافة وحدة"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            {showAddSection && (
                                <div className="p-3 border-b border-slate-100 bg-primary/5">
                                    <input
                                        type="text" value={addingSectionTitle}
                                        onChange={(e) => setAddingSectionTitle(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowAddSection(false); }}
                                        placeholder="اسم الوحدة..."
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-primary/30 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={handleAddSection} className="flex-1 py-1.5 text-xs font-bold bg-primary text-white rounded-lg">إضافة</button>
                                        <button onClick={() => setShowAddSection(false)} className="flex-1 py-1.5 text-xs font-bold border border-slate-200 rounded-lg">إلغاء</button>
                                    </div>
                                </div>
                            )}

                            {sections.length === 0 && !showAddSection && (
                                <div className="p-6 text-center text-slate-400 text-sm">
                                    <FolderOpen className="w-8 h-8 mb-2 block" />
                                    <p>لا توجد وحدات. أضف وحدة جديدة.</p>
                                </div>
                            )}

                            {sections.map((section) => (
                                <div
                                    key={section.id}
                                    className={`px-4 py-3 cursor-pointer border-b border-slate-50 transition-colors group ${selectedSectionId === section.id ? 'bg-primary/5 border-s-2 border-s-primary' : 'hover:bg-slate-50'}`}
                                    onClick={() => setSelectedSectionId(section.id)}
                                >
                                    {editingSectionId === section.id ? (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text" value={editingSectionTitle}
                                                onChange={(e) => setEditingSectionTitle(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleEditSectionSave(section.id); if (e.key === 'Escape') setEditingSectionId(null); }}
                                                className="w-full px-2 py-1 text-sm rounded border border-primary bg-white"
                                                autoFocus
                                            />
                                            <div className="flex gap-1 mt-1">
                                                <button onClick={() => handleEditSectionSave(section.id)} className="text-xs text-primary font-bold">حفظ</button>
                                                <button onClick={() => setEditingSectionId(null)} className="text-xs text-slate-400">إلغاء</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Folder className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm font-medium text-slate-800 truncate">{section.title}</span>
                                                <span className="text-xs text-slate-400">({(section.lessons || []).length})</span>
                                            </div>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title); }} className="p-1 text-slate-400 hover:text-primary">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteSection(section.id)} className="p-1 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Main: Lessons ──────────────────── */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    {selectedSectionId ? (
                        <>
                            {/* Lessons List Header */}
                            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] mb-6 flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <PlayCircle className="w-6 h-6 text-primary" />
                                        دروس: {selectedSection?.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">المجموع: {lessons.length} درس</p>
                                </div>
                                <button
                                    onClick={() => handleOpenLessonModal('add')}
                                    className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-primary/20"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                    إضافة درس جديد
                                </button>
                            </div>

                            {/* Lesson List */}
                            {lessons.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <Video className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 mb-2">لا توجد دروس بانتظارك!</p>
                                    <p className="text-sm">انقر على "إضافة درس جديد" للبدء برفع فيديو وإنشاء الدرس.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {lessons.map((lesson, index) => (
                                        <div
                                            key={lesson.id}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-primary/30 hover:shadow-sm transition-all group"
                                        >
                                            <GripVertical className="w-5 h-5 text-slate-300 cursor-grab hover:text-primary transition-colors" />
                                            <div className="w-16 h-12 rounded-lg bg-slate-50 relative overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
                                                {lesson.type === 'live' ? <Tv className="w-6 h-6 text-primary" /> : <PlayCircle className="w-6 h-6 text-primary" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate mb-1">
                                                    {String(index + 1).padStart(2, '0')}. {lesson.title}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {lesson.type === 'live' ? 'بث مباشر' : 'فيديو'}</span>
                                                    {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lesson.duration}</span>}
                                                    {lesson.file_size && <span className="flex items-center gap-1"><Folder className="w-3.5 h-3.5" /> {formatFileSize(lesson.file_size)}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenLessonModal('edit', lesson)}
                                                    className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    تعديل
                                                </button>
                                                <span className="w-px h-4 bg-slate-200" />
                                                <button
                                                    onClick={() => handleDeleteLesson(lesson.id)}
                                                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    حذف
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white rounded-2xl p-12 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] text-center">
                            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                <FolderOpen className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">ابدأ بإضافة وحدة</h3>
                            <p className="text-slate-500 mb-6">أنشئ وحدة (باب) ثم أضف دروساً بداخلها.</p>
                            <button
                                onClick={() => setShowAddSection(true)}
                                className="px-8 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                            >
                                إضافة وحدة جديدة
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Create / Edit Lesson Modal */}
            <Modal isOpen={showLessonModal} onClose={() => !isSavingLesson && setShowLessonModal(false)} title={lessonFormMode === 'add' ? 'إضافة درس جديد' : 'تعديل الدرس'}>
                <form onSubmit={handleSaveLesson} className="space-y-5">
                    {/* Video Upload Zone */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            فيديو الدرس {lessonFormMode === 'add' && <span className="text-red-500">*</span>}
                        </label>
                        
                        <input
                            ref={fileInputRef} type="file"
                            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                            onChange={(e) => { handleLessonVideoDrop(e); e.target.value = ''; }}
                            className="hidden"
                            disabled={lessonUploadState === 'uploading' || isSavingLesson}
                        />

                        {lessonUploadState === 'uploading' ? (
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 animate-pulse">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <UploadCloud className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800" dir="ltr">{lessonForm.videoFile?.name || 'جاري الرفع...'}</p>
                                            <p className="text-xs text-primary font-medium mt-0.5">
                                                سرعة الرفع: <span dir="ltr">{lessonUploadStats.speed}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-primary">{lessonUploadProgress}%</span>
                                </div>
                                <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300 relative" style={{ width: `${lessonUploadProgress}%` }}>
                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_1.5s_infinite]" />
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2 text-[11px] font-bold text-slate-500">
                                    <span>{formatFileSize(lessonUploadStats.uploadedBytes)} مرفوع</span>
                                    <span>الإجمالي {formatFileSize(lessonUploadStats.totalBytes)}</span>
                                </div>
                            </div>
                        ) : lessonUploadState === 'success' && uploadedVideoUrl ? (
                            <div className="relative rounded-2xl border border-green-500/30 bg-green-50/50 p-5 flex items-center justify-between group transition-all">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0 text-green-600 shadow-sm border border-green-200">
                                        <FileVideo className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate mb-0.5" dir="ltr">{lessonForm.videoFile?.name || 'تم رفع الفيديو سابقاً'}</p>
                                        <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                                             جاهز للإنشاء
                                        </p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => { setUploadedVideoUrl(null); setLessonUploadState('idle'); setLessonForm(p => ({...p, videoFile: null})); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors border border-transparent hover:border-red-200">
                                    استبدال
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleLessonVideoDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group ${lessonUploadState === 'error' ? 'border-red-300 bg-red-50/30 hover:bg-red-50/50' : 'border-slate-300 hover:border-primary/50 hover:bg-primary/5 bg-slate-50/50'}`}
                                >
                                    <div className={`size-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 shadow-sm ${lessonUploadState === 'error' ? 'bg-red-100/50 text-red-500 shadow-red-500/10' : 'bg-white text-primary shadow-primary/10 border border-slate-100'}`}>
                                        <UploadCloud className="w-7 h-7" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">اسحب الفيديو أو <span className="text-primary hover:underline underline-offset-4">تصفح ملفاتك</span></p>
                                    <p className="text-xs text-slate-500 font-medium mt-2">MP4, MOV, AVI, WebM (بحد أقصى 100MB)</p>
                                </div>
                                {lessonUploadState === 'error' && (
                                    <p className="mt-3 text-sm font-bold text-red-500 flex items-center gap-1.5 px-1 animate-in fade-in slide-in-from-top-1">
                                        <AlertTriangle className="w-4 h-4 shrink-0" /> {uploadErrorMsg}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Meta Fields */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">عنوان الدرس <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={lessonForm.title}
                            onChange={(e) => setLessonForm(prev => ({...prev, title: e.target.value}))}
                            placeholder="مثال: مقدمة في المعادلات التفاضلية"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            disabled={isSavingLesson}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">الوصف (اختياري)</label>
                        <textarea
                            value={lessonForm.description}
                            onChange={(e) => setLessonForm(prev => ({...prev, description: e.target.value}))}
                            placeholder="نبذة مختصرة عن محتوى الدرس..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm h-24 resize-none"
                            disabled={isSavingLesson}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowLessonModal(false)}
                            disabled={isSavingLesson}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSavingLesson || (!lessonForm.title.trim()) || (lessonFormMode === 'add' && !lessonForm.videoFile)}
                            className="px-6 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSavingLesson ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : lessonFormMode === 'add' ? 'إنشاء الدرس' : 'حفظ التعديلات'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Go Live Modal */}
            <Modal isOpen={showLiveModal} onClose={() => !isManagingLive && setShowLiveModal(false)} title="بدء بث مباشر">
                <form onSubmit={handleStartLive} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            عنوان البث <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={liveForm.title}
                            onChange={(e) => setLiveForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="مثال: مراجعة الوحدة الأولى"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                            disabled={isManagingLive}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">وصف تنبيه (اختياري)</label>
                        <textarea
                            value={liveForm.description}
                            onChange={(e) => setLiveForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="ملاحظات للطلاب قبل الدخول..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm h-20 resize-none"
                            disabled={isManagingLive}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowLiveModal(false)}
                            disabled={isManagingLive}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isManagingLive || !liveForm.title.trim()}
                            className="px-6 py-2.5 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            {isManagingLive ? 'جاري البدء...' : 'بدء البث وإرسال إشعار'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Schedule Modal */}
            <Modal isOpen={showScheduleModal} onClose={() => !publishing && setShowScheduleModal(false)} title="جدولة نشر المقرر">
                <div className="space-y-4 p-2">
                    <p className="text-sm text-slate-600 mb-4">اختر التاريخ والوقت الذي سيتم فيه نشر المقرر تلقائياً للطلاب.</p>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ ووقت النشر</label>
                        <input
                            type="datetime-local"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            min={new Date().toISOString().slice(0, 16)}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            onClick={() => setShowScheduleModal(false)}
                            disabled={publishing}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSchedule}
                            disabled={publishing || !scheduleDate}
                            className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <CalendarClock className="w-4 h-4" />
                            تأكيد الجدولة
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Curriculum Modal */}
            <Modal isOpen={showEditCurriculumModal} onClose={() => !isSavingCurriculum && setShowEditCurriculumModal(false)} title="إعدادات المقرر" size="lg">
                {editCurriculumForm && (
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">اسم المقرر</label>
                            <input
                                name="title" type="text" value={editCurriculumForm.title} onChange={handleEditCurriculumChange}
                                placeholder="مثال: الفيزياء - الصف الثالث الثانوي"
                                className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${editCurriculumErrors.title ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                            />
                            {editCurriculumErrors.title && <p className="text-red-500 text-xs mt-1">{editCurriculumErrors.title}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">الوصف (اختياري)</label>
                            <textarea
                                name="description" value={editCurriculumForm.description} onChange={handleEditCurriculumChange}
                                placeholder="وصف موجز للمقرر..."
                                rows={3}
                                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-3 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-slate-700">نوع التعليم</label>
                                <select
                                    name="education_type" value={editCurriculumForm.education_type}
                                    onChange={(e) => {
                                        setEditCurriculumForm({ ...editCurriculumForm, education_type: e.target.value, stage: '', grade_level: '', category: '', subject: '' });
                                        setEditCurriculumErrors(prev => ({ ...prev, education_type: '' }));
                                    }}
                                    className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${editCurriculumErrors.education_type ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                >
                                    <option value="">اختر نوع التعليم...</option>
                                    {EDUCATION_TYPES.map((type) => (
                                        <option key={type.id} value={type.id}>{type.label}</option>
                                    ))}
                                </select>
                                {editCurriculumErrors.education_type && <p className="text-red-500 text-xs mt-1">{editCurriculumErrors.education_type}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-slate-700">المرحلة</label>
                                <select
                                    name="stage" value={editCurriculumForm.stage}
                                    onChange={(e) => {
                                        setEditCurriculumForm({ ...editCurriculumForm, stage: e.target.value, grade_level: '', category: '', subject: '' });
                                        setEditCurriculumErrors(prev => ({ ...prev, stage: '' }));
                                    }}
                                    disabled={!editCurriculumForm.education_type}
                                    className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:opacity-50 ${editCurriculumErrors.stage ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                >
                                    <option value="">{editCurriculumForm.education_type ? 'اختر المرحلة...' : 'اختر نوع التعليم أولاً'}</option>
                                    {STAGES.map((stage) => (
                                        <option key={stage.id} value={stage.id}>{stage.label}</option>
                                    ))}
                                </select>
                                {editCurriculumErrors.stage && <p className="text-red-500 text-xs mt-1">{editCurriculumErrors.stage}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-slate-700">الصف الدراسي</label>
                                <select
                                    name="grade_level" value={editCurriculumForm.grade_level}
                                    onChange={(e) => {
                                        setEditCurriculumForm({ ...editCurriculumForm, grade_level: e.target.value, category: '', subject: '' });
                                        setEditCurriculumErrors(prev => ({ ...prev, grade_level: '' }));
                                    }}
                                    disabled={!editCurriculumForm.stage}
                                    className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:opacity-50 ${editCurriculumErrors.grade_level ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                >
                                    <option value="">{editCurriculumForm.stage ? 'اختر الصف...' : 'اختر المرحلة أولاً'}</option>
                                    {(GRADES[editCurriculumForm.stage] || []).map((grade) => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>
                                {editCurriculumErrors.grade_level && <p className="text-red-500 text-xs mt-1">{editCurriculumErrors.grade_level}</p>}
                            </div>
                            
                            {editCurriculumForm.stage === 'ثانوي' && (
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-slate-700">الشعبة / المسار</label>
                                    <select
                                        name="category" value={editCurriculumForm.category}
                                        onChange={(e) => {
                                            setEditCurriculumForm({ ...editCurriculumForm, category: e.target.value, subject: '' });
                                            setEditCurriculumErrors(prev => ({ ...prev, category: '' }));
                                        }}
                                        className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${editCurriculumErrors.category ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                    >
                                        <option value="">اختر الشعبة...</option>
                                        {(TRACKS_BY_SYSTEM[editCurriculumForm.education_type] || []).map((track) => (
                                            <option key={track.id} value={track.id}>{track.label}</option>
                                        ))}
                                    </select>
                                    {editCurriculumErrors.category && <p className="text-red-500 text-xs mt-1">{editCurriculumErrors.category}</p>}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">المادة الدراسية</label>
                            <select
                                name="subject" value={editCurriculumForm.subject} onChange={handleEditCurriculumChange}
                                disabled={!editCurriculumForm.stage || (editCurriculumForm.stage === 'ثانوي' && !editCurriculumForm.category)}
                                className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:opacity-50 ${editCurriculumErrors.subject ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                            >
                                <option value="">{editCurriculumForm.stage ? (editCurriculumForm.stage === 'ثانوي' && !editCurriculumForm.category ? 'اختر الشعبة أولاً' : 'اختر المادة...') : 'اختر المرحلة أولاً'}</option>
                                {getAvailableSubjects(editCurriculumForm.education_type, editCurriculumForm.stage, editCurriculumForm.category).map((subj) => (
                                    <option key={subj} value={subj}>{subj}</option>
                                ))}
                            </select>
                            {editCurriculumErrors.subject && <p className="text-red-500 text-xs mt-1">{editCurriculumErrors.subject}</p>}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">مقرر مجاني</p>
                                    <p className="text-xs text-slate-500 mt-1">عند التفعيل سيتم ضبط السعر إلى 0.</p>
                                </div>
                                <button
                                    type="button" onClick={handleEditCurriculumFreeLessonToggle}
                                    aria-pressed={editCurriculumForm.is_free_lesson}
                                    className={`relative h-7 w-12 rounded-full transition-colors ${editCurriculumForm.is_free_lesson ? 'bg-primary' : 'bg-slate-300'}`}
                                >
                                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${editCurriculumForm.is_free_lesson ? 'right-1' : 'right-6'}`} />
                                </button>
                            </div>
                        </div>

                        {!editCurriculumForm.is_free_lesson && (
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-slate-700">السعر (جنيه مصري)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">ج.م</span>
                                    <input
                                        name="price" type="number" min="0" value={editCurriculumForm.price} onChange={handleEditCurriculumChange}
                                        placeholder="150"
                                        className={`w-full ps-12 rounded-lg border bg-white px-3 py-3 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${editCurriculumErrors.price ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                    />
                                </div>
                                {editCurriculumErrors.price && <p className="text-red-500 text-xs mt-1">{editCurriculumErrors.price}</p>}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setShowEditCurriculumModal(false)}
                                disabled={isSavingCurriculum}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSaveCurriculum}
                                disabled={isSavingCurriculum}
                                className="px-6 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSavingCurriculum ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Curriculum Modal */}
            <Modal isOpen={showDeleteCurriculumModal} onClose={() => !isDeletingCurriculum && setShowDeleteCurriculumModal(false)} title="حذف المقرر بالكامل">
                <div className="p-2 space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4 text-red-700">
                        <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-sm mb-1">تحذير! هذا الإجراء لا يمكن التراجع عنه.</h4>
                            <p className="text-sm opacity-90 leading-relaxed">
                                سيتم إيقاف هذا المقرر ونقله للأرشيف وسوف يتم وقفه عن الظهور في صفحة المقررات، ولكن سيظل بإمكان الطلاب المسجلين الوصول للمحتوى الخاص بهم.
                            </p>
                        </div>
                    </div>
                    <div className="pt-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            للتأكيد، يرجى كتابة <span className="text-red-600 font-black">DELETE</span> أدناه:
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-bold text-center uppercase"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                        <button
                            onClick={() => setShowDeleteCurriculumModal(false)}
                            disabled={isDeletingCurriculum}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleDeleteCurriculum}
                            disabled={isDeletingCurriculum || deleteConfirmText !== 'DELETE'}
                            className="px-6 py-2.5 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            {isDeletingCurriculum ? 'جاري الحذف...' : 'حذف نهائياً'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
