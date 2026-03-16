'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { studentAPI } from '@/lib/api';
import ExploreHeader from '@/components/student/explore/ExploreHeader';
import CourseSearch from '@/components/student/explore/CourseSearch';
import CourseFilters from '@/components/student/explore/CourseFilters';
import CourseGrid from '@/components/student/explore/CourseGrid';

const COURSE_FILTERS = [
    { id: 'all', label: 'جميع المقررات' },
    { id: 'general', label: 'مواد العام' },
    { id: 'azhar', label: 'مواد الأزهر' },
];

const AZHAR_KEYWORDS = [
    'azhar',
    'al azhar',
    'al-azhar',
    'الأزهر',
    'ازهر',
    'فقه',
    'حديث',
    'تفسير',
    'قرآن',
    'الفقه',
    'الشريعة',
    'العقيدة',
];

function detectCourseTrack(course) {
    const source = `${course.title || ''} ${course.subject || ''} ${course.category || ''}`.toLowerCase();
    const isAzharCourse = AZHAR_KEYWORDS.some((keyword) => source.includes(keyword));
    return isAzharCourse ? 'azhar' : 'general';
}

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function ExploreContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const debouncedQuery = useDebounce(query, 500);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isSearching, setIsSearching] = useState(false);

    const fetchCourses = useCallback(async (searchTerm = '') => {
        setLoading(true);
        setIsSearching(true);
        try {
            const response = await studentAPI.exploreCourses(searchTerm.trim());
            const payload = Array.isArray(response?.data?.data) ? response.data.data : [];
            setCourses(payload);
        } catch {
            setCourses([]);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    }, []);

    // Initial load and URL param change sync
    useEffect(() => {
        if (initialQuery !== query && query === '') {
            setQuery(initialQuery);
        }
    }, [initialQuery]);

    // Fetch when debounced query changes
    useEffect(() => {
        fetchCourses(debouncedQuery);
        // Optionally update URL
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedQuery) {
            params.set('q', debouncedQuery);
        } else {
            params.delete('q');
        }
        // router.replace(`?${params.toString()}`, { scroll: false });
    }, [debouncedQuery, fetchCourses, searchParams]);


    const visibleCourses = useMemo(() => {
        if (activeFilter === 'all') {
            return courses;
        }
        return courses.filter((course) => detectCourseTrack(course) === activeFilter);
    }, [courses, activeFilter]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        fetchCourses(query);
    };

    const handleClearQuery = () => {
        setQuery('');
        // fetchCourses(''); => effect will handle this when debouncedQuery becomes ''
    };

    return (
        <section dir="rtl" className="min-h-[calc(100vh-140px)] bg-slate-50/50">
            <div className="w-full py-8 sm:py-12">
                <div className="w-full">
                    <ExploreHeader />
                    <CourseSearch
                        query={query}
                        onQueryChange={setQuery}
                        onSubmit={handleSearchSubmit}
                        isSearching={isSearching || query !== debouncedQuery}
                    />
                    <CourseFilters
                        filters={COURSE_FILTERS}
                        activeFilter={activeFilter}
                        onChange={setActiveFilter}
                    />
                    <CourseGrid
                        courses={visibleCourses}
                        loading={loading}
                        hasQuery={Boolean(query.trim())}
                        onClearQuery={handleClearQuery}
                    />
                </div>
            </div>
        </section>
    );
}
