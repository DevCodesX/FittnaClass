'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { studentAPI } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';

const PROVIDER_LABELS = {
    vodafone_cash: { name: 'Vodafone Cash', icon: '🔴' },
    instapay: { name: 'InstaPay', icon: '🏦' },
    fawry: { name: 'Fawry', icon: '🟡' },
    other: { name: 'Other', icon: '💰' },
};

export default function CourseDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        async function fetchCourse() {
            try {
                // We use explore endpoint with course_code or ID search
                const res = await studentAPI.exploreCourses('');
                const allCourses = res.data.data || [];
                const found = allCourses.find((c) => c.id === parseInt(id));
                if (found) {
                    setCourse(found);
                }
            } catch {
                toast.error('Failed to load course details.');
            } finally {
                setLoading(false);
            }
        }
        fetchCourse();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setReceiptPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleEnroll = async () => {
        if (!receiptFile) {
            toast.error('Please upload your payment receipt.');
            return;
        }

        setEnrolling(true);
        try {
            const formData = new FormData();
            formData.append('receipt', receiptFile);
            await studentAPI.enrollInCourse(id, formData);
            toast.success('Enrollment request submitted! ✓ Waiting for instructor approval.');
            router.push('/student/my-courses');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to enroll.');
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <Skeleton variant="card" className="!h-64" />
                <Skeleton variant="title" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="text-center py-20">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Course Not Found</h3>
                <p className="text-slate-500">This course may have been removed or doesn&apos;t exist.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Course Hero */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6 animate-fade-in">
                <div className="h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-emerald/10 flex items-center justify-center relative">
                    <span className="text-6xl opacity-30">📚</span>
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 bg-primary text-white text-sm font-mono font-bold rounded-lg shadow-md">
                            #{course.course_code}
                        </span>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">{course.title}</h1>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                                {course.instructor?.name?.charAt(0)?.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800">{course.instructor?.name}</p>
                            <p className="text-xs text-slate-400">Instructor</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-lg">{course.subject}</span>
                        {course.category && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-lg">{course.category}</span>
                        )}
                    </div>

                    {course.description && (
                        <p className="text-slate-600 leading-relaxed mb-4">{course.description}</p>
                    )}

                    <div className="flex items-center gap-2 py-3 px-4 bg-emerald-light/50 rounded-xl">
                        <span className="text-2xl font-bold text-emerald-dark">
                            {course.price > 0 ? `${course.price} EGP` : 'Free'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment Methods */}
            {course.price > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">💳 Payment Methods</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Send payment to any of these wallets, then upload your receipt below
                        </p>
                    </div>
                    <div className="p-6 space-y-3">
                        {course.instructor?.paymentMethods?.length > 0 ? (
                            course.instructor.paymentMethods.map((pm) => (
                                <div key={pm.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                    <span className="text-2xl">{PROVIDER_LABELS[pm.provider]?.icon || '💰'}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-800">
                                            {PROVIDER_LABELS[pm.provider]?.name || pm.provider}
                                        </p>
                                        <p className="text-base font-mono font-bold text-primary">{pm.wallet_number}</p>
                                        {pm.details && <p className="text-xs text-slate-400">{pm.details}</p>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4">
                                Instructor hasn&apos;t set up payment methods yet.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Receipt Upload */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">📸 Upload Payment Receipt</h3>
                </div>
                <div className="p-6">
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {receiptPreview ? (
                            <div className="space-y-3">
                                <img
                                    src={receiptPreview}
                                    alt="Receipt preview"
                                    className="max-h-48 mx-auto rounded-xl shadow-md"
                                />
                                <p className="text-sm text-emerald font-medium">✓ Receipt attached</p>
                                <p className="text-xs text-slate-400">Click to change</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-slate-600 mb-1">
                                    Click or drag to upload your receipt screenshot
                                </p>
                                <p className="text-xs text-slate-400">PNG, JPG up to 5MB</p>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleEnroll}
                        disabled={enrolling || !receiptFile}
                        className="touch-target w-full mt-6 py-4 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-40 flex items-center justify-center gap-2 text-lg"
                    >
                        {enrolling ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            '🎓 Enroll in Course'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
