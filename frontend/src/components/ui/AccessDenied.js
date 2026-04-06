'use client';

import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';

/**
 * Full-page access denied screen for assistants without required permissions.
 */
export default function AccessDenied({ requiredPermission, message }) {
    const { isAssistant, roleBadge } = usePermissions();

    return (
        <div className="max-w-md mx-auto text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-rose/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🚫</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">صلاحية غير متوفرة</h2>
            <p className="text-slate-500 mb-2">
                {message || 'ليس لديك الصلاحية للوصول إلى هذا القسم.'}
            </p>
            {isAssistant && (
                <p className="text-xs text-slate-400 mb-8">
                    أنت مسجل كـ <strong>{roleBadge}</strong> — تواصل مع مالك المقرر لتحديث صلاحياتك.
                </p>
            )}
            <Link
                href="/Teacher/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark transition-colors"
            >
                العودة للوحة التحكم
            </Link>
        </div>
    );
}
