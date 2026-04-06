'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { studentAPI } from '@/lib/api';

const STAGES = ['ابتدائي', 'اعدادي', 'ثانوي'];
const GRADES = {
    'ابتدائي': ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'],
    'اعدادي': ['الأول', 'الثاني', 'الثالث'],
    'ثانوي': ['الأول', 'الثاني', 'الثالث']
};

export default function LeaderboardPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ top: [], currentUser: null });
    
    // Filters
    const [type, setType] = useState('weekly');
    const [educationType, setEducationType] = useState('');
    const [stage, setStage] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = { type };
            if (educationType) params.education_type = educationType;
            if (stage) params.stage = stage;
            if (gradeLevel) params.grade_level = gradeLevel;

            const res = await studentAPI.getLeaderboard(params);
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch {
            toast.error('حدث خطأ في تحميل لوحة الشرف.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, educationType, stage, gradeLevel]);

    const handleStageChange = (e) => {
        setStage(e.target.value);
        setGradeLevel(''); // Reset grade when stage changes
    };

    const isWeekly = type === 'weekly';

    function getRankBadge(rank) {
        if (rank === 1) return { color: 'text-amber-500', bg: 'bg-amber-100', icon: 'looks_one', shadow: 'shadow-amber-500/20' };
        if (rank === 2) return { color: 'text-slate-400', bg: 'bg-slate-100', icon: 'looks_two', shadow: 'shadow-slate-400/20' };
        if (rank === 3) return { color: 'text-orange-600', bg: 'bg-orange-100', icon: 'looks_3', shadow: 'shadow-orange-600/20' };
        return { color: 'text-slate-500', bg: 'bg-slate-50', text: rank, shadow: 'shadow-none' };
    }

    return (
        <div className="py-5 sm:py-8 animate-fade-in relative min-h-[calc(100vh-64px)] pb-24" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
                        </div>
                        لوحة الشرف
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">تنافس مع زملائك وكن في الصدارة {isWeekly ? '(تتجدد أسبوعياً)' : '(جميع الأوقات)'}</p>
                </div>

                {/* Scope Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center self-start">
                    <button
                        onClick={() => setType('weekly')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isWeekly ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        الأسبوعية
                    </button>
                    <button
                        onClick={() => setType('all_time')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${!isWeekly ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        العامة
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 flex flex-wrap gap-3">
                <select
                    value={educationType}
                    onChange={(e) => setEducationType(e.target.value)}
                    className="text-sm bg-slate-50 border-none rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-auto"
                >
                    <option value="">نوع التعليم (الكل)</option>
                    <option value="عام">عام</option>
                    <option value="أزهر">أزهر</option>
                </select>

                <select
                    value={stage}
                    onChange={handleStageChange}
                    className="text-sm bg-slate-50 border-none rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-auto"
                >
                    <option value="">المرحلة (الكل)</option>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    disabled={!stage}
                    className="text-sm bg-slate-50 border-none rounded-xl px-4 py-2.5 text-slate-700 font-medium disabled:opacity-50 focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-auto"
                >
                    <option value="">الصف (الكل)</option>
                    {stage && GRADES[stage]?.map(g => <option key={g} value={g}>الصف {g}</option>)}
                </select>
            </div>

            {/* Main List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-20 skeleton rounded-2xl" />
                    ))}
                </div>
            ) : data.top.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-slate-300 text-4xl">emoji_flags</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">لا يوجد تصنيف حالياً</h3>
                    <p className="text-slate-400 text-sm max-w-sm">كن أول من يحصل على نقاط في هذا التصنيف وتصدر لوحة الشرف!</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {data.top.map((score) => {
                        const isCurrentUser = data.currentUser?.user_id === score.user_id;
                        const badge = getRankBadge(score.rank);
                        const isTop3 = score.rank <= 3;
                        const points = isWeekly ? score.weekly_points : score.total_points;

                        return (
                            <div 
                                key={score.user_id} 
                                className={`
                                    relative overflow-hidden rounded-2xl border flex items-center p-4 transition-all hover:-translate-y-0.5
                                    ${isCurrentUser ? 'bg-indigo-50/50 border-indigo-200 shadow-sm shadow-indigo-100' : 'bg-white border-slate-100'}
                                `}
                            >
                                {/* Rank */}
                                <div className="w-12 flex-shrink-0 flex justify-center">
                                    {badge.icon ? (
                                        <span className={`material-symbols-outlined text-3xl ${badge.color} drop-shadow-sm`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {badge.icon}
                                        </span>
                                    ) : (
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${badge.bg} ${badge.color}`}>
                                            {badge.text}
                                        </div>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2 border-r border-slate-100 mr-2 border-opacity-50">
                                    {score.user?.avatar_url ? (
                                        <img src={score.user.avatar_url} alt="" className={`w-10 h-10 rounded-full object-cover shadow-sm ${badge.shadow}`} />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${isTop3 ? badge.bg : 'bg-slate-100'} ${badge.shadow}`}>
                                            <span className={`material-symbols-outlined ${isTop3 ? badge.color : 'text-slate-400'}`}>person</span>
                                        </div>
                                    )}
                                    <div className="truncate">
                                        <p className={`font-bold text-sm truncate ${isCurrentUser ? 'text-indigo-800' : 'text-slate-800'}`}>
                                            {score.user?.name || 'مستخدم غير معروف'}
                                            {isCurrentUser && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md mr-2 align-middle">أنت</span>}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 flex gap-1.5 items-center">
                                            {score.user?.grade_level && <span>الصف {score.user.grade_level}</span>}
                                            {score.user?.education_type && <span className="bg-slate-100 px-1.5 rounded">{score.user.education_type}</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="text-left pl-2">
                                    <p className="text-xl font-black text-slate-800">{points.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-medium text-left">نقطة</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Current User Fixed Banner */}
            {!loading && data.currentUser && data.top.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 sm:left-64 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-40 transform transition-transform">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold tracking-widest mb-1">مرتبتك</span>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${data.currentUser.rank <= 3 ? 'bg-amber-100 text-amber-600 shadow-md shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'}`}>
                                    {data.currentUser.rank}
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{data.currentUser.user?.name}</p>
                                <p className="text-xs text-slate-500 font-medium">{isWeekly ? data.currentUser.weekly_points : data.currentUser.total_points} نقطة {isWeekly ? 'هذا الأسبوع' : 'إجمالاً'}</p>
                            </div>
                        </div>
                        
                        {/* Motivation */}
                        {data.currentUser.rank === '—' && (
                            <div className="hidden sm:flex text-sm font-semibold text-primary items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                                أكمل مهمتك الأولى لتدخل التصنيف!
                            </div>
                        )}
                        {data.currentUser.rank > 3 && (
                            <div className="hidden sm:flex text-xs font-medium text-slate-500 items-center justify-end">
                                أكمل المزيد من المهام للتقدم في الترتيب<br/>كل مهمة تصنع فرقاً!
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
