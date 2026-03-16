'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { instructorAPI } from '@/lib/api';
import { courseSchema, validateForm } from '@/lib/validators';

const CATEGORIES = [
    'High Intensity Interval Training',
    'Yoga & Flexibility',
    'Strength Training',
    'Nutrition Coaching',
];

const STEPS = ['Details', 'Curriculum', 'Pricing', 'Review'];

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function UploadCenterPage() {
    const toast = useToast();
    const router = useRouter();
    const fileInputRef = useRef(null);

    // ─── Step State ────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState(0);

    // ─── Course State ──────────────────────────────────────────────
    const [course, setCourse] = useState({
        title: '', description: '', subject: CATEGORIES[0], category: '', price: '',
    });
    const [courseId, setCourseId] = useState(null);
    const [courseCode, setCourseCode] = useState(null);
    const [errors, setErrors] = useState({});

    // ─── Lessons State ─────────────────────────────────────────────
    const [lessons, setLessons] = useState([]);
    const [uploading, setUploading] = useState([]);  // { file, progress, status, name }
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    // ─── Status Checks ─────────────────────────────────────────────
    const [paymentVerified, setPaymentVerified] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // ─── Check Payment on Mount ────────────────────────────────────
    useEffect(() => {
        async function bootstrapUploadCenter() {
            try {
                const [statusRes, coursesRes] = await Promise.all([
                    instructorAPI.getProfileStatus(),
                    instructorAPI.getInstructorCourses(),
                ]);

                setPaymentVerified(statusRes.data?.data?.paymentComplete || false);

                const courses = coursesRes.data?.data || [];
                if (courses.length > 0) {
                    const draftCourse = courses.find((item) => item.status === 'draft') || courses[0];
                    const courseRes = await instructorAPI.getCourseWithLessons(draftCourse.id);
                    const existingCourse = courseRes.data?.data;

                    if (existingCourse) {
                        setCourseId(existingCourse.id);
                        setCourseCode(existingCourse.course_code);
                        setCourse({
                            title: existingCourse.title || '',
                            description: existingCourse.description || '',
                            subject: existingCourse.subject || CATEGORIES[0],
                            category: existingCourse.category || '',
                            price: existingCourse.price || '',
                        });
                        setLessons(existingCourse.contents || []);

                        if ((existingCourse.contents || []).length > 0) {
                            setCurrentStep(1);
                        }
                    }
                }
            } catch {
                // Intentionally silent on initial load.
            } finally {
                setInitializing(false);
            }
        }

        bootstrapUploadCenter();
    }, []);

    // ─── Course Form Handlers ──────────────────────────────────────
    const handleCourseChange = (e) => {
        setCourse({ ...course, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
    };

    // ─── Step 1 → Save Course Details ──────────────────────────────
    const handleSaveCourseDetails = async () => {
        const validation = validateForm(courseSchema, course);
        if (!validation.success) {
            setErrors(validation.errors);
            return;
        }

        setSaving(true);
        try {
            if (courseId) {
                // Update existing course
                await instructorAPI.updateCourse(courseId, course);
                toast.success('Course details updated!');
            } else {
                // Create new course
                const res = await instructorAPI.createCourse(course);
                setCourseId(res.data.data.id);
                setCourseCode(res.data.data.course_code);
                toast.success(`Course ${res.data.data.course_code} created!`);
            }
            setCurrentStep(1); // Go to Curriculum
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save course.');
        } finally {
            setSaving(false);
        }
    };

    // ─── File Upload Handlers ──────────────────────────────────────
    const handleFiles = useCallback(async (files) => {
        if (!courseId) {
            toast.error('Please save Course Details first (Step 1).');
            return;
        }

        const fileArray = Array.from(files);
        const validFiles = fileArray.filter((f) => {
            const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
            if (!validTypes.includes(f.type)) {
                toast.error(`${f.name}: Invalid file type. Only MP4, MOV, AVI, WebM allowed.`);
                return false;
            }
            if (f.size > 100 * 1024 * 1024) {
                toast.error(`${f.name}: File too large. Max 100MB.`);
                return false;
            }
            return true;
        });

        for (const file of validFiles) {
            const uploadId = Date.now() + Math.random();
            const uploadItem = { id: uploadId, name: file.name, progress: 0, status: 'uploading' };

            setUploading((prev) => [...prev, uploadItem]);

            const formData = new FormData();
            formData.append('video', file);

            try {
                const res = await instructorAPI.uploadVideo(courseId, formData, (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploading((prev) =>
                        prev.map((u) => u.id === uploadId ? { ...u, progress: percent } : u)
                    );
                });

                // Mark upload complete
                setUploading((prev) =>
                    prev.map((u) => u.id === uploadId ? { ...u, progress: 100, status: 'complete' } : u)
                );

                // Add to lessons list
                setLessons((prev) => [...prev, res.data.data]);

                // Remove from uploads after a delay
                setTimeout(() => {
                    setUploading((prev) => prev.filter((u) => u.id !== uploadId));
                }, 3000);

            } catch (err) {
                setUploading((prev) =>
                    prev.map((u) => u.id === uploadId ? { ...u, status: 'error', progress: 0 } : u)
                );
                toast.error(err.response?.data?.message || `Failed to upload ${file.name}`);

                setTimeout(() => {
                    setUploading((prev) => prev.filter((u) => u.id !== uploadId));
                }, 5000);
            }
        }
    }, [courseId, toast]);

    const handleDrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    const handleBrowse = () => {
        fileInputRef.current?.click();
    };

    const handleFileInput = (e) => {
        if (e.target.files?.length) {
            handleFiles(e.target.files);
            e.target.value = ''; // Reset
        }
    };

    // ─── Lesson CRUD ───────────────────────────────────────────────
    const handleDeleteLesson = async (contentId) => {
        if (!confirm('Delete this lesson? This cannot be undone.')) return;
        try {
            await instructorAPI.deleteContent(courseId, contentId);
            setLessons((prev) => prev.filter((l) => l.id !== contentId));
            toast.success('Lesson deleted.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete lesson.');
        }
    };

    const handleEditStart = (lesson) => {
        setEditingId(lesson.id);
        setEditTitle(lesson.title);
    };

    const handleEditSave = async (contentId) => {
        if (!editTitle.trim()) return;
        try {
            await instructorAPI.updateContent(courseId, contentId, { title: editTitle });
            setLessons((prev) =>
                prev.map((l) => l.id === contentId ? { ...l, title: editTitle } : l)
            );
            setEditingId(null);
            toast.success('Lesson updated.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update lesson.');
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditTitle('');
    };

    // ─── Publish ───────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!courseId) {
            toast.error('Please create the course first.');
            return;
        }
        if (lessons.length === 0) {
            toast.error('Please add at least one lesson before publishing.');
            return;
        }
        if (!paymentVerified) {
            setPaymentModalOpen(true);
            return;
        }

        setPublishing(true);
        try {
            await instructorAPI.publishCourse(courseId);
            toast.success('Course published successfully! 🎉');
            setCurrentStep(3); // Move to Review step
        } catch (err) {
            if (err.response?.data?.code === 'PAYMENT_SETUP_REQUIRED') {
                setPaymentModalOpen(true);
                return;
            }
            toast.error(err.response?.data?.message || 'Failed to publish course.');
        } finally {
            setPublishing(false);
        }
    };

    // ─── Save Draft ────────────────────────────────────────────────
    const handleSaveDraft = async () => {
        if (!courseId) {
            // Save as new course
            await handleSaveCourseDetails();
        } else {
            try {
                await instructorAPI.updateCourse(courseId, course);
                toast.success('Draft saved successfully.');
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to save draft.');
            }
        }
    };

    // ─── Computed ──────────────────────────────────────────────────
    const videoQualityOk = lessons.length > 0;
    const reviewReady = lessons.length >= 2;

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create New Course</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Design and publish your professional fitness program.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSaveDraft}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={initializing || publishing || !courseId || lessons.length === 0}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                    >
                        {publishing ? 'Publishing...' : 'Publish Course'}
                    </button>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="mb-10">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
                    {STEPS.map((step, i) => (
                        <div key={step} className="relative z-10 flex flex-col items-center">
                            <button
                                onClick={() => {
                                    if (i === 0 || courseId) setCurrentStep(i);
                                }}
                                className={`size-10 rounded-full flex items-center justify-center font-bold ring-4 ring-background-light dark:ring-background-dark transition-colors ${i <= currentStep
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                    }`}
                            >
                                {i + 1}
                            </button>
                            <span className={`text-xs font-bold mt-2 ${i <= currentStep ? 'text-primary' : 'text-slate-400'
                                }`}>
                                {step}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {courseCode && (
                <div className="mb-6 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm font-bold text-primary">
                        Course ID: <span className="font-mono">{courseCode}</span>
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-8">

                    {/* ─── Step 1: Course Information ─────────── */}
                    {currentStep === 0 && (
                        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">info</span>
                                Course Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Course Title</label>
                                    <input
                                        name="title"
                                        type="text"
                                        value={course.title}
                                        onChange={handleCourseChange}
                                        placeholder="e.g. 30 Day HIIT Mastery"
                                        className={`w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-primary focus:ring-primary ${errors.title ? 'border-red-400' : ''}`}
                                    />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Description</label>
                                    <textarea
                                        name="description"
                                        value={course.description}
                                        onChange={handleCourseChange}
                                        placeholder="Describe what students will achieve..."
                                        rows={4}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-primary focus:ring-primary"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Subject / Category</label>
                                        <select
                                            name="subject"
                                            value={course.subject}
                                            onChange={handleCourseChange}
                                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-primary focus:ring-primary"
                                        >
                                            {CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Price (USD)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                            <input
                                                name="price"
                                                type="number"
                                                value={course.price}
                                                onChange={handleCourseChange}
                                                placeholder="49.99"
                                                className={`w-full pl-8 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-primary focus:ring-primary ${errors.price ? 'border-red-400' : ''}`}
                                            />
                                        </div>
                                        {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveCourseDetails}
                                    disabled={saving}
                                    className="mt-4 w-full py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : (courseId ? 'Update & Continue' : 'Save & Continue →')}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* ─── Step 2: Curriculum (Upload) ─────────── */}
                    {currentStep === 1 && (
                        <>
                            <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">video_library</span>
                                    Video Lessons
                                </h3>

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                                    multiple
                                    onChange={handleFileInput}
                                    className="hidden"
                                />

                                {/* Drag & Drop Zone */}
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 hover:bg-primary/5 hover:border-primary transition-all cursor-pointer group"
                                    onClick={handleBrowse}
                                >
                                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">Drag & Drop your video lessons here</p>
                                    <p className="text-sm text-slate-500 mt-1">MP4, MOV or AVI (Max 100MB per file)</p>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleBrowse(); }}
                                        className="mt-6 px-6 py-2 rounded-xl bg-slate-900 dark:bg-primary text-white text-sm font-bold"
                                    >
                                        Browse Files
                                    </button>
                                </div>

                                {/* Upload Progress Items */}
                                {uploading.map((item) => (
                                    <div key={item.id} className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined text-sm ${item.status === 'complete' ? 'text-primary' :
                                                        item.status === 'error' ? 'text-red-500' : 'text-slate-400'
                                                    }`}>
                                                    {item.status === 'complete' ? 'check_circle' :
                                                        item.status === 'error' ? 'error' : 'hourglass_top'}
                                                </span>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">{item.name}</p>
                                            </div>
                                            <span className={`text-xs font-bold ${item.status === 'complete' ? 'text-primary' :
                                                    item.status === 'error' ? 'text-red-500' : 'text-slate-500'
                                                }`}>
                                                {item.status === 'complete' ? 'Upload Complete' :
                                                    item.status === 'error' ? 'Upload Failed' : `${item.progress}%`}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${item.status === 'error' ? 'bg-red-500' : 'bg-primary'
                                                    }`}
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </section>

                            {/* Uploaded Lessons List */}
                            <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">Uploaded Lessons ({lessons.length})</h3>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        {lessons.length === 0 ? 'Upload videos above' : 'Manage your lessons'}
                                    </p>
                                </div>

                                {lessons.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">video_library</span>
                                        <p className="text-sm">No lessons uploaded yet. Drag & drop videos above.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {lessons.map((lesson, index) => (
                                            <div
                                                key={lesson.id}
                                                className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 group hover:border-primary/30 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-slate-400 cursor-grab">drag_indicator</span>
                                                <div className="size-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 relative overflow-hidden">
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <span className="material-symbols-outlined text-white text-sm">play_arrow</span>
                                                    </div>
                                                    {lesson.thumbnail_url && (
                                                        <img
                                                            src={lesson.thumbnail_url}
                                                            alt={lesson.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {editingId === lesson.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editTitle}
                                                                onChange={(e) => setEditTitle(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleEditSave(lesson.id);
                                                                    if (e.key === 'Escape') handleEditCancel();
                                                                }}
                                                                className="flex-1 px-2 py-1 text-sm rounded-lg border border-primary bg-white dark:bg-slate-800"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleEditSave(lesson.id)} className="text-primary text-xs font-bold">Save</button>
                                                            <button onClick={handleEditCancel} className="text-slate-400 text-xs">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                                {String(index + 1).padStart(2, '0')}. {lesson.title}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {lesson.duration || 'N/A'} • {lesson.quality || 'HD 1080p'}
                                                                {lesson.file_size ? ` • ${formatFileSize(lesson.file_size)}` : ''}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditStart(lesson)}
                                                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLesson(lesson.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {lessons.length > 0 && (
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                                        >
                                            Continue to Pricing →
                                        </button>
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {/* ─── Step 3: Pricing ──────────────────────── */}
                    {currentStep === 2 && (
                        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">payments</span>
                                Pricing & Payment
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Course Price (USD)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                                        <input
                                            name="price"
                                            type="number"
                                            value={course.price}
                                            onChange={handleCourseChange}
                                            placeholder="49.99"
                                            className="w-full pl-10 py-4 text-2xl font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                {!paymentVerified && (
                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                        <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-amber-600 mt-0.5">warning</span>
                                            <div>
                                                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Payment Not Configured</p>
                                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                    Please add your payment details (Vodafone Cash, InstaPay, etc.) in Payment Settings before publishing.
                                                </p>
                                                <a href="/instructor/payment-settings" className="text-xs font-bold text-primary hover:underline mt-2 inline-block">
                                                    Go to Payment Settings →
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Course Summary</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Title</span>
                                            <span className="font-medium text-slate-800 dark:text-white">{course.title || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Category</span>
                                            <span className="font-medium text-slate-800 dark:text-white">{course.subject || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Lessons</span>
                                            <span className="font-medium text-slate-800 dark:text-white">{lessons.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Course ID</span>
                                            <span className="font-mono font-medium text-primary">{courseCode || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="flex-1 py-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        ← Back to Curriculum
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setSaving(true);
                                            try {
                                                await instructorAPI.updateCourse(courseId, course);
                                                toast.success('Pricing saved!');
                                                setCurrentStep(3);
                                            } catch (err) {
                                                toast.error(err.response?.data?.message || 'Failed to save.');
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                        disabled={saving}
                                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Continue to Review →'}
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ─── Step 4: Review & Publish ─────────────── */}
                    {currentStep === 3 && (
                        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">fact_check</span>
                                Review & Publish
                            </h3>

                            <div className="space-y-6">
                                {/* Course Details Summary */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Course Details</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-slate-500">Title</span><span className="font-medium">{course.title}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium">{course.subject}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Price</span><span className="font-bold text-primary">${course.price || '0.00'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Course ID</span><span className="font-mono text-primary">{courseCode}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Lessons</span><span className="font-medium">{lessons.length}</span></div>
                                    </div>
                                </div>

                                {course.description && (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5">
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{course.description}</p>
                                    </div>
                                )}

                                {/* Lessons Summary */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Lessons ({lessons.length})</h4>
                                    <div className="space-y-2">
                                        {lessons.map((lesson, i) => (
                                            <div key={lesson.id} className="flex items-center gap-3 text-sm">
                                                <span className="text-xs font-bold text-primary w-6">{String(i + 1).padStart(2, '0')}</span>
                                                <span className="text-slate-700 dark:text-slate-300 flex-1 truncate">{lesson.title}</span>
                                                <span className="text-xs text-slate-400">{lesson.duration || 'N/A'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Publish Button */}
                                <button
                                    onClick={handlePublish}
                                    disabled={initializing || publishing || lessons.length === 0}
                                    className="w-full py-4 rounded-xl text-lg font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {publishing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Publishing...
                                        </>
                                    ) : (
                                        '🚀 Publish Course'
                                    )}
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar Info / Tips */}
                <div className="space-y-6">
                    <div className="bg-slate-900 dark:bg-primary text-white rounded-2xl p-6 shadow-xl">
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined">tips_and_updates</span>
                            Instructor Pro-Tip
                        </h4>
                        <p className="text-sm text-white/80 leading-relaxed">
                            High-quality audio is more important than 4K video. Ensure your voice is clear and background music doesn&#39;t overpower your instructions.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h4 className="font-bold mb-4 text-slate-900 dark:text-white">Success Feedback</h4>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className={`size-6 rounded-full flex items-center justify-center flex-shrink-0 ${videoQualityOk ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-800'
                                    }`}>
                                    <span className={`material-symbols-outlined text-xs ${videoQualityOk ? 'text-green-600' : 'text-slate-400'}`}>
                                        {videoQualityOk ? 'done' : 'pending'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Video Quality Verified</p>
                                    <p className="text-[10px] text-slate-500">
                                        {videoQualityOk ? 'Uploads meet quality standard.' : 'Upload at least one video.'}
                                    </p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className={`size-6 rounded-full flex items-center justify-center flex-shrink-0 ${paymentVerified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-800'
                                    }`}>
                                    <span className={`material-symbols-outlined text-xs ${paymentVerified ? 'text-green-600' : 'text-slate-400'}`}>
                                        {paymentVerified ? 'done' : 'pending'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Verified</p>
                                    <p className="text-[10px] text-slate-500">
                                        {paymentVerified ? 'Payment method linked successfully.' : 'Add payment method in Settings.'}
                                    </p>
                                </div>
                            </li>
                            <li className={`flex gap-3 ${!reviewReady ? 'opacity-50' : ''}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center flex-shrink-0 ${reviewReady ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-800'
                                    }`}>
                                    <span className={`material-symbols-outlined text-xs ${reviewReady ? 'text-green-600' : 'text-slate-400'}`}>
                                        {reviewReady ? 'done' : 'pending'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Review Ready</p>
                                    <p className="text-[10px] text-slate-500">
                                        {reviewReady ? 'Course is ready for review!' : `Requires ${2 - lessons.length} more lesson(s) to publish.`}
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">
                        <h4 className="font-bold text-primary mb-2">Need help?</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Our production team is available 24/7 to assist with your video uploads.</p>
                        <a className="text-sm font-bold text-primary hover:underline flex items-center gap-1" href="#">
                            Contact Support
                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </a>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                title="Complete Your Profile"
                size="sm"
            >
                <div className="p-6">
                    <p className="text-sm text-slate-600">
                        Add a payment method (Vodafone Cash, InstaPay, Fawry, or other) before publishing this course.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <button
                            onClick={() => setPaymentModalOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Not Now
                        </button>
                        <button
                            onClick={() => {
                                setPaymentModalOpen(false);
                                router.push('/instructor/payment-settings');
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                        >
                            Payment Settings
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
