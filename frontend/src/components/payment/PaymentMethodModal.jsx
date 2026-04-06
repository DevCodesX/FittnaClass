'use client';

import { useState, useEffect } from 'react';

export default function PaymentMethodModal({
    isOpen,
    onClose,
    onSave,
    provider,
    initialData,
    isSaving,
    errors
}) {
    const [formData, setFormData] = useState({
        wallet_number: '',
        details: ''
    });

    // Sync state when modal opens or initialData changes
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                wallet_number: initialData.wallet_number || '',
                details: initialData.details || ''
            });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(provider.id, formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={!isSaving ? onClose : undefined}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 p-1">
                            <img 
                                src={`/assets/payment-methods/${provider.logo}`}
                                alt={provider.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <span className="hidden leading-none text-lg" aria-hidden="true">{provider.icon || '💰'}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">إعداد {provider.name}</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isSaving}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors disabled:opacity-50"
                        aria-label="إغلاق"
                    >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                المحفظة / الحساب البنكي
                            </label>
                            <input
                                type="text"
                                value={formData.wallet_number}
                                onChange={(e) => setFormData(p => ({ ...p, wallet_number: e.target.value }))}
                                placeholder={provider.id === 'instapay' ? 'اسم المستخدم (InstaPay)' : '01X-XXXX-XXXX'}
                                disabled={isSaving}
                                className={`w-full px-4 py-3 rounded-xl border ${errors?.wallet_number ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-200 bg-slate-50'} text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all text-end disabled:opacity-50`}
                                dir="ltr"
                            />
                            {errors?.wallet_number && (
                                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.wallet_number}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                تفاصيل إضافية <span className="text-slate-400 font-normal">(اختياري)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.details}
                                onChange={(e) => setFormData(p => ({ ...p, details: e.target.value }))}
                                placeholder="مثل: اسم صاحب الحساب"
                                disabled={isSaving}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="w-1/3 px-4 py-3 rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !formData.wallet_number.trim()}
                            className="w-2/3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm shadow-primary/20"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'حفظ الإعدادات'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
