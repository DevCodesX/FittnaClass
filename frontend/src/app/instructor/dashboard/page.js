'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { instructorAPI } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';

export default function InstructorDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ pending: 0 });
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await instructorAPI.getPendingStudents();
                setStats({ pending: res.data.count || 0 });

                // Check if payment methods are set up (if no pending and we got a response, check onboarding)
                // We'll show onboarding modal if first visit
                const hasSeenOnboarding = localStorage.getItem('fittnaclass_onboarding_seen');
                if (!hasSeenOnboarding) {
                    setShowOnboarding(true);
                    localStorage.setItem('fittnaclass_onboarding_seen', 'true');
                }
            } catch {
                // If error fetching, still show dashboard
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const STAT_CARDS = [
        {
            label: 'Pending Enrollments',
            value: stats.pending,
            icon: '⏳',
            color: 'bg-amber/10 text-amber',
            href: '/instructor/students',
        },
        {
            label: 'Upload Center',
            value: 'Create',
            icon: '📤',
            color: 'bg-emerald/10 text-emerald',
            href: '/instructor/upload-center',
        },
        {
            label: 'Payment Settings',
            value: 'Manage',
            icon: '💳',
            color: 'bg-primary/10 text-primary',
            href: '/instructor/payment-settings',
        },
    ];

    return (
        <div>
            {/* Welcome */}
            <div className="mb-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">
                    Welcome back, {user?.name?.split(' ')[0]} 👋
                </h2>
                <p className="text-slate-500">Here&apos;s your instructor overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {STAT_CARDS.map((card, i) => (
                    <Link
                        key={i}
                        href={card.href}
                        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group animate-slide-up"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${card.color}`}>
                                {card.icon}
                            </div>
                            <svg className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{loading ? '—' : card.value}</p>
                        <p className="text-sm text-slate-500">{card.label}</p>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-fade-in">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                        href="/instructor/upload-center"
                        className="touch-target flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                        <span className="text-2xl">📚</span>
                        <div>
                            <p className="font-medium text-slate-800">Create New Course</p>
                            <p className="text-xs text-slate-400">Add a course with video lessons</p>
                        </div>
                    </Link>
                    <Link
                        href="/instructor/students"
                        className="touch-target flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                        <span className="text-2xl">📋</span>
                        <div>
                            <p className="font-medium text-slate-800">Review Enrollments</p>
                            <p className="text-xs text-slate-400">Approve or reject pending students</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Onboarding Modal */}
            <Modal
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                title="Welcome to FittnaClass! 🎉"
                size="md"
            >
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                            <span className="text-3xl">👨‍🏫</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Complete Your Profile</h3>
                        <p className="text-slate-500 text-sm">
                            Set up your payment methods so students can enroll in your courses.
                        </p>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-emerald-light/50 rounded-xl">
                            <span className="text-lg">✅</span>
                            <span className="text-sm text-slate-700">Account created</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-amber-light/50 rounded-xl">
                            <span className="text-lg">⚠️</span>
                            <span className="text-sm font-medium text-slate-700">Add payment methods (Vodafone Cash, InstaPay, etc.)</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <span className="text-lg">📤</span>
                            <span className="text-sm text-slate-500">Create your first course</span>
                        </div>
                    </div>

                    <Link
                        href="/instructor/payment-settings"
                        onClick={() => setShowOnboarding(false)}
                        className="touch-target block w-full py-3.5 text-center gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                    >
                        Set Up Payment Methods →
                    </Link>
                    <button
                        onClick={() => setShowOnboarding(false)}
                        className="touch-target block w-full py-3 text-center text-sm text-slate-400 hover:text-slate-600 mt-2"
                    >
                        I&apos;ll do it later
                    </button>
                </div>
            </Modal>
        </div>
    );
}
