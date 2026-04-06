'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LogOut, User as UserIcon } from 'lucide-react';

export default function DashboardSidebar({
    user,
    roleBadge,
    isAssistant,
    isOwner,
    visibleNav,
    logout,
    isMobileOpen,
    setIsMobileOpen,
    isDesktopCollapsed,
    setIsDesktopCollapsed
}) {
    const pathname = usePathname();
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Effect for keyboard accessibility (ESC on mobile)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isMobileOpen) {
                setIsMobileOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileOpen, setIsMobileOpen]);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    // Determines if the sidebar content should be visually expanded
    const isExpanded = isHovered || !isDesktopCollapsed;

    // To prevent hydration flicker, wait for mount
    if (!mounted) {
        return <div className="hidden lg:block w-[70px] bg-white border-e border-slate-200" />;
    }

    return (
        <>
            {/* Mobile Backdrop */}
            <div 
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar Placeholder for Desktop to push content */}
            <aside className={`hidden lg:block relative z-40 transition-[width] duration-300 ease-in-out shrink-0 ${isDesktopCollapsed ? 'w-[78px]' : 'w-[260px]'}`} />

            {/* Actual Sidebar Content */}
            <div
                className={`fixed inset-y-0 start-0 z-50 bg-white border-e border-slate-200 h-full flex flex-col transition-all duration-300 ease-in-out transform 
                    ${isMobileOpen ? 'translate-x-0 shado-xl' : 'translate-x-full lg:translate-x-0'} 
                    ${isExpanded ? 'w-[260px]' : 'w-[78px]'}
                `}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                dir="rtl"
            >
                {/* Logo Area */}
                <div className={`flex items-center h-20 px-5 border-b border-slate-100 shrink-0 overflow-hidden`}>
                    <div className="flex items-center gap-4 transition-all duration-300 w-[260px]">
                        <div className="w-10 h-10 shrink-0 bg-gradient-to-tr from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform duration-200 group-hover:scale-105">
                            {isOwner ? (
                                <GraduationCap className="w-5 h-5 text-white" />
                            ) : (
                                <span className="text-white font-black text-sm">FT</span>
                            )}
                        </div>
                        <span className={`text-xl font-black text-slate-800 tracking-tight transition-opacity duration-200 whitespace-nowrap ${isExpanded ? 'opacity-100 delay-100' : 'opacity-0 w-0'}`}>
                            FittnaClass
                        </span>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {visibleNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <div key={item.href} className="relative group">
                                <Link
                                    href={item.href}
                                    onClick={() => {
                                        setIsMobileOpen(false);
                                    }}
                                    className={`relative flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all duration-300 ${
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                >
                                    {/* Active border indicator */}
                                    {isActive && (
                                        <div className="absolute start-0 inset-y-1.5 w-1 bg-primary rounded-e-full" />
                                    )}

                                    <div className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-primary scale-110' : 'group-hover:scale-110'}`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className={`font-semibold whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 w-0'}`}>
                                        {item.label}
                                    </span>
                                </Link>

                                {/* Tooltip for collapsed state */}
                                {!isExpanded && (
                                    <div className="absolute start-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                                        {item.label}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Section bottom */}
                <div className="p-3 border-t border-slate-100 overflow-hidden shrink-0">
                    <div className={`flex flex-col gap-3 transition-all duration-300 w-[260px]`}>
                        {/* Profile Link Area */}
                        {isExpanded ? (
                            <Link href="/profile" className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors" onClick={() => setIsMobileOpen(false)}>
                                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 bg-white`}>
                                    {user.avatar_url ? (
                                        <img src={`${process.env.NEXT_PUBLIC_BASE_URL || ''}${user.avatar_url}`} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-500 font-bold">
                                            {user.name?.charAt(0)?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                            isAssistant ? 'bg-indigo-100 text-indigo-700' : 'bg-primary/10 text-primary'
                                        }`}>
                                            {isAssistant ? 'مساعد' : 'معلم'} 
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <Link href="/profile" className="flex items-center justify-center w-12 h-12 rounded-xl hover:bg-slate-50 transition-colors mx-auto relative group">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center">
                                     {user.avatar_url ? (
                                        <img src={`${process.env.NEXT_PUBLIC_BASE_URL || ''}${user.avatar_url}`} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-500 font-bold">
                                            {user.name?.charAt(0)?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                 {/* Tooltip */}
                                 <div className="absolute start-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                     الملف الشخصي
                                 </div>
                            </Link>
                        )}
                        

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className={`flex items-center text-sm font-semibold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors
                                ${isExpanded ? 'gap-3 px-3 py-2.5 w-[230px]' : 'justify-center w-12 h-12 mx-auto relative group'}
                            `}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            {isExpanded && <span className="whitespace-nowrap transition-opacity text-start w-full">تسجيل الخروج</span>}
                            {!isExpanded && (
                                <div className="absolute start-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                    تسجيل الخروج
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
