export default function EmptyState({ hasQuery, onClearQuery }) {
    return (
        <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-white p-10 text-center shadow-[0_10px_40px_rgba(15,43,91,0.06)] ring-1 ring-slate-100">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50/50 shadow-inner">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <span className="material-symbols-outlined text-4xl">search_off</span>
                </div>
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900 mb-4">لا توجد نتائج مطابقة</h3>
            <p className="text-[15px] text-slate-600 max-w-sm mx-auto leading-relaxed">
                {hasQuery 
                    ? "عذراً، لم نتمكن من العثور على أي مقررات تطابق بحثك. يرجى التحقق من الكلمات المكتوبة أو تجربة بحث مختلف."
                    : "لا توجد مقررات متاحة في هذا القسم حالياً، يرجى العودة لاحقاً لاستكشاف المزيد."}
            </p>

            {hasQuery && (
                <button
                    type="button"
                    onClick={onClearQuery}
                    className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-[#0f2b5b] px-8 text-[15px] font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <span className="material-symbols-outlined text-xl">clear_all</span>
                    مسح شروط البحث
                </button>
            )}
        </div>
    );
}
