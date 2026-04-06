'use client';

import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { studentAPI } from '@/lib/api';

// ─── Helpers ───────────────────────────────────────────────────
function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Heatmap Component ─────────────────────────────────────────
function ActivityHeatmap({ data }) {
    const today = new Date();

    // Build 26 weeks (182 days) of cells
    const cells = useMemo(() => {
        const map = {};
        for (const d of data) map[d.date] = d;

        const result = [];
        for (let i = 181; i >= 0; i--) {
            const dt = new Date(today);
            dt.setDate(dt.getDate() - i);
            const ds = fmtDate(dt);
            const activity = map[ds];
            result.push({
                date: ds,
                day: dt.getDay(),
                tasks: activity?.tasks || 0,
                points: activity?.points || 0,
                minutes: activity?.minutes || 0,
            });
        }
        return result;
    }, [data]);

    // Group by week column
    const weeks = useMemo(() => {
        const w = [];
        let current = [];
        for (const cell of cells) {
            current.push(cell);
            if (cell.day === 5) { // Friday = end of week in Arabic calendar
                w.push(current);
                current = [];
            }
        }
        if (current.length > 0) w.push(current);
        return w;
    }, [cells]);

    const getColor = (tasks) => {
        if (tasks === 0) return 'bg-slate-100';
        if (tasks <= 2) return 'bg-emerald-200';
        if (tasks <= 5) return 'bg-emerald-400';
        if (tasks <= 10) return 'bg-emerald-500';
        return 'bg-emerald-700';
    };

    const [tooltip, setTooltip] = useState(null);

    const dayLabels = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                    نشاطك على مدار 6 أشهر
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>أقل</span>
                    <div className="flex gap-[2px]">
                        {['bg-slate-100', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-700'].map((c, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
                        ))}
                    </div>
                    <span>أكثر</span>
                </div>
            </div>

            <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                <div className="flex gap-[3px] min-w-[620px]" dir="ltr">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[3px] ml-1 text-[9px] text-slate-400 font-medium" style={{ paddingTop: '2px' }}>
                        {dayLabels.map((l, i) => (
                            <div key={i} className="h-[12px] flex items-center" style={{ lineHeight: '12px' }}>
                                {i % 2 === 0 ? l : ''}
                            </div>
                        ))}
                    </div>
                    {/* Weeks */}
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px]">
                            {Array.from({ length: 7 }, (_, dayIdx) => {
                                const cell = week.find(c => c.day === dayIdx);
                                if (!cell) return <div key={dayIdx} className="w-[12px] h-[12px]" />;
                                return (
                                    <div
                                        key={dayIdx}
                                        className={`w-[12px] h-[12px] rounded-[2px] ${getColor(cell.tasks)} transition-all hover:ring-2 hover:ring-primary/40 cursor-pointer`}
                                        onMouseEnter={() => setTooltip(cell)}
                                        onMouseLeave={() => setTooltip(null)}
                                        title={`${cell.date}: ${cell.tasks} مهام · ${cell.points} نقطة`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && tooltip.tasks > 0 && (
                <div className="mt-2 text-[11px] text-slate-500 text-center animate-fade-in">
                    <span className="font-semibold text-slate-700">{tooltip.date}</span>
                    {' — '}
                    <span className="text-emerald font-bold">{tooltip.tasks}</span> مهام ·{' '}
                    <span className="text-primary font-bold">{tooltip.points}</span> نقطة
                    {tooltip.minutes > 0 && <> · <span className="text-amber font-bold">{tooltip.minutes}</span> دقيقة</>}
                </div>
            )}
        </div>
    );
}

// ─── Level Progress Component ───────────────────────────────────
function LevelProgress({ stats, levels }) {
    const currentLevelDef = levels?.find(l => l.level === stats.level) || { min: 0, title: stats.level_title };
    const nextLevel = stats.next_level;

    // Calculate progress to next level
    let pct = 100;
    if (nextLevel) {
        const levelRange = nextLevel.min - currentLevelDef.min;
        const progress = stats.total_points - currentLevelDef.min;
        pct = Math.min(100, Math.round((progress / levelRange) * 100));
    }

    return (
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 rounded-2xl p-5 text-white shadow-xl shadow-purple-500/15 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-12 -translate-y-12" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 translate-y-8" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <span className="text-2xl font-black">{stats.level}</span>
                        </div>
                        <div>
                            <p className="text-[11px] text-white/60 font-medium">المستوى</p>
                            <p className="text-lg font-bold">{stats.level_title}</p>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-2xl font-black">{stats.total_points.toLocaleString()}</p>
                        <p className="text-[10px] text-white/60 font-medium">نقطة</p>
                    </div>
                </div>

                {nextLevel && (
                    <div>
                        <div className="flex justify-between text-[10px] text-white/60 mb-1">
                            <span>المستوى {nextLevel.level}: {nextLevel.title}</span>
                            <span>{nextLevel.points_needed} نقطة متبقية</span>
                        </div>
                        <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-l from-amber-300 to-yellow-300 rounded-full transition-all duration-1000"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                )}

                {!nextLevel && (
                    <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <span className="text-[11px] text-white/80 font-semibold">أعلى مستوى!</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Streak Card Component ──────────────────────────────────────
function StreakCard({ current, longest }) {
    const isOnFire = current >= 3;

    return (
        <div className={`rounded-2xl border p-5 ${isOnFire ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOnFire ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-slate-100'}`}>
                        <span className="material-symbols-outlined text-white" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>
                            {isOnFire ? 'local_fire_department' : 'bedtime'}
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 font-medium">الاستمرارية</p>
                        <p className="text-sm font-bold text-slate-700">أيام متواصلة</p>
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-4">
                <div>
                    <p className={`text-4xl font-black ${isOnFire ? 'text-orange-500' : 'text-slate-700'}`}>{current}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">حالي</p>
                </div>
                <div className="mb-1">
                    <p className="text-lg font-bold text-slate-400">{longest}</p>
                    <p className="text-[10px] text-slate-400">أفضل</p>
                </div>
            </div>

            {isOnFire && (
                <p className="mt-2 text-[11px] text-orange-600 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>whatshot</span>
                    أنت مشتعل! واصل الالتزام
                </p>
            )}
            {current === 0 && (
                <p className="mt-2 text-[11px] text-slate-400">أكمل مهمة اليوم لبدء سلسلة جديدة!</p>
            )}
        </div>
    );
}

// ─── Achievement Card ───────────────────────────────────────────
function AchievementCard({ achievement }) {
    const unlocked = achievement.unlocked;

    return (
        <div className={`
            rounded-xl border p-3 transition-all duration-300
            ${unlocked
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100 shadow-sm'
                : 'bg-slate-50/50 border-slate-100 opacity-50 grayscale'
            }
        `}>
            <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    unlocked ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md shadow-amber-500/20' : 'bg-slate-200'
                }`}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                        {achievement.icon}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-bold ${unlocked ? 'text-slate-800' : 'text-slate-400'}`}>{achievement.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{achievement.description}</p>
                    {unlocked && achievement.points_reward > 0 && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-[1px] rounded mt-0.5 inline-block">+{achievement.points_reward} نقطة</span>
                    )}
                </div>
                {unlocked && (
                    <span className="material-symbols-outlined text-amber-500 flex-shrink-0" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>verified</span>
                )}
            </div>
        </div>
    );
}

// ─── Quick Stats Bar ────────────────────────────────────────────
function QuickStatsBar({ stats, achievementsCount }) {
    const items = [
        {
            icon: 'stars',
            label: 'النقاط',
            value: stats.total_points.toLocaleString(),
            color: 'text-primary',
            bg: 'bg-primary/8',
        },
        {
            icon: 'local_fire_department',
            label: 'الاستمرارية',
            value: `${stats.current_streak} يوم`,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
        },
        {
            icon: 'emoji_events',
            label: 'الإنجازات',
            value: achievementsCount,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
        },
        {
            icon: 'trending_up',
            label: 'أفضل سلسلة',
            value: `${stats.longest_streak} يوم`,
            color: 'text-emerald',
            bg: 'bg-emerald-light/40',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {items.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 text-center hover:shadow-sm transition-shadow">
                    <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mx-auto mb-1.5`}>
                        <span className={`material-symbols-outlined ${item.color}`} style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                    </div>
                    <p className="text-lg font-black text-slate-800">{item.value}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{item.label}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Main Dashboard Page ────────────────────────────────────────
export default function AchievementsPage() {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await studentAPI.getGamification();
                setData(res.data.data);
            } catch {
                toast.error('حدث خطأ في تحميل البيانات.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const unlockedCount = data?.achievements?.filter(a => a.unlocked).length || 0;

    if (loading) {
        return (
            <div className="py-8 animate-fade-in" dir="rtl">
                <div className="h-8 w-48 skeleton rounded-lg mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="h-44 skeleton rounded-2xl" />
                    <div className="h-44 skeleton rounded-2xl" />
                </div>
                <div className="h-36 skeleton rounded-2xl mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="py-5 sm:py-8 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                        إنجازاتي
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">تتبع تقدمك واحصل على إنجازات جديدة</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="mb-5">
                <QuickStatsBar stats={data.stats} achievementsCount={unlockedCount} />
            </div>

            {/* Level + Streak Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <LevelProgress stats={data.stats} levels={data.levels} />
                <StreakCard current={data.stats.current_streak} longest={data.stats.longest_streak} />
            </div>

            {/* Heatmap */}
            <div className="mb-5">
                <ActivityHeatmap data={data.heatmap} />
            </div>

            {/* Level Roadmap */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <span className="material-symbols-outlined text-indigo-500" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>route</span>
                    خريطة المستويات
                </h3>
                <div className="flex items-center gap-1 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                    {data.levels.map((lvl, i) => {
                        const reached = data.stats.level >= lvl.level;
                        const isCurrent = data.stats.level === lvl.level;
                        return (
                            <div key={lvl.level} className="flex items-center flex-shrink-0">
                                <div className={`
                                    flex flex-col items-center text-center px-2 py-1.5 rounded-lg transition-all
                                    ${isCurrent ? 'bg-indigo-50 border border-indigo-200 scale-110' : ''}
                                `}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                                        reached ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {lvl.level}
                                    </div>
                                    <span className={`text-[9px] font-semibold mt-0.5 ${reached ? 'text-indigo-600' : 'text-slate-300'}`}>{lvl.title}</span>
                                    <span className="text-[8px] text-slate-300">{lvl.min}+</span>
                                </div>
                                {i < data.levels.length - 1 && (
                                    <div className={`w-4 h-[2px] ${reached ? 'bg-indigo-300' : 'bg-slate-200'} flex-shrink-0`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Achievements Grid */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <span className="material-symbols-outlined text-amber-500" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                    الإنجازات
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mr-1">
                        {unlockedCount}/{data.achievements.length}
                    </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Unlocked first */}
                    {data.achievements
                        .sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0))
                        .map(ach => (
                            <AchievementCard key={ach.id} achievement={ach} />
                        ))
                    }
                </div>
            </div>

            {/* Point Values Info */}
            <div className="mt-5 bg-slate-50 rounded-xl border border-slate-100 p-4">
                <h4 className="text-[12px] font-bold text-slate-500 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                    نظام النقاط
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '14px' }}>menu_book</span>
                        <span className="text-slate-500">إكمال درس: <strong className="text-slate-700">10 نقاط</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-violet-500" style={{ fontSize: '14px' }}>replay</span>
                        <span className="text-slate-500">مراجعة: <strong className="text-slate-700">15 نقطة</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber" style={{ fontSize: '14px' }}>timer</span>
                        <span className="text-slate-500">مؤقت: <strong className="text-slate-700">8 نقاط</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '14px' }}>edit_note</span>
                        <span className="text-slate-500">مهمة مخصصة: <strong className="text-slate-700">5 نقاط</strong></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
