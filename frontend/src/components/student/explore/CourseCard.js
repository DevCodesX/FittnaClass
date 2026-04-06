import Link from 'next/link';
import { isFreeLessonCourse } from '@/lib/freeLesson';
import { getTrackLabel } from '@/lib/categories';
import { School, User, FolderOpen, PlayCircle, ArrowLeft } from 'lucide-react';

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
        course.thumbnailUrl ||
        course.thumbnail_url ||
        course.thumbnail ||
        course.cover_image ||
        course.coverImage ||
        ''
    );
}

function resolveLessonsAndSections(course) {
    let sectionsCount = 0;
    let lessonsCount = 0;

    if (course.sections && Array.isArray(course.sections)) {
        sectionsCount = course.sections.length;
        lessonsCount = course.sections.reduce((acc, sec) => acc + (sec.lessons?.length || 0), 0);
    } else {
        // Fallback for older formats or when sections are not included
        lessonsCount = normalizeNumber(
            course.lessons_count ??
            course.lesson_count ??
            course.contents_count ??
            course.lessons?.length ??
            course.contents?.length,
            0
        );
    }

    return { sectionsCount, lessonsCount };
}

function resolveTeacherName(course) {
    const name =
        course.instructor?.name ||
        course.teacher?.name ||
        'مدرس غير معروف';
    return name;
}

function resolveTeacherAvatar(course) {
    return course.instructor?.avatar_url || course.teacher?.avatar_url || null;
}

export default function CourseCard({ course }) {
    const id = normalizeNumber(course.id, 0);
    const gradient = FALLBACK_GRADIENTS[Math.abs(id) % FALLBACK_GRADIENTS.length];
    const thumbnail = resolveThumbnail(course);
    const { sectionsCount, lessonsCount } = resolveLessonsAndSections(course);
    const title = course.title || 'مقرر بدون عنوان';
    const subject = course.subject || 'مادة عامة';
    const teacherName = resolveTeacherName(course);
    const teacherAvatar = resolveTeacherAvatar(course);
    const courseCode = course.course_code || `COURSE-${course.id}`;
    const isFreeLesson = isFreeLessonCourse(course);
    const description = course.description || '';
    const gradeLevel = course.grade?.name || course.grade_level || '';

    return (
        <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white text-right shadow-[0_8px_20px_rgba(15,43,91,0.04)] ring-1 ring-slate-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(15,43,91,0.12)] hover:ring-blue-100/50">
            <Link href={`/student/course/${course.id}`} className="block relative aspect-[16/9] overflow-hidden bg-slate-100">
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
                        <School className="w-16 h-16 text-white/50 transition-transform duration-700 group-hover:scale-110 group-hover:text-white/70" />
                    </div>
                )}
                
                {/* Course Code Badge */}
                <span className="absolute right-4 top-4 z-10 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#0f2b5b] shadow-sm backdrop-blur-md">
                    {courseCode}
                </span>
                {isFreeLesson && (
                    <span className="absolute left-4 top-4 z-10 rounded-full bg-emerald-700 px-3 py-1 text-xs font-extrabold tracking-wide text-white">
                        مجاني
                    </span>
                )}

                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2b5b]/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>

            <div className="flex flex-1 flex-col p-6">
                {/* Subject, Grade & Section */}
                <div className="mb-3">
                    <p className="mb-2 text-[11px] font-bold tracking-wider text-blue-600 leading-relaxed">
                        {[subject, gradeLevel, course.category ? getTrackLabel(course.category) : null].filter(Boolean).join(' • ')}
                    </p>
                    <h3 className="line-clamp-2 min-h-[48px] text-lg font-bold leading-tight text-slate-900 transition-colors group-hover:text-blue-700">
                        <Link href={`/student/course/${course.id}`}>{title}</Link>
                    </h3>
                </div>

                {/* Teacher Name */}
                {teacherName && (
                    <div className="mb-3 flex items-center gap-3">
                        {teacherAvatar ? (
                            <img
                                src={teacherAvatar}
                                alt={teacherName}
                                loading="lazy"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                            />
                        ) : null}
                        <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100 ${teacherAvatar ? 'hidden' : ''}`}
                        >
                            {teacherName && teacherName !== 'مدرس غير معروف' ? (
                                <span className="text-sm font-bold">{teacherName.charAt(0)}</span>
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                            {teacherName === 'مدرس غير معروف' ? teacherName : `مستر ${teacherName}`}
                        </p>
                    </div>
                )}

                {/* Description (optional — hidden when empty) */}
                {description && (
                    <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                        {description}
                    </p>
                )}

                {/* Lesson & Unit count chip */}
                <div className="mt-auto flex items-center border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-100/50 shadow-sm">
                            <FolderOpen className="w-4 h-4 text-indigo-500" />
                            <span>{sectionsCount} {sectionsCount === 1 ? 'وحدة' : sectionsCount <= 10 && sectionsCount > 0 ? 'وحدات' : 'وحدة'}</span>
                            <span className="mx-1.5 text-slate-300 font-bold">•</span>
                            <PlayCircle className="w-4 h-4 text-blue-500" />
                            <span>{lessonsCount} {lessonsCount === 1 ? 'درس' : lessonsCount <= 10 && lessonsCount > 0 ? 'دروس' : 'درس'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* CTA button */}
            <div className="px-6 pb-6">
                <Link
                    href={`/student/course/${course.id}`}
                    className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-50 px-4 py-3.5 text-[15px] font-bold text-[#0f2b5b] transition-all duration-300 hover:bg-[#0f2b5b] hover:text-white hover:shadow-md"
                >
                    <span className="relative z-10 flex items-center gap-2 tracking-wide">
                        عرض التفاصيل
                        <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover/btn:-translate-x-1 rtl:rotate-180 rtl:group-hover/btn:translate-x-1" />
                    </span>
                </Link>
            </div>
        </article>
    );
}
