'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Radio, ShieldCheck, Zap } from 'lucide-react';

export default function TeacherLiveDashboard() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleCreateRoom = () => {
        setIsGenerating(true);

        // Generate a random room ID for each new session.
        const uniqueId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

        // Brief delay for feedback before navigation.
        setTimeout(() => {
            router.push(`/Teacher/live/${uniqueId}`);
        }, 600);
    };

    return (
        <div dir="rtl" className="mx-auto max-w-6xl space-y-7 py-2">
            <section className="animate-fade-in">
                <h2 className="text-[clamp(1.9rem,4.2vw,3rem)] font-black tracking-[-0.03em] text-slate-900">البث المباشر</h2>
                <p className="mt-2 max-w-3xl text-[clamp(0.95rem,2vw,1.2rem)] font-medium text-slate-600">
                    أنشئ غرفة بث جديدة وشارك الرابط مع طلابك للتفاعل معهم في الوقت الفعلي.
                </p>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
                <div className="animate-slide-up rounded-[18px] border border-slate-200/70 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#ECEFF8] text-[#4C57B7]">
                            <Radio className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-slate-600">
                            LIVE
                        </span>
                    </div>

                    <h3 className="text-[1.6rem] font-bold tracking-[-0.02em] text-slate-900">ابدأ حصة مباشرة جديدة</h3>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">
                        سيتم إنشاء رابط فريد لغرفة البث الخاصة بك، ويمكنك مشاركته مع الطلاب للانضمام فوراً.
                    </p>

                    <button
                        onClick={handleCreateRoom}
                        disabled={isGenerating}
                        className="touch-target mt-5 inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#4D59BE] to-[#838FE7] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
                    >
                        {isGenerating ? (
                            <>
                                <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                <span>جاري الإنشاء...</span>
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                <span>إنشاء غرفة جديدة</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="animate-slide-up rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#EAF8F1] text-emerald">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">الخصوصية والأمان</h4>
                        <p className="mt-1 text-sm text-slate-500">
                            لا يمكن الوصول إلى الغرفة إلا عبر الرابط المباشر الذي تشاركه مع طلابك.
                        </p>
                    </div>

                    <div
                        className="animate-slide-up rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]"
                        style={{ animationDelay: '0.08s' }}
                    >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#EAF0FE] text-[#4C57B7]">
                            <Zap className="h-5 w-5" />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">جودة عالية</h4>
                        <p className="mt-1 text-sm text-slate-500">
                            فيديو وصوت بجودة مستقرة مع دعم ممتاز لمختلف الأجهزة والمتصفحات.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
