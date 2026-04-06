'use client';

import { useConfirmModal } from '@/context/ConfirmContext';
import { useEffect, useState } from 'react';

export default function ConfirmationModal() {
    const { isOpen, title, message, onConfirm, onCancel } = useConfirmModal();
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset processing state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsProcessing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirmClick = () => {
        setIsProcessing(true);
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans" dir="rtl">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={!isProcessing ? onCancel : undefined}
            />
            
            {/* Modal Box */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 m-4 sm:m-0">
                <div className="p-6">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-rose-500 text-2xl">warning</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 leading-tight">
                            {title || 'تأكيد الإجراء'}
                        </h3>
                    </div>
                    
                    {/* Message */}
                    <p className="text-slate-600 text-[15px] leading-relaxed mb-8">
                        {message || 'هل أنت متأكد من هذا الإجراء؟ لا يمكن التراجع عنه.'}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleConfirmClick}
                            disabled={isProcessing}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-colors flex justify-center items-center ${
                                isProcessing 
                                    ? 'bg-rose-400 cursor-not-allowed' 
                                    : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700'
                            }`}
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'نعم، أوافق'
                            )}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={isProcessing}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-colors ${
                                isProcessing 
                                    ? 'text-slate-400 bg-slate-50 cursor-not-allowed' 
                                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300'
                            }`}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
