'use client';

import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Radio, BookOpen, Users, CreditCard } from 'lucide-react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';

/**
 * Map each nav item to the permissions required to see it.
 */
const NAV_ITEMS = [
    {
        href: '/Teacher/dashboard',
        label: 'لوحة التحكم',
        icon: LayoutDashboard,
        permissions: [],
    },
    {
        href: '/Teacher/live',
        label: 'البث المباشر',
        icon: Radio,
        permissions: ['create_lessons'],
    },
    {
        href: '/Teacher/upload-center',
        label: 'المقررات',
        icon: BookOpen,
        permissions: ['create_lessons', 'edit_lessons'],
    },
    {
        href: '/Teacher/students',
        label: 'الطلاب',
        icon: Users,
        permissions: ['view_students', 'manage_students'],
    },
    {
        href: '/Teacher/payment-settings',
        label: 'المدفوعات',
        icon: CreditCard,
        permissions: ['view_payments', 'approve_payments', 'reject_payments'],
    },
];

export default function TeacherLayout({ children }) {
    const { user, isLoading, logout } = useAuth();
    const { isOwner, isAssistant, hasAnyPermission, roleBadge } = usePermissions();
    const router = useRouter();
    const pathname = usePathname();
    
    // Sidebar States
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true); // Default to collapsed

    // Persistence with localStorage
    useEffect(() => {
        const storedState = localStorage.getItem('fittna-sidebar-collapsed');
        if (storedState !== null) {
            setIsDesktopCollapsed(storedState === 'true');
        }
    }, []);

    const handleDesktopCollapse = (newState) => {
        setIsDesktopCollapsed(newState);
        localStorage.setItem('fittna-sidebar-collapsed', String(newState));
    };

    useEffect(() => {
        if (!isLoading && (!user || (user.role !== 'instructor' && user.role !== 'assistant'))) {
            router.push('/?auth=login');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || (user.role !== 'instructor' && user.role !== 'assistant')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-bg">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    // Filter nav items based on permissions
    const visibleNav = NAV_ITEMS.filter((item) => {
        if (item.permissions.length === 0) return true;
        if (isOwner) return true;
        return hasAnyPermission(...item.permissions);
    });

    const title = visibleNav.find((i) => i.href === pathname)?.label || (pathname === '/profile' ? 'الملف الشخصي' : 'لوحة التحكم');

    return (
        <div className="min-h-screen bg-slate-bg flex font-sans" dir="rtl">
            <DashboardSidebar
                user={user}
                roleBadge={roleBadge}
                isAssistant={isAssistant}
                isOwner={isOwner}
                visibleNav={visibleNav}
                logout={logout}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
                isDesktopCollapsed={isDesktopCollapsed}
                setIsDesktopCollapsed={handleDesktopCollapse}
            />

            <div className="flex-1 min-w-0 flex flex-col min-h-screen">
                <DashboardHeader
                    title={title}
                    isMobileOpen={isMobileOpen}
                    setIsMobileOpen={setIsMobileOpen}
                    isDesktopCollapsed={isDesktopCollapsed}
                    setIsDesktopCollapsed={handleDesktopCollapse}
                />

                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
