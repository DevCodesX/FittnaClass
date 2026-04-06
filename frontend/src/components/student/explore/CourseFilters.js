import { EDUCATION_TYPES, STAGES, GRADES, TRACKS_BY_SYSTEM, getAvailableSubjects } from '@/lib/education_flow';

export default function CourseFilters({ 
    educationType, setEducationType, 
    stage, setStage, 
    gradeLevel, setGradeLevel, 
    track, setTrack, 
    subject, setSubject,
    isFreeOnly, setIsFreeOnly
}) {
    const hasFilters = educationType !== 'all' || stage !== 'all' || gradeLevel !== 'all' || track !== 'all' || subject !== 'all' || isFreeOnly;

    const handleReset = () => {
        // We only need to reset education type to 'all' to trigger downstream resets in ExploreContent,
        // but just to be safe and immediate, we can call them all.
        setEducationType('all');
        setStage('all');
        setGradeLevel('all');
        setTrack('all');
        setSubject('all');
        setIsFreeOnly(false);
    };

    return (
        <section className="mx-auto w-full max-w-4xl mb-6 sm:mb-10 p-3 sm:p-4 bg-white rounded-xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 min-w-0">
                
                {/* Selectors Group */}
                <div className="grid grid-cols-2 md:flex md:flex-row md:flex-wrap md:items-end flex-1 gap-3 w-full">
                    
                    {/* Education Type */}
                    <div className="flex-1 min-w-[110px] flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 px-1">نوع التعليم</label>
                        <select 
                            value={educationType} 
                            onChange={(e) => setEducationType(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 h-[38px] text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                        >
                            <option value="all">الكل</option>
                            {EDUCATION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Stage */}
                    <div className="flex-1 min-w-[110px] flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 px-1">المرحلة</label>
                        <select 
                            value={stage} 
                            onChange={(e) => setStage(e.target.value)}
                            disabled={!educationType || educationType === 'all'}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 h-[38px] text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="all">الكل</option>
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>

                    {/* Grade Level */}
                    <div className="flex-1 min-w-[110px] flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 px-1">الصف</label>
                        <select 
                            value={gradeLevel} 
                            onChange={(e) => setGradeLevel(e.target.value)}
                            disabled={!stage || stage === 'all'}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 h-[38px] text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="all">الكل</option>
                            {(GRADES[stage] || []).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    {/* Track */}
                    {stage === 'ثانوي' && (
                        <div className="flex-1 min-w-[110px] flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600 px-1">الشعبة</label>
                            <select 
                                value={track} 
                                onChange={(e) => setTrack(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 h-[38px] text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                            >
                                <option value="all">الكل</option>
                                {(TRACKS_BY_SYSTEM[educationType] || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Subject */}
                    <div className="flex-1 min-w-[110px] flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 px-1">المادة</label>
                        <select 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={!stage || stage === 'all' || (stage === 'ثانوي' && (!track || track === 'all'))}
                            className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 h-[38px] text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <option value="all">الكل</option>
                            {getAvailableSubjects(educationType, stage, track === 'all' ? '' : track).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                </div>

                {/* Toggles & Actions Group */}
                <div className="flex items-center justify-between md:justify-start w-full md:w-auto h-[38px] gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-bold text-slate-600">دروس مجانية</span>
                        <button
                            type="button"
                            onClick={() => setIsFreeOnly(!isFreeOnly)}
                            aria-pressed={isFreeOnly}
                            className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${isFreeOnly ? 'bg-primary' : 'bg-slate-300'}`}
                        >
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${isFreeOnly ? 'right-0.5' : 'right-[18px]'}`} />
                        </button>
                    </div>

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors shrink-0"
                        >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            إعادة تعيين
                        </button>
                    )}
                </div>
                
            </div>
        </section>
    );
}
