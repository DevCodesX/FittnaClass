'use client';

import { usePermissions } from '@/hooks/usePermissions';
import AccessDenied from '@/components/ui/AccessDenied';
import PaymentSettings from '@/components/payment/PaymentSettings';

export default function PaymentSettingsPage() {
    const { hasAnyPermission, loading: permsLoading } = usePermissions();

    // Permission gate: require view_payments or approve_payments (matches original logic)
    if (!permsLoading && !hasAnyPermission('view_payments', 'approve_payments', 'reject_payments')) {
        return <AccessDenied message="ليس لديك صلاحية للوصول إلى إعدادات المدفوعات." />;
    }

    if (permsLoading) {
        return (
            <div className="flex justify-center items-center py-20 min-h-[400px]">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return <PaymentSettings />;
}
