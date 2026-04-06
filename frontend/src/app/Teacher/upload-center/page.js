'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { teacherAPI } from '@/lib/api';
import { TRACKS as OLD_TRACKS, getSubjectsForTrack, getTrackLabel } from '@/lib/categories';
import { EDUCATION_TYPES, STAGES, GRADES, TRACKS_BY_SYSTEM, getAvailableSubjects } from '@/lib/education_flow';
import { buildCoursePayload } from '@/lib/freeLesson';
import { BookOpen, Folder, PlayCircle, Plus, User } from 'lucide-react';

function resolveThumbnail(course) {
    return course.thumbnail_url || course.thumbnail || course.cover_image || course.coverImage || '';
}

function resolveTeacherName(course) {
    return course.instructor?.name || course.teacher?.name || 'أنت (المالك)';
}

export default function UploadCenterPage() {
    const toast = useToast();
    const router = useRouter();

    const [curricula, setCurricula] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: '', description: '', education_type: '', stage: '', grade_level: '', category: '', subject: '', price: '', is_free_lesson: false,
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchCurricula();
    }, []);

    async function fetchCurricula() {
        try {
            const res = await teacherAPI.getTeacherCurricula();
            setCurricula(res.data?.data || []);
        } catch {
            toast.error('فشل تحميل المقررات.');
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
    };

    const handleFreeLessonToggle = () => {
        setForm((prev) => ({
            ...prev,
            is_free_lesson: !prev.is_free_lesson,
            price: !prev.is_free_lesson ? '0' : '',
        }));
    };

    const handleCreateCurriculum = async () => {
        const newErrors = {};
        if (!form.title.trim()) newErrors.title = 'عنوان المقرر مطلوب';
        if (!form.education_type) newErrors.education_type = 'نوع التعليم مطلوب';
        if (!form.stage) newErrors.stage = 'المرحلة مطلوبة';
        if (!form.grade_level) newErrors.grade_level = 'الصف الدراسي مطلوب';
        if (form.stage === 'ثانوي' && !form.category) newErrors.category = 'الشعبة مطلوبة';
        if (!form.subject.trim()) newErrors.subject = 'المادة مطلوبة';
        if (!form.is_free_lesson && (!form.price || Number(form.price) <= 0)) newErrors.price = 'السعر مطلوب';
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setSaving(true);
        try {
            const payload = buildCoursePayload(form);
            const res = await teacherAPI.createCurriculum(payload);
            const newCurriculum = res.data.data;
            toast.success(`تم إنشاء المقرر ${newCurriculum.course_code} بنجاح!`);
            setShowCreateModal(false);
            router.push(`/Teacher/curriculum/${newCurriculum.id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إنشاء المقرر.');
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'published':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">منشور</span>;
            case 'scheduled':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">مجدول</span>;
            case 'in_review':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700">قيد المراجعة</span>;
            case 'archived':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">مؤرشف</span>;
            case 'draft':
            default:
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">مسودة</span>;
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة المقررات</h1>
                    <p className="text-slate-500 mt-1">أنشئ وأدر مقرراتك الدراسية للثانوية العامة أو الأزهرية.</p>
                </div>
                <button
                    onClick={() => { setForm({ title: '', description: '', education_type: '', stage: '', grade_level: '', category: '', subject: '', price: '', is_free_lesson: false }); setErrors({}); setShowCreateModal(true); }}
                    className="px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    إضافة مقرر جديد
                </button>
            </div>

            {/* Curricula Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            ) : curricula.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] text-center">
                    <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">لم تنشئ أي مقرر بعد</h3>
                    <p className="text-slate-500 mb-6">ابدأ بإنشاء مقررك الدراسي الأول وأضف الوحدات والدروس.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-8 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                        إنشاء مقرر دراسي
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {curricula.map((curr) => {
                        const thumbnail = resolveThumbnail(curr);
                        const teacherName = resolveTeacherName(curr);
                        const sectionsCount = curr.sectionCount ?? 0;
                        const lessonsCount = curr.lessonCount ?? 0;
                        const hasContent = sectionsCount > 0 || lessonsCount > 0;

                        return (
                            <div
                                key={curr.id}
                                onClick={() => router.push(`/Teacher/curriculum/${curr.id}`)}
                                className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg group flex flex-col overflow-hidden"
                            >
                                {/* Thumbnail Section */}
                                <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden w-full">
                                    {thumbnail ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={thumbnail} alt={curr.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                            <BookOpen className="w-12 h-12 text-slate-300 transition-transform duration-500 group-hover:scale-110" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 z-10">
                                        {getStatusBadge(curr.status)}
                                    </div>
                                    <div className="absolute bottom-3 right-3 z-10">
                                        <span className="rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md">
                                            {curr.course_code}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-base font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-primary transition-colors">{curr.title}</h3>
                                    <p className="text-xs font-semibold text-primary mb-3 leading-relaxed">
                                        {[curr.subject, curr.grade_level, curr.category ? getTrackLabel(curr.category) : null].filter(Boolean).join(' • ')}
                                    </p>

                                    <div className="flex items-center gap-2 mb-4 text-xs text-slate-600 font-medium">
                                        <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                        <span>{teacherName}</span>
                                    </div>

                                    {/* Lessons and Units Stats */}
                                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                        {hasContent ? (
                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                                    <Folder className="w-3.5 h-3.5 text-indigo-500" />
                                                    {sectionsCount} {sectionsCount === 1 ? 'وحدة' : sectionsCount <= 10 ? 'وحدات' : 'وحدة'}
                                                </span>
                                                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                                    <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
                                                    {lessonsCount} {lessonsCount === 1 ? 'درس' : lessonsCount <= 10 ? 'دروس' : 'درس'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
                                                لا توجد دروس بعد
                                            </span>
                                        )}
                                        
                                        <span className="text-sm font-black text-slate-800">
                                            {Number(curr.price) === 0 || curr.is_free_lesson ? (
                                                <span className="text-emerald-600 text-xs">مجاني</span>
                                            ) : (
                                                <>{curr.price} <span className="text-xs font-medium text-slate-500">ج.م</span></>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Curriculum Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="إنشاء مقرر دراسي جديد"
                size="lg"
            >
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">اسم المقرر</label>
                        <input
                            name="title" type="text" value={form.title} onChange={handleChange}
                            placeholder="مثال: الفيزياء - الصف الثالث الثانوي"
                            className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${errors.title ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">الوصف (اختياري)</label>
                        <textarea
                            name="description" value={form.description} onChange={handleChange}
                            placeholder="وصف موجز للمقرر..."
                            rows={3}
                            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-3 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">نوع التعليم</label>
                            <select
                                name="education_type" value={form.education_type}
                                onChange={(e) => {
                                    setForm({ ...form, education_type: e.target.value, stage: '', grade_level: '', category: '', subject: '' });
                                    setErrors(prev => ({ ...prev, education_type: '' }));
                                }}
                                className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${errors.education_type ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                            >
                                <option value="">اختر نوع التعليم...</option>
                                {EDUCATION_TYPES.map((type) => (
                                    <option key={type.id} value={type.id}>{type.label}</option>
                                ))}
                            </select>
                            {errors.education_type && <p className="text-red-500 text-xs mt-1">{errors.education_type}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">المرحلة</label>
                            <select
                                name="stage" value={form.stage}
                                onChange={(e) => {
                                    setForm({ ...form, stage: e.target.value, grade_level: '', category: '', subject: '' });
                                    setErrors(prev => ({ ...prev, stage: '' }));
                                }}
                                disabled={!form.education_type}
                                className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:opacity-50 ${errors.stage ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                            >
                                <option value="">{form.education_type ? 'اختر المرحلة...' : 'اختر نوع التعليم أولاً'}</option>
                                {STAGES.map((stage) => (
                                    <option key={stage.id} value={stage.id}>{stage.label}</option>
                                ))}
                            </select>
                            {errors.stage && <p className="text-red-500 text-xs mt-1">{errors.stage}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">الصف الدراسي</label>
                            <select
                                name="grade_level" value={form.grade_level}
                                onChange={(e) => {
                                    setForm({ ...form, grade_level: e.target.value, category: '', subject: '' });
                                    setErrors(prev => ({ ...prev, grade_level: '' }));
                                }}
                                disabled={!form.stage}
                                className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:opacity-50 ${errors.grade_level ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                            >
                                <option value="">{form.stage ? 'اختر الصف...' : 'اختر المرحلة أولاً'}</option>
                                {(GRADES[form.stage] || []).map((grade) => (
                                    <option key={grade} value={grade}>{grade}</option>
                                ))}
                            </select>
                            {errors.grade_level && <p className="text-red-500 text-xs mt-1">{errors.grade_level}</p>}
                        </div>
                        
                        {form.stage === 'ثانوي' && (
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-slate-700">الشعبة / المسار</label>
                                <select
                                    name="category" value={form.category}
                                    onChange={(e) => {
                                        setForm({ ...form, category: e.target.value, subject: '' });
                                        setErrors(prev => ({ ...prev, category: '' }));
                                    }}
                                    className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${errors.category ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                >
                                    <option value="">اختر الشعبة...</option>
                                    {(TRACKS_BY_SYSTEM[form.education_type] || []).map((track) => (
                                        <option key={track.id} value={track.id}>{track.label}</option>
                                    ))}
                                </select>
                                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">المادة الدراسية</label>
                        <select
                            name="subject" value={form.subject} onChange={handleChange}
                            disabled={!form.stage || (form.stage === 'ثانوي' && !form.category)}
                            className={`w-full rounded-lg border bg-white px-3 py-3 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:opacity-50 ${errors.subject ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                        >
                            <option value="">{form.stage ? (form.stage === 'ثانوي' && !form.category ? 'اختر الشعبة أولاً' : 'اختر المادة...') : 'اختر المرحلة أولاً'}</option>
                            {getAvailableSubjects(form.education_type, form.stage, form.category).map((subj) => (
                                <option key={subj} value={subj}>{subj}</option>
                            ))}
                        </select>
                        {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                    </div>

                    {/* Free Lesson Toggle */}
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">مقرر مجاني</p>
                                <p className="text-xs text-slate-500 mt-1">عند التفعيل سيتم ضبط السعر إلى 0.</p>
                            </div>
                            <button
                                type="button" onClick={handleFreeLessonToggle}
                                aria-pressed={form.is_free_lesson}
                                className={`relative h-7 w-12 rounded-full transition-colors ${form.is_free_lesson ? 'bg-primary' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${form.is_free_lesson ? 'right-1' : 'right-6'}`} />
                            </button>
                        </div>
                    </div>

                    {!form.is_free_lesson && (
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">السعر (جنيه مصري)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">ج.م</span>
                                <input
                                    name="price" type="number" min="0" value={form.price} onChange={handleChange}
                                    placeholder="150"
                                    className={`w-full ps-12 rounded-lg border bg-white px-3 py-3 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${errors.price ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                />
                            </div>
                            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1 py-3 rounded-xl text-sm font-bold border border-[#E5E7EB] hover:bg-[#F7F9FC] transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleCreateCurriculum}
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'جارٍ الإنشاء...' : 'إنشاء المقرر'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
