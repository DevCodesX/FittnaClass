'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { teacherAPI } from '@/lib/api';
import { Ticket, Plus, ToggleLeft, ToggleRight, Clock, Hash, Percent, DollarSign, X } from 'lucide-react';

export default function TeacherCouponsPage() {
    const toast = useToast();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        usage_limit: '',
        expires_at: '',
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await teacherAPI.getCoupons();
            if (res.data?.success) {
                setCoupons(res.data.data || []);
            }
        } catch {
            toast.error('فشل في تحميل الكوبونات.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.code.trim() || !form.discount_value) {
            toast.error('يرجى إدخال كود الخصم وقيمة الخصم.');
            return;
        }
        setCreating(true);
        try {
            await teacherAPI.createCoupon(form);
            toast.success('تم إنشاء الكوبون بنجاح! ✓');
            setShowModal(false);
            setForm({ code: '', discount_type: 'percentage', discount_value: '', usage_limit: '', expires_at: '' });
            fetchCoupons();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل في إنشاء الكوبون.');
        } finally {
            setCreating(false);
        }
    };

    const toggleStatus = async (coupon) => {
        try {
            await teacherAPI.updateCouponStatus(coupon.id, !coupon.is_active);
            toast.success(coupon.is_active ? 'تم تعطيل الكوبون.' : 'تم تفعيل الكوبون.');
            fetchCoupons();
        } catch {
            toast.error('فشل في تحديث حالة الكوبون.');
        }
    };

    const isExpired = (date) => date && new Date() > new Date(date);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">كوبونات الخصم</h1>
                        <p className="text-sm text-slate-500">أنشئ وأدِر أكواد الخصم لمقرراتك</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    كوبون جديد
                </button>
            </div>

            {/* Coupons List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
            ) : coupons.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ticket className="w-7 h-7 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">لا توجد كوبونات بعد</h3>
                    <p className="text-sm text-slate-400 mb-4">أنشئ أول كوبون خصم لمقرراتك لجذب المزيد من الطلاب.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors"
                    >
                        إنشاء كوبون
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {coupons.map((coupon) => (
                        <div
                            key={coupon.id}
                            className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                                !coupon.is_active || isExpired(coupon.expires_at)
                                    ? 'border-slate-200 opacity-60'
                                    : 'border-slate-100'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-mono font-bold rounded-lg tracking-widest">
                                        {coupon.code}
                                    </span>
                                    {!coupon.is_active && (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[11px] font-bold rounded">معطّل</span>
                                    )}
                                    {isExpired(coupon.expires_at) && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-bold rounded">منتهي</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => toggleStatus(coupon)}
                                    className="p-2 rounded-lg hover:bg-slate-50 transition-colors"
                                    title={coupon.is_active ? 'تعطيل' : 'تفعيل'}
                                >
                                    {coupon.is_active
                                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                                        : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                <div className="flex items-center gap-1.5">
                                    {coupon.discount_type === 'percentage'
                                        ? <Percent className="w-4 h-4 text-emerald-500" />
                                        : <DollarSign className="w-4 h-4 text-emerald-500" />}
                                    <span className="font-semibold">
                                        {coupon.discount_type === 'percentage'
                                            ? `${coupon.discount_value}%`
                                            : `${coupon.discount_value} ج.م`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    <span>{coupon.used_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''} استخدام</span>
                                </div>
                                {coupon.expires_at && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span>{new Date(coupon.expires_at).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                )}
                                {coupon.curriculum && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                        {coupon.curriculum.title}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-slide-up">
                        <button onClick={() => setShowModal(false)} className="absolute left-4 top-4 text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-lg font-bold text-slate-800 mb-6 text-right">إنشاء كوبون جديد</h2>

                        <div className="space-y-4 text-right">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">كود الخصم</label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value })}
                                    placeholder="مثال: SALE50"
                                    dir="ltr"
                                    className="w-full h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 uppercase tracking-wider font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع الخصم</label>
                                    <select
                                        value={form.discount_type}
                                        onChange={e => setForm({ ...form, discount_type: e.target.value })}
                                        className="w-full h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 appearance-none"
                                    >
                                        <option value="percentage">نسبة مئوية %</option>
                                        <option value="fixed">مبلغ ثابت ج.م</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">القيمة</label>
                                    <input
                                        type="number"
                                        value={form.discount_value}
                                        onChange={e => setForm({ ...form, discount_value: e.target.value })}
                                        placeholder={form.discount_type === 'percentage' ? '50' : '100'}
                                        className="w-full h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">حد الاستخدام</label>
                                    <input
                                        type="number"
                                        value={form.usage_limit}
                                        onChange={e => setForm({ ...form, usage_limit: e.target.value })}
                                        placeholder="بدون حد"
                                        className="w-full h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">تاريخ الانتهاء</label>
                                    <input
                                        type="date"
                                        value={form.expires_at}
                                        onChange={e => setForm({ ...form, expires_at: e.target.value })}
                                        className="w-full h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="w-full h-12 mt-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        إنشاء الكوبون
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
