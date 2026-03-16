import { CourseCardSkeleton } from '@/components/ui/Skeleton';
import CourseCard from './CourseCard';
import EmptyState from './EmptyState';

export default function CourseGrid({ courses, loading, hasQuery, onClearQuery }) {
    const isSparseResults = courses.length > 0 && courses.length <= 4;

    if (loading) {
        return (
            <div className="mx-auto w-full">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                        <CourseCardSkeleton key={item} />
                    ))}
                </div>
            </div>
        );
    }

    if (!courses.length) {
        return (
            <div className="mx-auto w-full">
                <EmptyState hasQuery={hasQuery} onClearQuery={onClearQuery} />
            </div>
        );
    }

    if (isSparseResults) {
        return (
            <div className="mx-auto w-full">
                <div className="flex flex-wrap justify-center gap-6">
                    {courses.map((course) => (
                        <div key={course.id} className="w-full max-w-[360px] sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]">
                            <CourseCard course={course} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                ))}
            </div>
        </div>
    );
}
