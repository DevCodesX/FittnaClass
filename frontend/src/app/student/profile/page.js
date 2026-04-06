'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function StudentProfilePage() {
    // Mock user data for the static UI
    const [user] = useState({
        name: 'Ahmed Mohamed',
        email: 'ahmed@example.com',
        nationalId: '2981201010XXXX',
        role: 'student',
        grade_level: 'Secondary 3',
        joinedDate: 'Oct 2024',
        initials: 'AM',
        stats: {
            enrolledCourses: 5,
            hoursWatched: 24,
            certificates: 2
        }
    });

    const [enrolledCourses] = useState([
        { id: 1, code: 'PHY-101', title: 'Physics Fundamentals for Sec 3', teacher: 'Dr. Tarek Saleh' },
        { id: 2, code: 'MAT-203', title: 'Advanced Calculus & Algebra', teacher: 'Eng. Youssef Kamel' },
        { id: 3, code: 'CHM-102', title: 'Organic Chemistry Mastery', teacher: 'Dr. Mona Hassan' },
    ]);

    return (
        <div className="min-h-screen bg-slate-bg" style={{ fontFamily: "'Public Sans', 'Inter', sans-serif" }}>

            {/* ─── Hero / Cover Section ─── */}
            <div className="relative h-48 sm:h-64 w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2B5B 0%, #1a3a6c 50%, #0d2248 100%)' }}>
                {/* Background decorative elements */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#10B981] rounded-full blur-3xl" />
                </div>
            </div>

            {/* ─── Main Content Container ─── */}
            <div className="pb-16">

                {/* ─── Avatar & Header Info (Overlapping Hero) ─── */}
                <div className="relative -mt-16 sm:-mt-20 mb-8 sm:mb-12 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                    {/* Avatar */}
                    <div className="relative z-10">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#F1F5F9] bg-[#0F2B5B] flex items-center justify-center shadow-lg">
                            <span className="text-4xl sm:text-5xl font-bold text-white tracking-wider">
                                {user.initials}
                            </span>
                        </div>
                        {/* Active Badge */}
                        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-5 h-5 bg-emerald border-2 border-slate-bg rounded-full shadow-sm" title="Active Account" />
                    </div>

                    {/* Name & Title */}
                    <div className="text-center sm:text-left pb-2 sm:pb-4 z-10">
                        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1">{user.name}</h1>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <span className="text-sm font-medium text-[#64748B] capitalize">{user.role}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-sm font-medium text-[#64748B]">{user.grade_level}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#059669] uppercase tracking-wider">
                                Active
                            </span>
                        </div>
                    </div>

                    {/* Desktop Actions (Right aligned) */}
                    <div className="hidden sm:flex flex-1 justify-end pb-4 z-10">
                        <button className="touch-target inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-[#334155] text-sm font-semibold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Edit Profile
                        </button>
                    </div>
                </div>

                {/* Mobile Actions */}
                <div className="sm:hidden flex justify-center w-full mb-8">
                    <button className="touch-target inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-white border border-slate-200 text-[#334155] text-sm font-semibold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Edit Profile
                    </button>
                </div>

                {/* ─── Two Column Layout ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                    {/* LEFT COLUMN (Wider) */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8">

                        {/* Personal Information Card */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg sm:text-xl font-bold text-[#1E293B]">Personal Information</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                <div>
                                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Full Name</p>
                                    <p className="text-[#1E293B] font-medium">{user.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Email Address</p>
                                    <p className="text-[#1E293B] font-medium">{user.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">National ID</p>
                                    <p className="text-[#1E293B] font-medium font-mono">{user.nationalId}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Grade Level</p>
                                    <p className="text-[#1E293B] font-medium">{user.grade_level}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Member Since</p>
                                    <p className="text-[#1E293B] font-medium">{user.joinedDate}</p>
                                </div>
                            </div>
                        </section>

                        {/* Recent Courses Preview */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg sm:text-xl font-bold text-[#1E293B]">Active Courses</h2>
                                <Link href="/student/my-courses" className="text-sm font-semibold text-[#0F2B5B] hover:text-[#10B981] transition-colors flex items-center gap-1">
                                    View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </Link>
                            </div>

                            <div className="grid gap-4">
                                {enrolledCourses.map((course, idx) => (
                                    <Link key={course.id} href={`/student/watch/${course.id}`} className={`group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald/30 hover:bg-emerald/5 transition-all animate-slide-up`} style={{ animationDelay: `${0.1 + (idx * 0.05)}s` }}>
                                        <div className="w-12 h-12 rounded-lg bg-[#0F2B5B]/10 flex items-center justify-center shrink-0 group-hover:bg-[#10B981]/20 transition-colors">
                                            <span className="text-xl">📚</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 font-mono tracking-tight group-hover:bg-emerald/10 group-hover:text-emerald-dark">
                                                    {course.code}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-[#1E293B] text-sm sm:text-base truncate group-hover:text-[#0F2B5B] transition-colors">{course.title}</h3>
                                            <p className="text-xs text-[#64748B] truncate">{course.teacher}</p>
                                        </div>
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-[#94A3B8] group-hover:bg-[#10B981] group-hover:text-white transition-colors shrink-0">
                                            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN (Narrower) */}
                    <div className="space-y-6 sm:space-y-8">

                        {/* Learning Stats Card */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <h2 className="text-lg font-bold text-[#1E293B] mb-5">Learning Progress</h2>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                    <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">school</span>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-[#1E293B] leading-none mb-1">{user.stats.enrolledCourses}</p>
                                        <p className="text-xs font-medium text-[#64748B]">Enrolled Courses</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                    <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">schedule</span>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-[#1E293B] leading-none mb-1">{user.stats.hoursWatched}h</p>
                                        <p className="text-xs font-medium text-[#64748B]">Hours Learned</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                    <div className="w-10 h-10 rounded-lg bg-[#0F2B5B]/10 text-[#0F2B5B] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">workspace_premium</span>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-[#1E293B] leading-none mb-1">{user.stats.certificates}</p>
                                        <p className="text-xs font-medium text-[#64748B]">Certificates Earned</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Referral & Wallet Card */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                            <h2 className="text-lg font-bold text-[#1E293B] mb-5">الإحالة والمحفظة</h2>

                            <div className="space-y-4">
                                {/* Referral Code */}
                                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-emerald/5 border border-primary/10">
                                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">كود الإحالة الخاص بك</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-mono font-bold text-primary tracking-widest">{user.referralCode || '------'}</span>
                                        <button
                                            onClick={() => {
                                                if (user.referralCode) {
                                                    navigator.clipboard.writeText(user.referralCode);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-white/80 transition-colors"
                                            title="نسخ الكود"
                                        >
                                            <span className="material-symbols-outlined text-[16px] text-[#64748B]">content_copy</span>
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-[#64748B] mt-2">شارك هذا الكود مع أصدقائك واحصل على رصيد عند تسجيلهم!</p>
                                </div>

                                {/* Wallet Balance */}
                                <div className="flex items-center gap-4 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">account_balance_wallet</span>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-[#1E293B] leading-none mb-1">{user.walletBalance?.toFixed(2) || '0.00'} ج.م</p>
                                        <p className="text-xs font-medium text-[#64748B]">رصيد المحفظة</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Quick Actions Card */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <h2 className="text-lg font-bold text-[#1E293B] mb-5">Quick Actions</h2>

                            <div className="space-y-2.5">
                                <Link href="/student/explore" className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-semibold text-[#334155] hover:bg-slate-50 hover:text-[#0F2B5B] transition-colors border border-transparent hover:border-slate-200">
                                    <span className="material-symbols-outlined text-[20px] text-[#0F2B5B]">search</span>
                                    Find New Courses
                                </Link>
                                <button className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-semibold text-[#334155] hover:bg-slate-50 hover:text-[#0F2B5B] transition-colors border border-transparent hover:border-slate-200">
                                    <span className="material-symbols-outlined text-[20px] text-[#0F2B5B]">notifications</span>
                                    Notification Settings
                                </button>
                                <button className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-semibold text-[#334155] hover:bg-slate-50 hover:text-[#0F2B5B] transition-colors border border-transparent hover:border-slate-200">
                                    <span className="material-symbols-outlined text-[20px] text-[#0F2B5B]">help</span>
                                    Help & Support
                                </button>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
}
