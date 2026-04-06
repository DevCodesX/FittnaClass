'use client';

import { Menu, X } from 'lucide-react';
import NotificationDropdown from '@/components/ui/NotificationDropdown';

export default function DashboardHeader({
    title,
    isMobileOpen,
    setIsMobileOpen,
    isDesktopCollapsed,
    setIsDesktopCollapsed
}) {
    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center px-4 lg:px-8 transition-colors duration-300">
            {/* Desktop Toggle Button */}
            <button
                onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                className="hidden lg:flex items-center justify-center p-2 me-4 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group"
                aria-label="تبديل القائمة الجانبية"
            >
                <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-105 group-hover:text-primary" />
            </button>

            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden flex items-center justify-center p-2 me-3 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group"
                aria-label="فتح القائمة الجانبية"
            >
                <svg className="w-6 h-6 transition-transform duration-200 group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Title */}
            <h1 className="text-lg font-bold text-slate-800 tracking-tight flex-1">
                {title}
            </h1>
            
            {/* Right Side Actions */}
            <div className="ms-auto flex items-center gap-2 lg:gap-3">
                <NotificationDropdown />
            </div>
        </header>
    );
}
