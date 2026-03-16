'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
    { href: '/instructor/dashboard', label: 'Dashboard', icon: 'ðŸ“Š' },
    { href: '/instructor/upload-center', label: 'Upload Center', icon: 'ðŸ“¤' },
    { href: '/instructor/students', label: 'Students', icon: 'ðŸ‘¨â€ðŸŽ“' },
    { href: '/instructor/payment-settings', label: 'Payments', icon: 'ðŸ’³' },
];

export default function InstructorLayout({ children }) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'instructor')) {
            router.push('/?auth=login');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || user.role !== 'instructor') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-bg">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-bg flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-100">
                        <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">FT</span>
                        </div>
                        <span className="text-lg font-bold text-primary">FittnaClass</span>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 py-4 px-3 space-y-1">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`touch-target flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === item.href
                                        ? 'bg-primary/5 text-primary'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* User */}
                    <div className="p-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                                <p className="text-xs text-slate-400">Instructor</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="touch-target w-full py-2.5 text-sm text-slate-500 hover:text-rose hover:bg-rose-light rounded-lg transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 min-w-0">
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 h-16 flex items-center px-4 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="touch-target lg:hidden mr-3 text-slate-500 hover:text-slate-700"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-semibold text-slate-800">
                        {NAV_ITEMS.find((i) => i.href === pathname)?.label || 'Dashboard'}
                    </h1>
                </header>

                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}

