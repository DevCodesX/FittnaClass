'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { teacherAPI } from '@/lib/api';
import { paymentSchema, validateForm } from '@/lib/validators';
import PaymentMethodCard from './PaymentMethodCard';
import PaymentMethodModal from './PaymentMethodModal';

const PROVIDERS = [
    { id: 'vodafone_cash', name: 'فودافون كاش', icon: '🔴', color: 'bg-red-50 text-red-600', logo: 'Vodafone-Cash-Logo.png' },
    { id: 'instapay', name: 'إنستاباي', icon: '🏦', color: 'bg-blue-50 text-blue-600', logo: 'InstaPay.png' },
    { id: 'fawry', name: 'فوري', icon: '🟡', color: 'bg-yellow-50 text-yellow-600', logo: 'fawry.jpg' },
    { id: 'other', name: 'أخرى', icon: '💰', color: 'bg-slate-50 text-slate-600', logo: 'Other.png' },
];

export default function PaymentSettings() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    
    // Store data keyed by provider id
    const [savedData, setSavedData] = useState({});
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProviderId, setSelectedProviderId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    const fetchPaymentMethods = async () => {
        try {
            const response = await teacherAPI.getPaymentMethods();
            if (response.status === 200 && response.data?.success) {
                const methods = response.data.data;
                if (methods && methods.length > 0) {
                    const dataMap = {};
                    methods.forEach((method) => {
                        dataMap[method.provider] = {
                            wallet_number: method.wallet_number,
                            details: method.details || '',
                        };
                    });
                    setSavedData(dataMap);
                }
            }
        } catch (err) {
            toast.error('فشل في جلب طرق الدفع المحفوظة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const handleEditClick = (providerId) => {
        setSelectedProviderId(providerId);
        setValidationErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        if (!isSaving) {
            setIsModalOpen(false);
            setTimeout(() => setSelectedProviderId(null), 200); // Wait for transition
        }
    };

    const handleSave = async (providerId, formData) => {
        const payload = { provider: providerId, ...formData };
        const validation = validateForm(paymentSchema, payload);
        
        if (!validation.success) {
            setValidationErrors(validation.errors);
            toast.error(Object.values(validation.errors)[0]);
            return;
        }

        setValidationErrors({});
        setIsSaving(true);
        
        try {
            const response = await teacherAPI.savePaymentSettings(payload);
            
            if ((response.status === 200 || response.status === 201) && response.data?.success === true) {
                toast.success(`تم حفظ ${PROVIDERS.find((p) => p.id === providerId)?.name} بنجاح!`);
                await fetchPaymentMethods(); // Refresh from backend
                handleCloseModal();
            } else {
                throw new Error(response.data?.message || 'خطأ غير متوقع من الخادم');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'فشل الحفظ. يرجى المحاولة مرة أخرى.';
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 min-h-[400px]">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const selectedProvider = PROVIDERS.find(p => p.id === selectedProviderId);

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">إعدادات الدفع</h2>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xl">
                        أضف أرقام المحافظ وحسابك ليتمكن الطلاب من إرسال المدفوعات. يُمكنك تفعيل طرق الدفع بكل سهولة.
                    </p>
                </div>
                <button
                    onClick={() => {
                        const unconfigured = PROVIDERS.find(p => !(savedData[p.id]?.wallet_number));
                        if (unconfigured) handleEditClick(unconfigured.id);
                        else toast.success('لقد قمت بإعداد جميع طرق الدفع المتاحة!');
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 shrink-0 touch-target"
                >
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    إضافة طريقة دفع
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROVIDERS.map((provider) => {
                    const data = savedData[provider.id];
                    const isActive = Boolean(data && data.wallet_number);
                    
                    return (
                        <PaymentMethodCard
                            key={provider.id}
                            provider={provider}
                            data={data || {}}
                            isActive={isActive}
                            onEdit={() => handleEditClick(provider.id)}
                        />
                    );
                })}
            </div>

            {selectedProvider && (
                <PaymentMethodModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    provider={selectedProvider}
                    initialData={savedData[selectedProvider.id]}
                    isSaving={isSaving}
                    errors={validationErrors}
                />
            )}
        </div>
    );
}
