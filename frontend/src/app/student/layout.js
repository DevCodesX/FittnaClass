'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import NotificationDropdown from '@/components/ui/NotificationDropdown';

export default function StudentLayout({ children }) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'student')) {
            router.push('/?auth=login');
        }
    }, [user, isLoading, router]);

    // Handle outside click and Escape key using controlled state
    useEffect(() => {
        const handleOutsideClick = (event) => {
            // Close dropdown when clicking outside
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener("click", handleOutsideClick);
            document.addEventListener("keydown", handleEscapeKey);
        }

        return () => {
            document.removeEventListener("click", handleOutsideClick);
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isDropdownOpen]);

    if (isLoading || !user || user.role !== 'student') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const isFullWidthContentRoute = pathname.startsWith('/student/watch') || pathname.startsWith('/student/live');

    if (isFullWidthContentRoute) {
        return <div className="min-h-screen bg-slate-900">{children}</div>;
    }

    return (
        <div className="bg-background-light min-h-screen flex flex-col">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl ml-auto mr-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-3 md:gap-4">
                        {/* Left controls: Account -> Notifications -> Explore -> My Courses */}
                        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                            <div className="relative" ref={dropdownRef}>
                                <div 
                                    className="h-8 w-8 rounded-full bg-primary/10 overflow-hidden border border-slate-300 flex items-center justify-center cursor-pointer"
                                    onClick={() => setIsDropdownOpen(prev => !prev)}
                                >
                                    {user.avatar_url ? (
                                        <img src={`${process.env.NEXT_PUBLIC_BASE_URL || ''}${user.avatar_url}`} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-primary font-semibold text-sm">
                                            {user.name?.charAt(0)?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {/* Dropdown */}
                                {isDropdownOpen && (
                                    <div 
                                        className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="px-4 py-2 border-b border-slate-100">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                                            <p className="text-xs text-slate-400">طالب</p>
                                        </div>
                                        <Link 
                                            href="/student/my-courses" 
                                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            مقرراتي
                                        </Link>
                                        <Link 
                                            href="/student/planner" 
                                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            جدول المذاكرة
                                        </Link>
                                        <Link 
                                            href="/student/achievements" 
                                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            إنجازاتي
                                        </Link>
                                        <Link 
                                            href="/student/leaderboard" 
                                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            لوحة الشرف
                                        </Link>
                                        <Link 
                                            href="/profile" 
                                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary border-b border-slate-100"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            الملف الشخصي
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setIsDropdownOpen(false);
                                                logout();
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50"
                                        >
                                            تسجيل الخروج
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <NotificationDropdown />

                            <Link
                                href="/student/explore"
                                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary transition-colors"
                            >
                                استكشاف
                            </Link>
                            <Link
                                href="/student/planner"
                                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary transition-colors"
                            >
                                جدول المذاكرة
                            </Link>
                            <Link
                                href="/student/achievements"
                                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary transition-colors"
                            >
                                إنجازاتي
                            </Link>
                            <Link
                                href="/student/leaderboard"
                                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary transition-colors"
                            >
                                لوحة الشرف
                            </Link>
                            <Link
                                href="/student/my-courses"
                                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary transition-colors"
                            >
                                مقرراتي
                            </Link>
                        </nav>

                        {/* Search (desktop) */}
                        <div className="hidden md:flex flex-1 max-w-md">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:ring-primary focus:border-primary sm:text-sm"
                                    placeholder="بحث سريع عن المقررات..."
                                    type="text"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            router.push(`/student/explore?q=${encodeURIComponent(e.target.value)}`);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Logo */}
                        <Link href="/student/explore" className="flex items-center gap-2 shrink-0">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                                <span className="material-symbols-outlined">auto_stories</span>
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                Fittna<span className="text-primary">Class</span>
                            </h1>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl ml-auto mr-auto w-full px-4 sm:px-6 lg:px-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-12 border-t border-slate-200 bg-white py-6">
                <div className="max-w-7xl ml-auto mr-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">&copy; 2025 FittnaClass</p>
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 sm:justify-end">
                            <a className="transition-colors hover:text-[#0f2b5b]" href="#">الدعم الفني</a>
                            <a className="transition-colors hover:text-[#0f2b5b]" href="#">سياسة الخصوصية</a>
                            <a className="transition-colors hover:text-[#0f2b5b]" href="#">شروط الاستخدام</a>
                            <a className="transition-colors hover:text-[#0f2b5b]" href="#">مركز المساعدة</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
