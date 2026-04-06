'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { studentAPI } from '@/lib/api';
import ExploreHeader from '@/components/student/explore/ExploreHeader';
import CourseSearch from '@/components/student/explore/CourseSearch';
import CourseFilters from '@/components/student/explore/CourseFilters';
import CourseGrid from '@/components/student/explore/CourseGrid';

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
    const [isSearching, setIsSearching] = useState(false);

    // Hierarchical Filters
    const [educationType, setEducationType] = useState('all');
    const [stage, setStage] = useState('all');
    const [gradeLevel, setGradeLevel] = useState('all');
    const [track, setTrack] = useState('all');
    const [subject, setSubject] = useState('all');
    const [isFreeOnly, setIsFreeOnly] = useState(false);

    const fetchCourses = useCallback(async (
        searchTerm = '', 
        educationTypeVal = 'all', 
        stageVal = 'all', 
        gradeLevelVal = 'all', 
        trackVal = 'all', 
        subjectVal = 'all', 
        freeVal = false
    ) => {
        setLoading(true);
        setIsSearching(true);
        try {
            const response = await studentAPI.exploreCurricula(
                searchTerm.trim(), 
                educationTypeVal, 
                stageVal, 
                gradeLevelVal, 
                trackVal, 
                subjectVal, 
                freeVal
            );
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

    // Fetch when query or filters change
    useEffect(() => {
        fetchCourses(debouncedQuery, educationType, stage, gradeLevel, track, subject, isFreeOnly);
    }, [debouncedQuery, educationType, stage, gradeLevel, track, subject, isFreeOnly, fetchCourses]);

    // Reset children dynamically when parent changes implemented via wrapper setters
    const handleSetEducationType = (val) => {
        setEducationType(val);
        setStage('all');
        setGradeLevel('all');
        setTrack('all');
        setSubject('all');
    };

    const handleSetStage = (val) => {
        setStage(val);
        setGradeLevel('all');
        setTrack('all');
        setSubject('all');
    };

    const handleSetGradeLevel = (val) => {
        setGradeLevel(val);
        setTrack('all'); // Grade shouldn't technically reset track but usually these are selected linearly
        setSubject('all');
    };

    const handleSetTrack = (val) => {
        setTrack(val);
        setSubject('all');
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        fetchCourses(query, educationType, stage, gradeLevel, track, subject, isFreeOnly);
    };

    const handleClearQuery = () => {
        setQuery('');
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
                        educationType={educationType}
                        setEducationType={handleSetEducationType}
                        stage={stage}
                        setStage={handleSetStage}
                        gradeLevel={gradeLevel}
                        setGradeLevel={handleSetGradeLevel}
                        track={track}
                        setTrack={handleSetTrack}
                        subject={subject}
                        setSubject={setSubject}
                        isFreeOnly={isFreeOnly}
                        setIsFreeOnly={setIsFreeOnly}
                    />
                    <CourseGrid
                        courses={courses}
                        loading={loading}
                        hasQuery={Boolean(query.trim())}
                        onClearQuery={handleClearQuery}
                    />
                </div>
            </div>
        </section>
    );
}
