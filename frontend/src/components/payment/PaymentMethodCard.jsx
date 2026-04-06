'use client';

export default function PaymentMethodCard({
    provider,
    data,
    isActive,
    onEdit
}) {
    const defaultIcon = provider.icon || '💰';
    const logoSrc = `/payment-methods/${provider.logo}`;

    const maskWalletNumber = (number) => {
        if (!number) return 'غير مفعل';
        if (number.length > 6) {
            return number.slice(0, 3) + '*'.repeat(number.length - 6) + number.slice(-3);
        }
        return '*'.repeat(number.length);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full relative group">
            {isActive && (
                <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-s-md" />
            )}
            
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden shadow-sm">
                        <img 
                            src={logoSrc} 
                            alt={provider.name} 
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <span className="text-2xl hidden" aria-hidden="true">{defaultIcon}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            {isActive ? 'نشط' : 'غير مهيأ'}
                        </span>
                        
                        <button
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => {
                                if (!isActive) onEdit();
                                // If active, we just show a visual toggle that behaves as read-only since backend deletion requires manual empty save, or just rely on edit.
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isActive ? 'bg-primary' : 'bg-slate-200'}`}
                        >
                            <span 
                                aria-hidden="true" 
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? '-translate-x-5' : 'translate-x-0'}`} 
                            />
                        </button>
                    </div>
                </div>

                <div className="mb-6 flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{provider.name}</h3>
                    <p className="text-slate-500 text-sm font-medium tracking-wider" dir="ltr">
                        {isActive ? maskWalletNumber(data.wallet_number) : 'لم يتم إعداد الطريقة بعد'}
                    </p>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={onEdit}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                        تعديل البيانات
                    </button>
                </div>
            </div>
        </div>
    );
}
