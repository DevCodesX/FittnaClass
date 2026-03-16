'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { studentAPI } from '@/lib/api';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';

export default function MyCoursesPage() {
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            try {
                const res = await studentAPI.getMyCourses();
                setCourses(res.data.data || []);
            } catch {
                toast.error('Failed to load your courses.');
            } finally {
                setLoading(false);
            }
        }
        fetchCourses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <div className="mb-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">My Courses</h2>
                <p className="text-slate-500">Your enrolled and approved courses</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <CourseCardSkeleton key={i} />
                    ))}
                </div>
            ) : courses.length === 0 ? (
                <div className="text-center py-16 animate-fade-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📚</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No courses yet</h3>
                    <p className="text-slate-500 text-sm mb-4">
                        Explore our catalog and enroll in your first course!
                    </p>
                    <Link
                        href="/student/explore"
                        className="touch-target inline-flex px-6 py-3 gradient-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity"
                    >
                        Browse Courses
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {courses.map((item, i) => (
                        <Link
                            key={item.enrollment_id}
                            href={`/student/watch/${item.course?.id}`}
                            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all group animate-slide-up"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <div className="h-36 sm:h-40 bg-gradient-to-br from-emerald/10 to-primary/10 flex items-center justify-center relative overflow-hidden">
                                <div className="text-4xl opacity-50 group-hover:scale-110 transition-transform duration-300">
                                    🎥
                                </div>
                                <div className="absolute top-3 left-3">
                                    <span className="px-2.5 py-1 bg-emerald text-white text-xs font-mono font-bold rounded-lg shadow-sm">
                                        #{item.course?.course_code}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 right-3">
                                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur text-emerald-dark text-xs font-bold rounded-lg">
                                        ▶ Watch
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 sm:p-5">
                                <h3 className="font-semibold text-slate-800 mb-1.5 line-clamp-2 text-sm sm:text-base group-hover:text-primary transition-colors">
                                    {item.course?.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-[9px] font-bold text-primary">
                                            {item.course?.instructor?.name?.charAt(0)?.toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500 truncate">
                                        {item.course?.instructor?.name}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
