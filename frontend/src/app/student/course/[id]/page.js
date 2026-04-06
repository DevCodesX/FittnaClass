'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { studentAPI } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { isFreeLessonCourse } from '@/lib/freeLesson';
import { getTrackLabel } from '@/lib/categories';

const PROVIDER_LABELS = {
    vodafone_cash: { name: 'Vodafone Cash', icon: '🔴', logo: 'Vodafone-Cash-Logo.png' },
    instapay: { name: 'InstaPay', icon: '🏦', logo: 'InstaPay.png' },
    fawry: { name: 'Fawry', icon: '🟡', logo: 'fawry.jpg' },
    other: { name: 'Other', icon: '💰', logo: 'Other.png' },
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
    const [enrollmentState, setEnrollmentState] = useState(null);

    // Coupon & Wallet state
    const [couponCode, setCouponCode] = useState('');
    const [couponData, setCouponData] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [useWallet, setUseWallet] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    // Installment state
    const [installmentPlan, setInstallmentPlan] = useState(null);
    const [paymentType, setPaymentType] = useState('full');

    useEffect(() => {
        async function fetchCourse() {
            try {
                const res = await studentAPI.getCurriculumDetails(id);
                if (res.data?.success && res.data.data) {
                    setCourse(res.data.data);
                }

                // Check enrollment status if logged in
                const token = typeof window !== 'undefined' ? localStorage.getItem('fittnaclass_token') : null;
                if (token) {
                    try {
                        const statusRes = await studentAPI.checkEnrollmentStatus(id);
                        if (statusRes.data?.success && statusRes.data.data) {
                            setEnrollmentState(statusRes.data.data);
                        }
                    } catch (e) {
                        // ignore
                    }
                    // Fetch wallet balance
                    try {
                        const userStr = localStorage.getItem('fittnaclass_user');
                        if (userStr) {
                            const u = JSON.parse(userStr);
                            setWalletBalance(Number(u.wallet_balance) || 0);
                        }
                    } catch (e) { /* ignore */ }
                }

                // Fetch installment plan
                try {
                    const planRes = await studentAPI.getInstallmentPlan(id);
                    if (planRes.data?.success && planRes.data.data) {
                        setInstallmentPlan(planRes.data.data);
                    }
                } catch (e) { /* ignore */ }
            } catch {
                toast.error('فشل في تحميل تفاصيل المقرر.');
            } finally {
                setLoading(false);
            }
        }
        fetchCourse();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Polling for real-time status if pending
    useEffect(() => {
        let interval;
        if (enrollmentState?.status === 'pending') {
            interval = setInterval(async () => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('fittnaclass_token') : null;
                if (!token) return;
                try {
                    const statusRes = await studentAPI.checkEnrollmentStatus(id);
                    if (statusRes.data?.success && statusRes.data.data) {
                        setEnrollmentState(statusRes.data.data);
                    }
                } catch (e) {
                    // ignore
                }
            }, 10000); // 10 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enrollmentState?.status, id]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setReceiptPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponError('');
        setCouponData(null);
        try {
            const res = await studentAPI.validateCoupon({ code: couponCode.trim(), curriculum_id: id });
            if (res.data?.success) {
                setCouponData(res.data.data);
                toast.success('تم تطبيق كود الخصم بنجاح! ✓');
            }
        } catch (err) {
            setCouponError(err.response?.data?.message || 'كود الخصم غير صالح.');
            setCouponData(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const calcFinalPrice = () => {
        let price = Number(course?.price) || 0;
        if (couponData) {
            if (couponData.discount_type === 'percentage') {
                price -= (price * Number(couponData.discount_value)) / 100;
            } else {
                price -= Number(couponData.discount_value);
            }
            price = Math.max(0, price);
        }
        if (useWallet && walletBalance > 0) {
            price = Math.max(0, price - walletBalance);
        }
        return price;
    };

    const handleEnroll = async () => {
        const finalPrice = calcFinalPrice();
        const isEffectivelyFree = finalPrice === 0;
        if (!isEffectivelyFree && !receiptFile) {
            toast.error('يرجى إرفاق إيصال الدفع الخاص بك.');
            return;
        }

        setEnrolling(true);
        try {
            const formData = new FormData();
            if (receiptFile) {
                formData.append('receipt', receiptFile);
            }
            if (couponData) {
                formData.append('coupon_code', couponCode.trim().toUpperCase());
            }
            if (useWallet) {
                formData.append('use_wallet', 'true');
            }
            if (paymentType === 'installment') {
                formData.append('payment_type', 'installment');
            }
            await studentAPI.enrollInCurriculum(id, formData);
            toast.success(isEffectivelyFree ? 'تم التسجيل بنجاح! ✓' : 'تم تقديم طلب التسجيل! ✓ في انتظار موافقة المعلم.');
            router.push('/student/my-courses');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل في التسجيل.');
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
                <h3 className="text-lg font-semibold text-slate-800 mb-2">المقرر غير موجود</h3>
                <p className="text-slate-500">قد يكون هذا المقرر قد تمت إزالته أو أنه غير موجود أصلاً.</p>
            </div>
        );
    }

    const isFreeLesson = isFreeLessonCourse(course);

    return (
        <div className="max-w-3xl mx-auto">
            {/* Course Hero */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.08)] overflow-hidden mb-6 animate-fade-in">
                <div className="h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-emerald/10 flex items-center justify-center relative">
                    <span className="text-6xl opacity-30">📚</span>
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 bg-primary text-white text-sm font-mono font-bold rounded-lg">
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
                            <p className="text-xs text-slate-400">المعلم</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        {course.subject && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-lg font-medium">{course.subject}</span>
                        )}
                        {(course.grade_level || course.grade?.name) && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium">{course.grade_level || course.grade?.name}</span>
                        )}
                        {course.category && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-lg font-medium">{getTrackLabel(course.category)}</span>
                        )}
                    </div>

                    {course.description && (
                        <p className="text-slate-600 leading-relaxed mb-4">{course.description}</p>
                    )}

                    <div className="flex items-center gap-2 py-3 px-4 bg-emerald-light/50 rounded-xl">
                        <span className="text-2xl font-bold text-emerald-dark">
                            {isFreeLesson ? 'مجاني' : `${course.price} ج.م`}
                        </span>
                        {isFreeLesson && (
                            <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold tracking-wide text-white">مجاني</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Enrollment State UI */}
            {enrollmentState?.status === 'approved' ? (
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-8 text-center animate-slide-up">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🎓</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">أنت مسجل بالفعل في هذا المقرر</h3>
                    <button
                        onClick={() => router.push(`/student/watch/${id}`)}
                        className="mt-4 px-8 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                        الذهاب إلى محتوى المقرر
                    </button>
                </div>
            ) : enrollmentState?.status === 'pending' && enrollmentState?.payment_receipt_url ? (
                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-8 text-center animate-slide-up">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⏳</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">طلبك قيد المراجعة</h3>
                    <p className="text-slate-500">تم استلام إيصال الدفع الخاص بك وهو الآن قيد المراجعة من قبل المعلم.</p>
                </div>
            ) : (
                <>
                    {enrollmentState?.status === 'rejected' && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                            <p className="text-red-600 font-semibold text-center text-sm">تم رفض إيصال الدفع السابق. يرجى إعادة إرسال إيصال صحيح.</p>
                        </div>
                    )}

                    {/* Payment Methods */}
                    {!isFreeLesson && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.08)] mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800">💳 طرق الدفع</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    قم بتحويل المبلغ لأي من المحافظ التالية، ثم قم برفع صورة الإيصال بالأسفل
                                </p>
                            </div>
                            <div className="p-6 space-y-3">
                                {course.instructor?.paymentMethods?.length > 0 ? (
                                    course.instructor.paymentMethods.map((pm) => (
                                        <div key={pm.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden shadow-sm">
                                                {PROVIDER_LABELS[pm.provider]?.logo ? (
                                                    <img 
                                                        src={`/payment-methods/${PROVIDER_LABELS[pm.provider].logo}`} 
                                                        alt={PROVIDER_LABELS[pm.provider]?.name || pm.provider} 
                                                        className="w-8 h-8 object-contain"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'block';
                                                        }}
                                                    />
                                                ) : null}
                                                <span className={`text-2xl ${PROVIDER_LABELS[pm.provider]?.logo ? 'hidden' : ''}`} aria-hidden="true">
                                                    {PROVIDER_LABELS[pm.provider]?.icon || '💰'}
                                                </span>
                                            </div>
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
                                        لم يقم المعلم بضبط طرق الدفع بعد.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Coupon & Wallet Section */}
                    {!isFreeLesson && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.08)] mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800">🏷️ كود الخصم والمحفظة</h3>
                            </div>
                            <div className="p-6 space-y-5">
                                {/* Coupon Code */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">كود الخصم</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => { setCouponCode(e.target.value); setCouponError(''); setCouponData(null); }}
                                            placeholder="أدخل كود الخصم"
                                            dir="ltr"
                                            className="flex-1 h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 uppercase tracking-wider font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleValidateCoupon}
                                            disabled={validatingCoupon || !couponCode.trim()}
                                            className="px-5 h-12 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-40"
                                        >
                                            {validatingCoupon ? '...' : 'تطبيق'}
                                        </button>
                                    </div>
                                    {couponError && <p className="mt-2 text-sm text-red-500 font-medium">{couponError}</p>}
                                    {couponData && (
                                        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 rounded-lg p-2.5">
                                            <span>✓</span>
                                            <span>خصم {couponData.discount_type === 'percentage' ? `${couponData.discount_value}%` : `${couponData.discount_value} ج.م`} مطبّق</span>
                                        </div>
                                    )}
                                </div>

                                {/* Wallet Balance */}
                                {walletBalance > 0 && (
                                    <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">💰</span>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">رصيد المحفظة</p>
                                                <p className="text-xs text-slate-500">{walletBalance.toFixed(2)} ج.م متاح</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={useWallet}
                                                onChange={e => setUseWallet(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                )}

                                {/* Dynamic Price Summary */}
                                {(couponData || useWallet) && (
                                    <div className="border-t border-slate-100 pt-4 space-y-2">
                                        <div className="flex justify-between text-sm text-slate-500">
                                            <span>السعر الأصلي</span>
                                            <span>{Number(course.price).toFixed(2)} ج.م</span>
                                        </div>
                                        {couponData && (
                                            <div className="flex justify-between text-sm text-emerald-600">
                                                <span>خصم الكوبون</span>
                                                <span>- {couponData.discount_type === 'percentage'
                                                    ? ((Number(course.price) * Number(couponData.discount_value)) / 100).toFixed(2)
                                                    : Number(couponData.discount_value).toFixed(2)} ج.م</span>
                                            </div>
                                        )}
                                        {useWallet && walletBalance > 0 && (
                                            <div className="flex justify-between text-sm text-amber-600">
                                                <span>رصيد المحفظة</span>
                                                <span>- {Math.min(walletBalance, calcFinalPrice() + Math.min(walletBalance, calcFinalPrice())).toFixed(2)} ج.م</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-lg font-bold text-slate-800 border-t border-slate-100 pt-2">
                                            <span>المبلغ النهائي</span>
                                            <span className={calcFinalPrice() === 0 ? 'text-emerald-600' : ''}>
                                                {calcFinalPrice() === 0 ? 'مجاني ✓' : `${calcFinalPrice().toFixed(2)} ج.م`}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Installment Plan Choice */}
                    {!isFreeLesson && installmentPlan && calcFinalPrice() > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.08)] mb-6 animate-slide-up" style={{ animationDelay: '0.18s' }}>
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800">💳 طريقة الدفع</h3>
                            </div>
                            <div className="p-6 space-y-3">
                                {/* Full Payment */}
                                <label
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        paymentType === 'full'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        checked={paymentType === 'full'}
                                        onChange={() => setPaymentType('full')}
                                        className="accent-primary w-4 h-4"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800">دفع كامل</p>
                                        <p className="text-xs text-slate-500">ادفع المبلغ الكامل واحصل على كل المحتوى فوراً</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{calcFinalPrice().toFixed(2)} ج.م</span>
                                </label>

                                {/* Installment */}
                                <label
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        paymentType === 'installment'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        checked={paymentType === 'installment'}
                                        onChange={() => setPaymentType('installment')}
                                        className="accent-primary w-4 h-4"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800">تقسيط ({installmentPlan.installment_count} أقساط)</p>
                                        <p className="text-xs text-slate-500">
                                            ادفع {Number(installmentPlan.installment_amount).toFixed(2)} ج.م لكل قسط — يُفتح {Number(installmentPlan.unlock_per_installment).toFixed(0)}% من المحتوى مع كل دفعة
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{Number(installmentPlan.installment_amount).toFixed(2)} ج.م</span>
                                </label>

                                {paymentType === 'installment' && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                                        <p className="font-semibold mb-1">📋 تفاصيل خطة التقسيط:</p>
                                        <ul className="text-xs space-y-1 text-blue-600">
                                            <li>• الإجمالي: {calcFinalPrice().toFixed(2)} ج.م على {installmentPlan.installment_count} أقساط</li>
                                            <li>• كل قسط: {Number(installmentPlan.installment_amount).toFixed(2)} ج.م</li>
                                            <li>• يُفتح {Number(installmentPlan.unlock_per_installment).toFixed(0)}% من المحتوى مع كل دفعة</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Receipt Upload */}
                    {!isFreeLesson && calcFinalPrice() > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.08)] mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800">📸 إرفاق صورة الإيصال</h3>
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
                                            className="max-h-48 mx-auto rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                                        />
                                        <p className="text-sm text-emerald font-medium">✓ تم إرفاق صورة الإيصال</p>
                                        <p className="text-xs text-slate-400">انقر لتغيير الصورة</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 mb-1">
                                            انقر أو اسحب لإرفاق صورة إيصال الدفع
                                        </p>
                                        <p className="text-xs text-slate-400">الحد الأقصى للملفات هو 5 ميجابايت (PNG, JPG)</p>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleEnroll}
                                disabled={enrolling || !receiptFile}
                                className="touch-target w-full mt-6 py-4 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 text-lg"
                            >
                                {enrolling ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        جاري التقديم...
                                    </>
                                ) : (
                                    '🎓 التسجيل في المقرر'
                                )}
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Free enrollment button (either originally free OR discounted to 0) */}
                    {(isFreeLesson || (!isFreeLesson && calcFinalPrice() === 0)) && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.08)] mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <div className="p-6">
                                <p className="text-sm text-slate-600">
                                    {isFreeLesson ? 'هذا الدرس مجاني. يمكنك البدء فوراً بدون إيصال دفع.' : 'المبلغ النهائي = 0 بعد تطبيق الخصومات. يمكنك التسجيل مباشرة!'}
                                </p>
                                <button
                                    onClick={handleEnroll}
                                    disabled={enrolling}
                                    className="touch-target w-full mt-6 py-4 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 text-lg"
                                >
                                    {enrolling ? 'جاري التقديم...' : (isFreeLesson ? 'ابدأ الدرس المجاني' : '🎓 التسجيل مجاناً')}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
