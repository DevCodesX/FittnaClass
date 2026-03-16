'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { instructorAPI } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import ReceiptPreviewModal from '@/components/ReceiptPreviewModal';

export default function StudentsManagementPage() {
    const toast = useToast();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewReceipt, setPreviewReceipt] = useState(null);
    const [previewEnrollmentId, setPreviewEnrollmentId] = useState(null);

    const fetchEnrollments = async () => {
        try {
            const res = await instructorAPI.getPendingStudents();
            setEnrollments(res.data.data || []);
        } catch {
            toast.error('Failed to load pending enrollments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEnrollments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApprove = async (enrollmentId) => {
        try {
            await instructorAPI.updateEnrollmentStatus(enrollmentId, 'approved');
            toast.success('Student approved! ✓');
            setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve.');
        }
    };

    const handleReject = async (enrollmentId, reason) => {
        try {
            await instructorAPI.updateEnrollmentStatus(enrollmentId, 'rejected');
            toast.success('Enrollment rejected.');
            setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject.');
        }
    };

    const openReceipt = (enrollment) => {
        setPreviewReceipt(enrollment.payment_receipt_url);
        setPreviewEnrollmentId(enrollment.id);
    };

    return (
        <div>
            <div className="mb-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Students Management</h2>
                <p className="text-slate-500">
                    Review pending enrollment requests and payment receipts
                </p>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                            <Skeleton variant="avatar" />
                            <div className="flex-1 space-y-2">
                                <Skeleton variant="title" className="!w-48" />
                                <Skeleton variant="text" className="!w-32" />
                            </div>
                            <Skeleton variant="button" />
                        </div>
                    ))}
                </div>
            ) : enrollments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-emerald-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✅</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">All caught up!</h3>
                    <p className="text-slate-500">No pending enrollment requests.</p>
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    <p className="text-sm text-slate-500">
                        {enrollments.length} pending request{enrollments.length !== 1 && 's'}
                    </p>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                                        <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                                        <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt</th>
                                        <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {enrollments.map((enrollment) => (
                                        <tr key={enrollment.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-semibold text-primary">
                                                            {enrollment.student?.name?.charAt(0)?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{enrollment.student?.name}</p>
                                                        <p className="text-xs text-slate-400">{enrollment.student?.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-800">{enrollment.course?.title}</p>
                                                <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded-md">
                                                    #{enrollment.course?.course_code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(enrollment.enrollment_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {enrollment.payment_receipt_url ? (
                                                    <button
                                                        onClick={() => openReceipt(enrollment)}
                                                        className="touch-target px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                                                    >
                                                        👁 View
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">No receipt</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleApprove(enrollment.id)}
                                                        className="touch-target px-4 py-2 text-xs font-semibold text-white bg-emerald rounded-lg hover:bg-emerald-dark transition-colors"
                                                    >
                                                        ✓ Approve
                                                    </button>
                                                    <button
                                                        onClick={() => { setPreviewEnrollmentId(enrollment.id); setPreviewReceipt(enrollment.payment_receipt_url); }}
                                                        className="touch-target px-4 py-2 text-xs font-semibold text-white bg-rose rounded-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        ✕ Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {enrollments.map((enrollment) => (
                            <div key={enrollment.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-semibold text-primary">
                                            {enrollment.student?.name?.charAt(0)?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800">{enrollment.student?.name}</p>
                                        <p className="text-xs text-slate-400">{enrollment.student?.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-slate-600">{enrollment.course?.title}</p>
                                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded-md">
                                            #{enrollment.course?.course_code}
                                        </span>
                                    </div>
                                    {enrollment.payment_receipt_url && (
                                        <button
                                            onClick={() => openReceipt(enrollment)}
                                            className="touch-target px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 rounded-lg"
                                        >
                                            👁 Receipt
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(enrollment.id)}
                                        className="touch-target flex-1 py-2.5 text-sm font-semibold text-white bg-emerald rounded-xl hover:bg-emerald-dark transition-colors"
                                    >
                                        ✓ Approve
                                    </button>
                                    <button
                                        onClick={() => openReceipt(enrollment)}
                                        className="touch-target flex-1 py-2.5 text-sm font-semibold text-white bg-rose rounded-xl hover:bg-red-600 transition-colors"
                                    >
                                        ✕ Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Receipt Preview Modal */}
            <ReceiptPreviewModal
                isOpen={!!previewReceipt}
                onClose={() => { setPreviewReceipt(null); setPreviewEnrollmentId(null); }}
                receiptUrl={previewReceipt}
                onApprove={() => handleApprove(previewEnrollmentId)}
                onReject={(reason) => handleReject(previewEnrollmentId, reason)}
            />
        </div>
    );
}
