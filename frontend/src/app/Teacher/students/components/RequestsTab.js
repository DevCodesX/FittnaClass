'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import ReceiptPreviewModal from '@/components/ReceiptPreviewModal';
import { teacherAPI } from '@/lib/api';
import { useConfirm } from '@/context/ConfirmContext';

export default function RequestsTab() {
    const toast = useToast();
    const confirm = useConfirm();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'verified'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [previewReceipt, setPreviewReceipt] = useState(null);
    const [previewEnrollmentId, setPreviewEnrollmentId] = useState(null);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const res = await teacherAPI.getPendingStudents();
            
            // Map backend data to frontend expectation
            const mappedData = (res.data.data || []).map(req => ({
                id: req.id,
                student: {
                    name: req.student?.name || 'طالب غير معروف',
                    email: req.student?.email || '',
                },
                grade: req.student?.grade_level || 'غير محدد',
                track: 'عام', // adjust if backend adds track
                course: {
                    title: req.curriculum?.title || 'مقرر غير معروف',
                    course_code: req.curriculum?.course_code || '',
                },
                paymentMethod: req.payment_method || 'مرفوع', // placeholder
                paymentStatus: req.status === 'pending' ? 'pending' : (req.status === 'approved' ? 'verified' : 'rejected'),
                payment_receipt_url: req.payment_receipt_url,
                date: req.enrollment_date,
            }));
            
            setRequests(mappedData);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
            toast.error('حدث خطأ أثناء جلب الطلبات.');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const filteredRequests = useMemo(() => {
        if (filter === 'all') return requests;
        return requests.filter(r => r.paymentStatus === filter);
    }, [requests, filter]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredRequests.map(r => r.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleToggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleApprove = async (id) => {
        const isConfirmed = await confirm({
            title: 'تأكيد القبول',
            message: 'هل أنت متأكد من قبول هذا الطلب؟'
        });
        if (isConfirmed) {
            try {
                await teacherAPI.updateEnrollmentStatus(id, 'approved');
                setRequests(prev => prev.filter(r => r.id !== id));
                toast.success('تم قبول الطلب بنجاح');
            } catch (error) {
                toast.error(error.response?.data?.message || 'فشلت عملية القبول.');
            }
        }
    };

    const handleReject = async (id) => {
        const isConfirmed = await confirm({
            title: 'تأكيد الرفض',
            message: 'هل أنت متأكد من رفض هذا الطلب؟'
        });
        if (isConfirmed) {
            try {
                await teacherAPI.updateEnrollmentStatus(id, 'rejected');
                setRequests(prev => prev.filter(r => r.id !== id));
                toast.success('تم رفض الطلب بنجاح');
            } catch (error) {
                toast.error(error.response?.data?.message || 'فشلت عملية الرفض.');
            }
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;
        const isConfirmed = await confirm({
            title: 'تأكيد القبول الجماعي',
            message: `هل أنت متأكد من قبول ${selectedIds.size} طلب؟`
        });
        if (isConfirmed) {
            let successCount = 0;
            for (const id of selectedIds) {
                try {
                    await teacherAPI.updateEnrollmentStatus(id, 'approved');
                    setRequests(prev => prev.filter(r => r.id !== id));
                    successCount++;
                } catch (e) {
                    console.error(`Failed to approve ${id}`, e);
                }
            }
            setSelectedIds(new Set());
            if (successCount > 0) toast.success(`تم قبول ${successCount} طلب بنجاح`);
        }
    };

    const handleBulkReject = async () => {
        if (selectedIds.size === 0) return;
        const isConfirmed = await confirm({
            title: 'تأكيد الرفض الجماعي',
            message: `هل أنت متأكد من رفض ${selectedIds.size} طلب؟`
        });
        if (isConfirmed) {
            let successCount = 0;
            for (const id of selectedIds) {
                try {
                    await teacherAPI.updateEnrollmentStatus(id, 'rejected');
                    setRequests(prev => prev.filter(r => r.id !== id));
                    successCount++;
                } catch (e) {
                    console.error(`Failed to reject ${id}`, e);
                }
            }
            setSelectedIds(new Set());
            if (successCount > 0) toast.success(`تم رفض ${successCount} طلب بنجاح`);
        }
    };

    const openReceipt = (enrollment) => {
        setPreviewReceipt(enrollment.payment_receipt_url);
        setPreviewEnrollmentId(enrollment.id);
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    {['all', 'pending', 'verified'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                filter === f
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {f === 'all' ? 'الكل' : f === 'pending' ? 'قيد المراجعة' : 'مؤكد'}
                        </button>
                    ))}
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 animate-fade-in">
                        <span className="text-sm font-medium text-slate-600">
                            تم تحديد {selectedIds.size}
                        </span>
                        <button
                            onClick={handleBulkApprove}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald rounded-lg hover:bg-emerald-dark transition-colors shadow-sm"
                        >
                            قبول المحدد
                        </button>
                        <button
                            onClick={handleBulkReject}
                            className="px-4 py-2 text-sm font-semibold text-white bg-rose rounded-lg hover:bg-rose-dark transition-colors shadow-sm"
                        >
                            رفض المحدد
                        </button>
                    </div>
                )}
            </div>

            {/* Table Container */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}
                    <table className="w-full text-start">
                        <thead className="bg-[#F7F9FC] border-b border-[#E5E7EB] sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-start">
                                    <input
                                        type="checkbox"
                                        checked={filteredRequests.length > 0 && selectedIds.size === filteredRequests.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-start">الطالب</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-start">الصف الدراسي</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-start">الشعبة / الكورس</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-start">الدفع</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-end">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!loading && filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        لا توجد طلبات مطابقة للفلتر وتحديدك الحالي.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(req => (
                                    <tr key={req.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.has(req.id) ? 'bg-primary/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(req.id)}
                                                onChange={() => handleToggleSelect(req.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-primary">
                                                        {req.student.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{req.student.name}</p>
                                                    <p className="text-xs text-slate-400" dir="ltr">{req.student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {req.grade}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-800 font-medium">{req.track}</p>
                                            <p className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded-md">
                                                {req.course.title}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-800">{req.paymentMethod}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    req.paymentStatus === 'verified' ? 'bg-emerald-light text-emerald-dark' :
                                                    req.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-rose-light text-rose-dark'
                                                }`}>
                                                    {req.paymentStatus === 'verified' ? 'مؤكد' : req.paymentStatus === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                                                </span>
                                                {req.payment_receipt_url && (
                                                    <button
                                                        onClick={() => openReceipt(req)}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        عرض الإيصال
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleApprove(req.id)}
                                                    className="touch-target px-3 py-1.5 text-xs font-bold text-white bg-emerald hover:bg-emerald-dark rounded-lg transition-colors"
                                                >
                                                    قبول
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    className="touch-target px-3 py-1.5 text-xs font-bold text-rose hover:bg-rose-light hover:text-rose-dark rounded-lg transition-colors border border-transparent hover:border-rose-300"
                                                >
                                                    رفض
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receipt Preview Modal */}
            <ReceiptPreviewModal
                isOpen={!!previewReceipt}
                onClose={() => { setPreviewReceipt(null); setPreviewEnrollmentId(null); }}
                receiptUrl={previewReceipt}
                onApprove={() => {
                    handleApprove(previewEnrollmentId);
                    setPreviewReceipt(null);
                }}
                onReject={() => {
                    handleReject(previewEnrollmentId);
                    setPreviewReceipt(null);
                }}
            />
        </div>
    );
}
