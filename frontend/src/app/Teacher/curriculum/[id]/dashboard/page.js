'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { teacherAPI } from '@/lib/api';
import { ArrowRight, BarChart, Users, CreditCard } from 'lucide-react';

export default function CurriculumDashboardPage() {
    const toast = useToast();
    const router = useRouter();
    const params = useParams();
    const curriculumId = params.id;

    const [metrics, setMetrics] = useState({
        totalStudents: 0,
        pendingRequests: 0,
        totalRevenue: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const res = await teacherAPI.getCurriculumDashboardMetrics(curriculumId);
                if (res.data?.success) {
                    setMetrics(res.data.data);
                }
            } catch (err) {
                // If standard 403 Forbidden because they are an assistant, show toast and redirect
                if (err.response?.status === 403) {
                    toast.error('أنت لا تملك صلاحية للوصول إلى لوحة متابعة هذا المقرر.');
                    router.push(`/Teacher/curriculum/${curriculumId}`);
                } else {
                    toast.error('فشل تحميل إحصائيات المقرر.');
                    router.push(`/Teacher/curriculum/${curriculumId}`);
                }
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();
    }, [curriculumId, router, toast]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const STAT_CARDS = [
        {
            label: 'إجمالي الطلاب المقبولين',
            value: metrics.totalStudents,
            icon: '👨‍🎓',
            color: 'bg-emerald-100 text-emerald-600',
        },
        {
            label: 'إجمالي الإيرادات (ج.م)',
            value: metrics.totalRevenue,
            icon: '💰',
            color: 'bg-primary/10 text-primary',
        },
        {
            label: 'الطلبات قيد الانتظار',
            value: metrics.pendingRequests,
            icon: '⏳',
            color: 'bg-amber-100 text-amber-600',
        },
    ];

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <button
                        onClick={() => router.push(`/Teacher/curriculum/${curriculumId}`)}
                        className="text-sm text-slate-400 hover:text-primary mb-2 flex items-center gap-1 transition-colors"
                    >
                        <ArrowRight className="w-4 h-4" />
                        العودة لإدارة المقرر
                    </button>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <BarChart className="w-8 h-8 text-primary" />
                        لوحة المتابعة والأداء
                    </h1>
                    <p className="text-sm text-slate-500 mt-2">
                        نظرة شاملة على أداء المقرر وتسجيلات الطلاب وإيراداتك.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8`}>
                {STAT_CARDS.map((card, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 animate-slide-up"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${card.color}`}>
                                {card.icon}
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-800">{card.value}</p>
                        <p className="text-sm font-medium text-slate-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Useful Actions directly below metrics */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                <h3 className="text-lg font-bold text-slate-800 mb-4">إجراءات سريعة</h3>
                <div className="flex flex-wrap gap-4">
                    <Link
                        href="/Teacher/students"
                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 text-sm"
                    >
                        <Users className="w-5 h-5" />
                        مراجعة كل الطلاب
                    </Link>
                    <Link
                        href="/Teacher/payment-settings"
                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 text-sm"
                    >
                        <CreditCard className="w-5 h-5" />
                        إعدادات الدفع الخاصة بي
                    </Link>
                </div>
            </div>
        </div>
    );
}
