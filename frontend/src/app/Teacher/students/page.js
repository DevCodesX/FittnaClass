'use client';

import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import AccessDenied from '@/components/ui/AccessDenied';
import RequestsTab from './components/RequestsTab';
import StudentsTab from './components/StudentsTab';

export default function StudentsManagementPage() {
    const { hasAnyPermission, loading: permsLoading } = usePermissions();
    const [activeTab, setActiveTab] = useState('requests');

    // Permission gate: require view_students or manage_students
    if (!permsLoading && !hasAnyPermission('view_students', 'manage_students')) {
        return <AccessDenied message="ليس لديك صلاحية لعرض أو إدارة الطلاب." />;
    }

    if (permsLoading) {
        return (
            <div className="flex bg-slate-bg items-center justify-center p-12">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto flex flex-col h-[calc(100vh-6rem)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 animate-fade-in shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">إدارة الطلاب</h2>
                    <p className="text-slate-500 mt-1">
                        مراجعة طلبات التسجيل وإدارة بيانات الطلاب والاشتراكات
                    </p>
                </div>
                
                {/* Tabs Container */}
                <div className="flex p-1 bg-slate-100/80 rounded-xl max-w-sm">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`touch-target flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'requests'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        الطلبات المعلقة
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`touch-target flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'students'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        الطلاب المقبولين
                    </button>
                </div>
            </div>

            {/* Content Area - Designed to stretch for the split layout of StudentsTab */}
            <div className="flex-1 min-h-0">
                {activeTab === 'requests' ? <RequestsTab /> : <StudentsTab />}
            </div>
        </div>
    );
}
