export default function CourseSearch({ query, onQueryChange, onSubmit, isSearching }) {
    return (
        <form onSubmit={onSubmit} className="mb-4 w-full sm:mb-6 group">
            <div className="mx-auto w-full max-w-4xl relative z-20">
                <label htmlFor="explore-search" className="sr-only">
                    ابحث عن مادة أو مقرر...
                </label>
                <div className="relative overflow-visible rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,43,91,0.06)] ring-1 ring-slate-200/50 transition-all duration-300 focus-within:-translate-y-1 focus-within:shadow-[0_20px_40px_rgba(15,43,91,0.12)] focus-within:ring-blue-500/50">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-2xl">search</span>
                    </div>
                    
                    <input
                        id="explore-search"
                        type="text"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="ابحث عن مادة، مقرر، أو معلم..."
                        className="h-16 w-full rounded-2xl border-0 bg-transparent pr-14 pl-36 text-right text-lg text-slate-800 outline-none placeholder:text-slate-400 sm:h-20 sm:pr-16 sm:pl-40"
                    />

                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        {isSearching && (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 mr-2"></div>
                        )}
                        <button
                            type="submit"
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-700 to-[#0f2b5b] px-6 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:h-14 sm:px-8 sm:text-base"
                        >
                            بحث
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
