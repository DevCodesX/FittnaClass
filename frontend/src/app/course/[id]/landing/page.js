'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { studentAPI } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { getTrackLabel } from '@/lib/categories';
import { isFreeLessonCourse } from '@/lib/freeLesson';
import {
    CheckCircle,
    Star,
    MonitorPlay,
    BookOpen,
    Clock,
    PlayCircle,
    Award,
    ShieldCheck,
    ArrowLeft
} from 'lucide-react';

export default function CourseLandingPage() {
    const { id } = useParams();
    const router = useRouter();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrollmentState, setEnrollmentState] = useState(null);
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        async function fetchCourse() {
            try {
                const res = await studentAPI.getCurriculumDetails(id);
                if (res.data?.success && res.data.data) {
                    setCourse(res.data.data);
                }

                // Check enrollment status if logged in
                const token = typeof window !== 'undefined' ? localStorage.getItem('fittnaclass_token') : null;
                if (token) {
                    try {
                        const statusRes = await studentAPI.checkEnrollmentStatus(id);
                        if (statusRes.data?.success && statusRes.data.data) {
                            setEnrollmentState(statusRes.data.data);
                        }
                    } catch (e) {
                        // ignore if not logged in or invalid token
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchCourse();
    }, [id]);

    // Simulated Countdown Timer for Flash Sale (can be connected to real data later)
    useEffect(() => {
        if (!course) return;
        const hasDiscount = course.discount_price && course.discount_end_date;
        const targetDate = hasDiscount ? new Date(course.discount_end_date) : new Date(new Date().getTime() + 1000 * 60 * 60 * 24); // 24 hours fake countdown if no real date but we want to show it

        const interval = setInterval(() => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();
            if (difference > 0) {
                setTimeLeft({
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [course]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Skeleton variant="card" className="!h-96 rounded-3xl" />
                    <Skeleton variant="title" className="w-1/2" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" />
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-slate-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">المقرر غير موجود</h1>
                <p className="text-slate-500 mb-8 max-w-md">نعتذر، لم نتمكن من العثور على هذا المقرر. قد يكون تم حذفه أو أن الرابط غير صحيح.</p>
                <button 
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                    العودة للرئيسية
                </button>
            </div>
        );
    }

    const isFreeLesson = isFreeLessonCourse(course);
    const hasDiscount = !!course.discount_price;
    const finalPrice = hasDiscount ? course.discount_price : course.price;
    
    // Calculate course stats
    const unitsCount = course.sections?.length || 0;
    const lessonsCount = course.sections?.reduce((sum, section) => sum + (section.lessons?.length || 0), 0) || 0;

    const handleCTA = () => {
        if (enrollmentState?.status === 'approved') {
            router.push(`/student/watch/${id}`);
        } else {
            router.push(`/student/course/${id}`);
        }
    };

    const CTA_TEXT = enrollmentState?.status === 'approved' 
        ? "اذهب إلى الكورس" 
        : isFreeLesson ? "ابدأ مجاناً الآن" : "اشترك الآن";

    const testimonials = [
        { name: "أحمد محمود", text: "الشرح مبسط جداً وفي أمثلة كتير خلتني أفهم المنهج بسهولة.", rating: 5 },
        { name: "سارة خالد", text: "كنت خايفة من المادة دي بس مع الكورس ده دخلت الامتحان وأنا واثقة من نفسي.", rating: 5 },
        { name: "محمد طارق", text: "المعلم ممتاز وبيوصل المعلومة بطريقة سلسة. أنصح بيه جداً!", rating: 4 }
    ];

    const benefits = [
        { icon: <CheckCircle className="w-8 h-8 text-emerald-500" />, title: "هتفهم المنهج بالكامل", desc: "تغطية شاملة لكل دروس المنهج خطوة بخطوة." },
        { icon: <ShieldCheck className="w-8 h-8 text-blue-500" />, title: "هتدخل الامتحان وأنت واثق", desc: "تدريبات مستمرة وأسئلة متوقعة تضمن تفوقك." },
        { icon: <MonitorPlay className="w-8 h-8 text-purple-500" />, title: "شرح بسيط + أمثلة", desc: "طريقة شرح مبتكرة بعيدة عن التعقيد الممل." }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/20">
            {/* HERO SECTION */}
            <section className="relative bg-slate-900 border-b border-slate-800 overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
                <div className="absolute inset-0 z-0 opacity-20">
                    <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-gradient-to-r from-primary/40 to-transparent blur-3xl rounded-full mix-blend-screen" />
                    <div className="absolute bottom-0 -right-1/4 w-1/2 h-half bg-gradient-to-l from-blue-500/30 to-transparent blur-3xl rounded-full mix-blend-screen" />
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
                </div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 text-right">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="px-3 py-1 bg-white/10 text-indigo-300 text-sm rounded-full font-medium border border-white/10 backdrop-blur-sm">
                                    {getTrackLabel(course.category)}
                                </span>
                                {(course.grade_level || course.grade?.name) && (
                                    <span className="px-3 py-1 bg-white/10 text-emerald-300 text-sm rounded-full font-medium border border-white/10 backdrop-blur-sm">
                                        {course.grade_level || course.grade?.name}
                                    </span>
                                )}
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                                {course.title}
                            </h1>
                            
                            {course.description && (
                                <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                                    {course.description}
                                </p>
                            )}

                            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl max-w-sm backdrop-blur-md">
                                <div className="w-14 h-14 bg-gradient-to-br from-primary/80 to-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                                    <span className="text-xl font-bold text-white">
                                        {course.instructor?.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">تقديم المعلم</p>
                                    <p className="text-lg font-bold text-white">{course.instructor?.name}</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                                <button 
                                    onClick={handleCTA}
                                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-l from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white rounded-2xl font-bold text-xl shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {CTA_TEXT}
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                
                                {!isFreeLesson && (
                                    <div className="flex flex-col items-center sm:items-start space-y-1">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-3xl font-extrabold text-white">{finalPrice} ج.م</span>
                                            {hasDiscount && (
                                                <span className="text-lg text-slate-400 font-medium line-through">
                                                    {course.price} ج.م
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400 flex items-center gap-1">
                                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                            دفع آمن 100%
                                        </p>
                                    </div>
                                )}
                                {isFreeLesson && (
                                    <span className="text-3xl font-extrabold text-emerald-400 bg-emerald-400/10 px-6 py-2 rounded-xl">مجانــي</span>
                                )}
                            </div>
                        </div>

                        {/* Visual Hero Card */}
                        <div className="hidden lg:block relative perspective-1000">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent blur-3xl transform rotate-12" />
                            <div className="relative bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-600" />
                                    <div className="w-3 h-3 rounded-full bg-slate-600" />
                                    <div className="w-3 h-3 rounded-full bg-slate-600" />
                                </div>
                                <div className="w-full h-48 bg-slate-900 rounded-2xl mb-6 flex items-center justify-center border border-slate-700">
                                    <span className="text-7xl">🎓</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-6 bg-slate-700 rounded w-3/4" />
                                    <div className="h-4 bg-slate-700/50 rounded w-full" />
                                    <div className="h-4 bg-slate-700/50 rounded w-5/6" />
                                    <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                                        <div className="flex gap-2 items-center"><BookOpen className="w-5 h-5 text-indigo-400" /><span className="text-slate-300 text-sm font-medium">{unitsCount} وحدات</span></div>
                                        <div className="flex gap-2 items-center"><PlayCircle className="w-5 h-5 text-emerald-400" /><span className="text-slate-300 text-sm font-medium">{lessonsCount} دروس</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* RESULTS / BENEFITS SECTION */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <span className="text-primary font-bold tracking-wider text-sm uppercase bg-primary/10 px-4 py-1.5 rounded-full">النتائج המتوقعة</span>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-6 mb-4">ليه تختار الكورس ده؟</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">بنوفرلك بيئة تعليمية متكاملة تضمنلك النجاح والتفوق بخطوات ثابتة.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {benefits.map((benefit, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md mb-6">
                                    {benefit.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{benefit.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{benefit.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* COURSE CONTENT PREVIEW */}
            <section className="py-20 bg-slate-50 border-y border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">محتوى المقرر</h2>
                        <div className="flex justify-center gap-6 text-slate-600 font-medium">
                            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"><BookOpen className="w-5 h-5 text-indigo-500" /> {unitsCount} وحدة</span>
                            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"><PlayCircle className="w-5 h-5 text-emerald-500" /> {lessonsCount} درس</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {course.sections && course.sections.length > 0 ? (
                            course.sections.map((section, idx) => (
                                <div key={section.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-slate-800 flex flex-col sm:flex-row sm:items-center gap-2">
                                            <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">الوحدة {idx + 1}</span>
                                            {section.title}
                                        </h3>
                                        <span className="text-sm text-slate-500 font-medium">{section.lessons?.length || 0} دروس</span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {section.lessons && section.lessons.length > 0 ? (
                                            section.lessons.map((lesson) => (
                                                <div key={lesson.id} className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        {lesson.type === 'video' ? <MonitorPlay className="w-5 h-5 text-slate-400" /> : <Clock className="w-5 h-5 text-slate-400" />}
                                                        <span className="font-medium text-slate-700">{lesson.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {lesson.duration && <span className="text-sm text-slate-400 font-mono bg-white px-2 py-1 rounded-md border border-slate-100" suppressHydrationWarning>{lesson.duration}</span>}
                                                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                            🔒 مغلق
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-slate-500 text-sm">لا توجد دروس مضافة في هذه الوحدة حتى الآن.</div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center p-12 bg-white rounded-3xl border border-slate-200">
                                <p className="text-slate-500">جاري إعداد محتوى المقرر وسيتم إضافته قريباً.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* SOCIAL PROOF / TESTIMONIALS */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">قالوا عن الكورس</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">آراء الطلاب اللي سبقوك واستفادوا من طريقة الشرح.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {testimonials.map((testi, idx) => (
                            <div key={idx} className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                <div className="flex text-amber-400 mb-4">
                                    {[...Array(testi.rating)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                                </div>
                                <p className="text-slate-700 font-medium leading-relaxed mb-6">"{testi.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                        {testi.name.charAt(0)}
                                    </div>
                                    <p className="font-bold text-slate-900 text-sm">{testi.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING & CTA SECTION */}
            <section className="py-24 bg-slate-900 border-t border-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full bg-primary/10 blur-[100px] rounded-full" />
                </div>
                
                <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
                    <Award className="w-16 h-16 text-yellow-400 mx-auto mb-6 drop-shadow-lg" />
                    <h2 className="text-4xl font-extrabold text-white mb-6">استثمر في مستقبلك الآن!</h2>
                    
                    {!isFreeLesson && (
                        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 mb-10 max-w-2xl mx-auto shadow-2xl">
                            <h3 className="text-2xl font-bold text-white mb-8">خطة الاشتراك الشاملة</h3>
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
                                    {finalPrice} <span className="text-2xl">ج.م</span>
                                </span>
                                {hasDiscount && (
                                    <span className="text-2xl text-slate-500 font-bold line-through decoration-red-500/50 decoration-2">
                                        {course.price} ج.م
                                    </span>
                                )}
                            </div>
                            
                            {(hasDiscount || true) && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8 inline-block">
                                    <p className="text-red-400 font-bold text-sm mb-2">⚡ العرض ينتهي خلال:</p>
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center"><span className="text-2xl font-mono font-bold text-white w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-xl">{String(timeLeft.hours).padStart(2,'0')}</span><span className="text-[10px] text-red-300 mt-1">ساعة</span></div>
                                        <span className="text-2xl font-bold text-red-500/50 mt-1">:</span>
                                        <div className="flex flex-col items-center"><span className="text-2xl font-mono font-bold text-white w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-xl">{String(timeLeft.minutes).padStart(2,'0')}</span><span className="text-[10px] text-red-300 mt-1">دقيقة</span></div>
                                        <span className="text-2xl font-bold text-red-500/50 mt-1">:</span>
                                        <div className="flex flex-col items-center"><span className="text-2xl font-mono font-bold text-white w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-xl">{String(timeLeft.seconds).padStart(2,'0')}</span><span className="text-[10px] text-red-300 mt-1">ثانية</span></div>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleCTA}
                                className="w-full py-5 bg-gradient-to-l from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white rounded-2xl font-bold text-2xl shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.4)] transition-all transform hover:-translate-y-1"
                            >
                                {CTA_TEXT}
                            </button>
                            <p className="text-sm text-slate-400 mt-4 flex items-center justify-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> ضمان استرداد الأموال في حالة عدم الرضا
                            </p>
                        </div>
                    )}

                    {isFreeLesson && (
                        <div className="max-w-xl mx-auto mb-10">
                            <p className="text-xl text-emerald-300 mb-8 font-medium">هذا الكورس مجاني بالكامل كهدية من المعلم، ابدأ التعلم فوراً.</p>
                            <button 
                                onClick={handleCTA}
                                className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-1"
                            >
                                {CTA_TEXT}
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
