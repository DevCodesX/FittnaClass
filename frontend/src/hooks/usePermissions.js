'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';

const PermissionsContext = createContext(null);

/**
 * All possible granular permissions.
 * Keep in sync with backend ALL_PERMISSIONS.
 */
export const ALL_PERMISSIONS = [
    'view_payments',
    'approve_payments',
    'reject_payments',
    'create_lessons',
    'edit_lessons',
    'delete_lessons',
    'view_students',
    'manage_students',
];

export function PermissionsProvider({ children }) {
    const { user, token } = useAuth();
    const [adminRecords, setAdminRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || !user) {
            setAdminRecords([]);
            setLoading(false);
            return;
        }

        // Only fetch permissions for assistants (instructors are owners, students don't need this)
        if (user.role !== 'assistant') {
            setAdminRecords([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        async function fetchPermissions() {
            try {
                const res = await authAPI.getMyPermissions();
                if (!cancelled) {
                    setAdminRecords(res.data.data.adminRecords || []);
                }
            } catch (err) {
                console.error('[usePermissions] Failed to fetch:', err.message);
                if (!cancelled) setAdminRecords([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchPermissions();

        return () => { cancelled = true; };
    }, [user, token]);

    const value = useMemo(() => {
        const isOwner = user?.role === 'instructor';
        const isAssistant = user?.role === 'assistant';

        // Flatten all permissions across all curricula
        const allPermissions = new Set();
        for (const record of adminRecords) {
            for (const perm of record.permissions || []) {
                allPermissions.add(perm);
            }
        }

        /**
         * Check if user has a specific permission.
         * Teachers (owners) always return true.
         * @param {string} permission - permission key to check
         * @param {number} [curriculumId] - optional specific curriculum
         */
        function hasPermission(permission, curriculumId) {
            if (isOwner) return true;
            if (!isAssistant) return false;

            if (curriculumId) {
                const record = adminRecords.find((r) => r.curriculumId === curriculumId);
                return record?.permissions?.includes(permission) ?? false;
            }

            return allPermissions.has(permission);
        }

        /**
         * Check if user has ANY of the given permissions.
         */
        function hasAnyPermission(...permissions) {
            if (isOwner) return true;
            return permissions.some((p) => allPermissions.has(p));
        }

        /**
         * Get curricula where the assistant is assigned.
         */
        const adminCurricula = adminRecords.map((r) => r.curriculum).filter(Boolean);

        return {
            isOwner,
            isAssistant,
            hasPermission,
            hasAnyPermission,
            allPermissions: [...allPermissions],
            adminRecords,
            adminCurricula,
            loading,
            roleBadge: isOwner ? 'مدرس' : isAssistant ? 'مشرف' : '',
        };
    }, [user, adminRecords, loading]);

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
}

/**
 * Hook to access RBAC permissions throughout the app.
 */
export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}

/**
 * Component-level guard — renders children only if permission check passes.
 */
export function PermissionGate({ permission, permissions, fallback = null, children }) {
    const { hasPermission, hasAnyPermission } = usePermissions();

    if (permission && !hasPermission(permission)) return fallback;
    if (permissions && !hasAnyPermission(...permissions)) return fallback;

    return children;
}
