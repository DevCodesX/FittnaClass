'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { instructorAPI } from '@/lib/api';
import { paymentSchema, validateForm } from '@/lib/validators';

const PROVIDERS = [
    { id: 'vodafone_cash', name: 'Vodafone Cash', icon: '🔴', color: 'border-red-200 bg-red-50' },
    { id: 'instapay', name: 'InstaPay', icon: '🏦', color: 'border-blue-200 bg-blue-50' },
    { id: 'fawry', name: 'Fawry', icon: '🟡', color: 'border-yellow-200 bg-yellow-50' },
    { id: 'other', name: 'Other', icon: '💰', color: 'border-slate-200 bg-slate-50' },
];

export default function PaymentSettingsPage() {
    const toast = useToast();
    const [forms, setForms] = useState(
        PROVIDERS.reduce((acc, p) => ({ ...acc, [p.id]: { wallet_number: '', details: '' } }), {})
    );
    const [saving, setSaving] = useState({});
    const [saved, setSaved] = useState({});

    const handleChange = (provider, field, value) => {
        setForms((prev) => ({
            ...prev,
            [provider]: { ...prev[provider], [field]: value },
        }));
    };

    const handleSave = async (providerId) => {
        const data = { provider: providerId, ...forms[providerId] };
        const validation = validateForm(paymentSchema, data);
        if (!validation.success) {
            toast.error(Object.values(validation.errors)[0]);
            return;
        }

        setSaving((prev) => ({ ...prev, [providerId]: true }));
        try {
            await instructorAPI.savePaymentSettings(data);
            toast.success(`${PROVIDERS.find((p) => p.id === providerId)?.name} saved successfully!`);
            setSaved((prev) => ({ ...prev, [providerId]: true }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save. Please try again.');
        } finally {
            setSaving((prev) => ({ ...prev, [providerId]: false }));
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Payment Settings</h2>
                <p className="text-slate-500">
                    Add your wallet numbers so students know where to send payments.
                </p>
            </div>

            <div className="space-y-6">
                {PROVIDERS.map((provider, i) => (
                    <div
                        key={provider.id}
                        className={`bg-white rounded-2xl border ${saved[provider.id] ? 'border-emerald/40' : 'border-slate-100'} shadow-sm overflow-hidden animate-slide-up`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className={`flex items-center gap-3 px-6 py-4 ${provider.color} border-b`}>
                            <span className="text-2xl">{provider.icon}</span>
                            <h3 className="font-semibold text-slate-800">{provider.name}</h3>
                            {saved[provider.id] && (
                                <span className="ml-auto text-xs font-medium text-emerald bg-emerald-light px-2.5 py-1 rounded-full">
                                    ✓ Saved
                                </span>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Wallet / Account Number
                                </label>
                                <input
                                    type="text"
                                    value={forms[provider.id].wallet_number}
                                    onChange={(e) => handleChange(provider.id, 'wallet_number', e.target.value)}
                                    placeholder={provider.id === 'instapay' ? 'Your InstaPay username' : '01X-XXXX-XXXX'}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Additional Details <span className="text-slate-400">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={forms[provider.id].details}
                                    onChange={(e) => handleChange(provider.id, 'details', e.target.value)}
                                    placeholder="e.g., Account holder name"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                />
                            </div>

                            <button
                                onClick={() => handleSave(provider.id)}
                                disabled={saving[provider.id] || !forms[provider.id].wallet_number}
                                className="touch-target px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-light transition-colors disabled:opacity-40 flex items-center gap-2"
                            >
                                {saving[provider.id] ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Save'
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
