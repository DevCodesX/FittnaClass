'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowUpRight,
    ClipboardCheck,
    CreditCard,
    GraduationCap,
    ShieldAlert,
    SquarePlus,
    UserRoundPlus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { teacherAPI } from '@/lib/api';
import Modal from '@/components/ui/Modal';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const { isOwner, isAssistant, hasAnyPermission, adminCurricula } = usePermissions();
    const [stats, setStats] = useState({ pending: 0 });
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // Only fetch pending students if user has permission.
                if (isOwner || hasAnyPermission('view_students', 'manage_students')) {
                    const res = await teacherAPI.getPendingStudents();
                    setStats({ pending: res.data.count || 0 });
                }

                // Show onboarding only for teachers, not assistants.
                if (isOwner) {
                    const hasSeenOnboarding = localStorage.getItem('fittnaclass_onboarding_seen');
                    if (!hasSeenOnboarding) {
                        setShowOnboarding(true);
                        localStorage.setItem('fittnaclass_onboarding_seen', 'true');
                    }
                }
            } catch {
                // If fetching fails, still render the dashboard.
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [isOwner, hasAnyPermission]);

    const firstName = user?.name?.split(' ')[0] || 'المعلم';

    // Build stat cards dynamically based on permissions.
    const statCards = [];

    if (isOwner || hasAnyPermission('create_lessons', 'edit_lessons')) {
        statCards.push({
            title: 'إدارة المقررات',
            subtitle: isAssistant ? 'تعديل المقررات المخصصة لك' : '12 وحدة نشطة مُنظمة',
            badge: 'نشط',
            badgeClass: 'bg-slate-200 text-slate-600',
            icon: GraduationCap,
            iconClass: 'bg-[#ECEFF8] text-[#4C57B7]',
            href: '/Teacher/upload-center',
        });
    }

    if (isOwner || hasAnyPermission('view_students', 'manage_students')) {
        statCards.push({
            title: 'الطلاب / التسجيلات',
            subtitle: loading ? 'جاري فحص الطلبات...' : `${stats.pending} طلب بانتظار المراجعة`,
            badge: loading ? '...' : String(stats.pending),
            badgeClass: 'bg-[#FCE7F3] text-[#9D174D]',
            icon: UserRoundPlus,
            iconClass: 'bg-[#F8EAF2] text-[#BE185D]',
            href: '/Teacher/students',
        });
    }

    if (isOwner || hasAnyPermission('view_payments', 'approve_payments')) {
        statCards.push({
            title: 'إعدادات الدفع',
            subtitle: 'إدارة وسائل التحصيل والفوترة',
            badge: 'دفع',
            badgeClass: 'bg-[#E0F2FE] text-[#155E75]',
            icon: CreditCard,
            iconClass: 'bg-[#E8F6FF] text-[#0E7490]',
            href: '/Teacher/payment-settings',
        });
    }

    // Build quick actions dynamically.
    const quickActions = [];

    if (isOwner || hasAnyPermission('view_students', 'manage_students')) {
        quickActions.push({
            href: '/Teacher/students',
            icon: ClipboardCheck,
            title: 'مراجعة التسجيلات',
            desc: isAssistant ? 'مراجعة الطلاب المخصصين لك' : 'قبول طلبات الطلاب',
            primary: true,
        });
    }

    if (isOwner || hasAnyPermission('create_lessons', 'edit_lessons')) {
        quickActions.push({
            href: '/Teacher/upload-center',
            icon: SquarePlus,
            title: isOwner ? 'إنشاء مقرر' : 'إدارة المقررات',
            desc: isOwner ? 'إضافة وحدات ودروس جديدة' : 'تعديل الوحدات المتاحة لك',
            primary: false,
        });
    }

    const statsGridClass =
        statCards.length >= 3
            ? 'sm:grid-cols-2 xl:grid-cols-3'
            : statCards.length === 2
              ? 'sm:grid-cols-2'
              : 'sm:grid-cols-1';

    const trendBars = [34, 52, 48, 72, 41, 86, 58];

    return (
        <div dir="rtl" className="mx-auto max-w-6xl space-y-7">
            <section className="animate-fade-in pt-1">
                <h2 className="text-[clamp(1.9rem,4.2vw,3.1rem)] font-black leading-[1.05] tracking-[-0.03em] text-slate-900">
                    مرحباً بعودتك،
                    <br />
                    {firstName}
                </h2>
                <p className="mt-3 text-[clamp(1rem,2.1vw,1.35rem)] font-medium text-slate-600">
                    تم إعداد لوحتك لليوم.
                </p>

                {isAssistant && adminCurricula.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {adminCurricula.map((curriculum) => (
                            <span
                                key={curriculum.id}
                                className="inline-flex items-center rounded-full bg-[#ECEFF8] px-3 py-1 text-[11px] font-bold tracking-wide text-[#4C57B7]"
                            >
                                {curriculum.title}
                            </span>
                        ))}
                    </div>
                )}
            </section>

            {statCards.length > 0 && (
                <section className={`grid grid-cols-1 gap-4 md:gap-5 ${statsGridClass}`}>
                    {statCards.map((card, index) => {
                        const Icon = card.icon;

                        return (
                            <Link
                                key={card.href}
                                href={card.href}
                                className="group flex min-h-[176px] flex-col justify-between rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)] animate-slide-up"
                                style={{ animationDelay: `${index * 0.08}s` }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${card.iconClass}`}>
                                        <Icon className="h-6 w-6" strokeWidth={2.25} />
                                    </div>
                                    {card.badge && (
                                        <span
                                            className={`rounded-full px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] ${card.badgeClass}`}
                                        >
                                            {card.badge}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-[1.7rem] font-bold tracking-[-0.02em] text-slate-900">{card.title}</h3>
                                    <p className="text-sm text-slate-500">{card.subtitle}</p>
                                </div>
                            </Link>
                        );
                    })}
                </section>
            )}

            {quickActions.length > 0 && (
                <section className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[clamp(1.5rem,2.8vw,2rem)] font-extrabold tracking-[-0.03em] text-slate-900">
                            إجراءات سريعة
                        </h3>
                        <span className="h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                        {quickActions.map((action) => {
                            const Icon = action.icon;

                            return (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className={`group flex min-h-[176px] flex-col justify-between rounded-[18px] p-5 transition-all hover:-translate-y-0.5 ${
                                        action.primary
                                            ? 'border border-transparent bg-gradient-to-br from-[#4D59BE] to-[#838FE7] text-white shadow-[0_20px_44px_-26px_rgba(77,89,190,0.7)]'
                                            : 'border border-slate-200/70 bg-white text-slate-900 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]'
                                    }`}
                                >
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${
                                            action.primary ? 'bg-white/20 text-white' : 'bg-[#ECEFF8] text-[#4C57B7]'
                                        }`}
                                    >
                                        <Icon className="h-6 w-6" strokeWidth={2.2} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <h4 className="text-[1.65rem] font-bold leading-[1.15] tracking-[-0.02em]">
                                            {action.title}
                                        </h4>
                                        <p className={`text-sm ${action.primary ? 'text-white/85' : 'text-slate-500'}`}>
                                            {action.desc}
                                        </p>
                                        <div
                                            className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                                                action.primary ? 'text-white/90' : 'text-slate-500'
                                            }`}
                                        >
                                            فتح
                                            <ArrowUpRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {statCards.length > 0 && (
                <section className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-[#EEF1F4] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.3)] md:p-7">
                    <h3 className="text-[clamp(1.55rem,2.8vw,2.05rem)] font-bold tracking-[-0.03em] text-slate-900">
                        اتجاهات التسجيل
                    </h3>
                    <div className="mt-6 h-36">
                        <div className="grid h-full grid-cols-7 items-end gap-2 md:gap-3">
                            {trendBars.map((height, index) => (
                                <div
                                    key={`${height}-${index}`}
                                    className={`rounded-t-xl ${index % 2 ? 'bg-[#4D57B7]' : 'bg-[#8992E5]'}`}
                                    style={{ height: `${height}%` }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="pointer-events-none absolute -bottom-16 -left-20 h-56 w-56 rounded-full bg-slate-300/35" />
                </section>
            )}

            {statCards.length === 0 && (
                <section className="animate-fade-in rounded-[18px] border border-slate-200/70 bg-white p-8 text-center shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#ECEFF8] text-[#4C57B7]">
                        <ShieldAlert className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">لا توجد أقسام متاحة حالياً</h3>
                    <p className="mx-auto max-w-lg text-sm text-slate-500">
                        صلاحياتك الحالية كمساعد لا تتضمن وحدات مرئية في اللوحة. تواصل مع مالك المقرر لتحديث مستوى الوصول.
                    </p>
                </section>
            )}

            {isOwner && (
                <Modal
                    isOpen={showOnboarding}
                    onClose={() => setShowOnboarding(false)}
                    title="مرحباً بك في فيتنة كلاس"
                    size="md"
                >
                    <div className="p-6">
                        <div className="mb-6 text-center">
                            <div className="gradient-primary mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl">
                                <CreditCard className="h-9 w-9 text-white" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold text-slate-800">أكمل إعداد حسابك</h3>
                            <p className="text-sm text-slate-500">
                                أضف وسائل الدفع الخاصة بك ليتمكن الطلاب من الاشتراك وإتمام عمليات الدفع بسهولة.
                            </p>
                        </div>

                        <div className="mb-6 space-y-3">
                            <div className="flex items-center gap-3 rounded-xl bg-emerald-light/50 p-3">
                                <span className="text-lg">تم</span>
                                <span className="text-sm text-slate-700">تم إنشاء الحساب</span>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl bg-amber-light/50 p-3">
                                <span className="text-lg">التالي</span>
                                <span className="text-sm font-medium text-slate-700">
                                    أضف وسائل الدفع (فودافون كاش، إنستاباي، وغيرها)
                                </span>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                <span className="text-lg">لاحقاً</span>
                                <span className="text-sm text-slate-500">أنشئ مقررك الأول</span>
                            </div>
                        </div>

                        <Link
                            href="/Teacher/payment-settings"
                            onClick={() => setShowOnboarding(false)}
                            className="touch-target block w-full rounded-xl bg-primary py-3.5 text-center font-bold text-white transition-colors hover:bg-primary/90"
                        >
                            إعداد وسائل الدفع
                        </Link>
                        <button
                            onClick={() => setShowOnboarding(false)}
                            className="touch-target mt-2 block w-full py-3 text-center text-sm text-slate-400 hover:text-slate-600"
                        >
                            سأفعل ذلك لاحقاً
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
