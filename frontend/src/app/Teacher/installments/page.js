'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { teacherAPI } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react';

export default function TeacherInstallmentsPage() {
    const toast = useToast();
    const [installments, setInstallments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(null);
    const [expandedReceipt, setExpandedReceipt] = useState(null);

    useEffect(() => {
        fetchInstallments();
    }, []);

    const fetchInstallments = async () => {
        try {
            const res = await teacherAPI.getPendingInstallments();
            if (res.data?.success) {
                setInstallments(res.data.data || []);
            }
        } catch {
            toast.error('فشل في تحميل طلبات الأقساط.');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id, status) => {
        setReviewing(id);
        try {
            await teacherAPI.reviewInstallment(id, status);
            toast.success(status === 'approved' ? 'تم قبول القسط وفتح محتوى إضافي ✓' : 'تم رفض إيصال القسط.');
            fetchInstallments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل في تحديث حالة القسط.');
        } finally {
            setReviewing(null);
        }
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">طلبات الأقساط</h1>
                    <p className="text-sm text-slate-500">راجع إيصالات الدفع وأقر الأقساط لفتح المحتوى تلقائياً</p>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
            ) : installments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">لا توجد طلبات معلقة</h3>
                    <p className="text-sm text-slate-400">جميع إيصالات الأقساط تمت مراجعتها.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {installments.map((inst) => (
                        <div key={inst.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-bold text-slate-800">
                                        {inst.enrollment?.student?.name || 'طالب'}
                                        <span className="text-sm font-normal text-slate-500 mr-2">— {inst.enrollment?.student?.email}</span>
                                    </p>
                                    <p className="text-sm text-slate-600 mt-1">
                                        📚 {inst.enrollment?.curriculum?.title || 'مقرر'}
                                    </p>
                                </div>
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
                                    القسط {inst.installment_number}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                <span className="font-semibold text-slate-700">{Number(inst.amount).toFixed(2)} ج.م</span>
                                {inst.paid_at && (
                                    <span>📅 {new Date(inst.paid_at).toLocaleDateString('ar-EG')}</span>
                                )}
                            </div>

                            {/* Receipt Preview */}
                            {inst.payment_receipt_url && (
                                <div className="mb-4">
                                    <button
                                        onClick={() => setExpandedReceipt(expandedReceipt === inst.id ? null : inst.id)}
                                        className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {expandedReceipt === inst.id ? 'إخفاء الإيصال' : 'عرض الإيصال'}
                                        {expandedReceipt === inst.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                    {expandedReceipt === inst.id && (
                                        <img
                                            src={`${API_URL}${inst.payment_receipt_url}`}
                                            alt="Receipt"
                                            className="mt-3 max-h-64 rounded-xl border border-slate-100 shadow-sm"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleReview(inst.id, 'approved')}
                                    disabled={reviewing === inst.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    قبول
                                </button>
                                <button
                                    onClick={() => handleReview(inst.id, 'rejected')}
                                    disabled={reviewing === inst.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors disabled:opacity-40"
                                >
                                    <XCircle className="w-4 h-4" />
                                    رفض
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
