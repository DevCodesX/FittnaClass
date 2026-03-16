export default function CourseFilters({ filters, activeFilter, onChange }) {
    return (
        <section className="mb-8 flex justify-center sm:mb-12">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(15,43,91,0.05)] ring-1 ring-slate-200/60">
                {filters.map((filter) => {
                    const isActive = activeFilter === filter.id;

                    return (
                        <button
                            key={filter.id}
                            type="button"
                            onClick={() => onChange(filter.id)}
                            className={`relative rounded-xl px-6 py-3 text-[15px] font-bold transition-all duration-300 z-10 ${isActive
                                ? 'text-white shadow-sm'
                                : 'text-slate-600 hover:text-[#0f2b5b] hover:bg-slate-50'
                                }`}
                        >
                            {isActive && (
                                <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#0f2b5b] to-blue-700 shadow-md"></span>
                            )}
                            {filter.label}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
