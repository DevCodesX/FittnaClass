import Link from 'next/link';

const FALLBACK_GRADIENTS = [
    'from-blue-600 to-[#0f2b5b]',
    'from-indigo-500 to-[#12356c]',
    'from-cyan-600 to-[#173f79]',
    'from-sky-500 to-[#0e2a55]',
];

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveThumbnail(course) {
    return (
        course.thumbnail ||
        course.thumbnail_url ||
        course.cover_image ||
        course.coverImage ||
        ''
    );
}

function resolveLessons(course) {
    return normalizeNumber(
        course.lessons_count ??
        course.lesson_count ??
        course.contents_count ??
        course.lessons?.length ??
        course.contents?.length,
        0
    );
}

function resolveStudents(course) {
    return normalizeNumber(
        course.student_count ??
        course.students_count ??
        course.enrolled_count ??
        course.enrollment_count ??
        course.enrollments_count,
        0
    );
}

export default function CourseCard({ course }) {
    const id = normalizeNumber(course.id, 0);
    const gradient = FALLBACK_GRADIENTS[Math.abs(id) % FALLBACK_GRADIENTS.length];
    const thumbnail = resolveThumbnail(course);
    const lessons = resolveLessons(course);
    const students = resolveStudents(course);
    const title = course.title || 'مقرر بدون عنوان';
    const subject = course.subject || course.category || 'مادة عامة';
    const teacherName = course.instructor?.name || 'مدرس فيتنا كلاس';
    const courseCode = course.course_code || `COURSE-${course.id}`;

    return (
        <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white text-right shadow-[0_8px_20px_rgba(15,43,91,0.04)] ring-1 ring-slate-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(15,43,91,0.12)] hover:ring-blue-100/50">
            <Link href={`/student/course/${course.id}`} className="block relative aspect-[16/10] overflow-hidden bg-slate-100">
                {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={thumbnail}
                        alt={title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
                        <span className="material-symbols-outlined text-6xl text-white/50 transition-transform duration-700 group-hover:scale-110 group-hover:text-white/70">
                            school
                        </span>
                    </div>
                )}
                
                {/* Course Code Badge */}
                <span className="absolute right-4 top-4 z-10 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#0f2b5b] shadow-sm backdrop-blur-md">
                    {courseCode}
                </span>

                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2b5b]/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>

            <div className="flex flex-1 flex-col p-6">
                <div className="mb-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-600">{subject}</p>
                    <h3 className="line-clamp-2 min-h-[56px] text-lg font-bold leading-tight text-slate-900 transition-colors group-hover:text-blue-700">
                        <Link href={`/student/course/${course.id}`}>{title}</Link>
                    </h3>
                </div>

                <div className="mt-auto">
                    <div className="mb-5 flex items-center justify-start gap-3 border-b border-slate-100 pb-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                            <span className="material-symbols-outlined text-lg">person</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{teacherName}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm font-medium text-slate-500">
                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                            <span className="material-symbols-outlined text-[18px] text-blue-500">menu_book</span>
                            <span>{lessons} درس</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                            <span className="material-symbols-outlined text-[18px] text-amber-500">groups</span>
                            <span>{students} طالب</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="px-6 pb-6">
                <Link
                    href={`/student/course/${course.id}`}
                    className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-50 px-4 py-3.5 text-[15px] font-bold text-[#0f2b5b] transition-all duration-300 hover:bg-[#0f2b5b] hover:text-white hover:shadow-md"
                >
                    <span className="relative z-10 flex items-center gap-2 tracking-wide">
                        عرض التفاصيل
                        <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover/btn:-translate-x-1 rtl:rotate-180 rtl:group-hover/btn:translate-x-1">arrow_forward</span>
                    </span>
                </Link>
            </div>
        </article>
    );
}
