'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/Toast';
import { teacherAPI } from '@/lib/api';
import { useState } from 'react';
import { useConfirm } from '@/context/ConfirmContext';

export default function StudentDetailsPanel({ student, onUpdateStudent, onRemoveStudent, onClose }) {
    const { hasAnyPermission } = usePermissions();
    const canManage = hasAnyPermission('manage_students');
    const toast = useToast();
    const confirm = useConfirm();

    const [isSaving, setIsSaving] = useState(false);

    if (!student) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="w-16 h-16 mb-4 flex items-center justify-center bg-white rounded-full shadow-sm text-2xl">
                    👨‍🎓
                </div>
                <p>اختر طالباً من القائمة لعرض التفاصيل</p>
            </div>
        );
    }

    const handleToggleStatus = async () => {
        if (!canManage || isSaving) return;
        const isCurrentlySuspended = student.status === 'suspended';
        const actionLabel = isCurrentlySuspended ? 'تفعيل' : 'إيقاف';
        const isConfirmed = await confirm({
            title: `${actionLabel} الحساب`,
            message: `هل أنت متأكد من ${actionLabel} حساب هذا الطالب؟`
        });
        
        if (isConfirmed) {
            try {
                setIsSaving(true);
                await teacherAPI.suspendStudent(student.id, !isCurrentlySuspended);
                const newStatus = isCurrentlySuspended ? 'active' : 'suspended';
                onUpdateStudent(student.id, { status: newStatus });
                toast.success(`تم ${actionLabel} الحساب بنجاح`);
            } catch (error) {
                toast.error(error.response?.data?.message || `فشل في ${actionLabel} الحساب`);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleRemove = async () => {
        if (!canManage || isSaving) return;
        const isConfirmed = await confirm({
            title: 'إزالة الطالب',
            message: 'الإزالة نهائية. هل أنت متأكد من إزالة هذا الطالب بالكامل؟'
        });

        if (isConfirmed) {
            try {
                setIsSaving(true);
                await teacherAPI.deleteStudent(student.id);
                onRemoveStudent(student.id);
                toast.success('تمت إزالة الطالب بالكامل');
                onClose(); // close panel
            } catch (error) {
                toast.error(error.response?.data?.message || 'فشل في إزالة الطالب');
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up sm:animate-fade-in relative">
            {/* Mobile close button */}
            <button
                onClick={onClose}
                className="absolute top-4 start-4 lg:hidden touch-target p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 z-10"
            >
                ✕
            </button>

            {/* Header / Profile Info */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white relative">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 shadow-sm border-2 border-white">
                        <span className="text-2xl font-bold text-primary">
                            {student.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
                    <p className="text-sm text-slate-500 mt-1" dir="ltr">{student.email}</p>

                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                            student.status === 'active' ? 'bg-emerald-light text-emerald-dark' : 'bg-rose-light text-rose-dark'
                        }`}>
                            {student.status === 'active' ? 'نشط' : 'موقوف'}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-md">
                            {student.grade} - {student.track}
                        </span>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                        <p className="text-xs text-slate-500 font-medium mb-1">تاريخ الانضمام</p>
                        <p className="text-sm font-bold text-slate-800">
                            {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(student.joinDate))}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                        <p className="text-xs text-slate-500 font-medium mb-1">آخر نشاط</p>
                        <p className="text-sm font-bold text-slate-800">
                            {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(student.lastActive))}
                        </p>
                    </div>
                </div>

                {/* Subscriptions */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span>📚</span> المقررات المشترك بها
                    </h4>
                    {student.curriculums && student.curriculums.length > 0 ? (
                        <div className="space-y-2">
                            {student.curriculums.map((curr, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                    <span className="text-sm font-semibold text-slate-700">{curr}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-light text-emerald-dark rounded">
                                        مسجل
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 text-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            لا يوجد مقررات مسجلة
                        </p>
                    )}
                </div>

                {/* Payment History summary */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span>💳</span> حالة الدفع العامة
                    </h4>
                    <div className={`p-4 rounded-xl border ${
                        student.paymentStatus === 'paid' ? 'bg-emerald-light/30 border-emerald-200' : 'bg-rose-light/30 border-rose-200'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800">
                                {student.paymentStatus === 'paid' ? 'جميع المدفوعات مكتملة' : 'توجد مستحقات متأخرة'}
                            </span>
                            <span className="text-xl">
                                {student.paymentStatus === 'paid' ? '✅' : '⚠️'}
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Actions Footer */}
            {canManage && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                    <button
                        onClick={handleToggleStatus}
                        disabled={isSaving}
                        className={`touch-target flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${
                            student.status === 'active' 
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                : 'bg-emerald text-white hover:bg-emerald-dark'
                        }`}
                    >
                        {isSaving ? 'جاري الحفظ...' : (student.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب')}
                    </button>
                    <button
                        onClick={handleRemove}
                        disabled={isSaving}
                        className="touch-target px-4 py-2.5 text-sm font-bold bg-white text-rose border border-rose-200 hover:bg-rose-light hover:border-transparent rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isSaving ? '...' : 'إزالة'}
                    </button>
                </div>
            )}
            {!canManage && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                    <p className="text-xs text-slate-400">ليس لديك صلاحية لتعديل بيانات هذا الطالب</p>
                </div>
            )}
        </div>
    );
}
