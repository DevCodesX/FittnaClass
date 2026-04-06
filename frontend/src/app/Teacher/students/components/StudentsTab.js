'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import StudentDetailsPanel from './StudentDetailsPanel';
import { teacherAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Search, BookOpen, ChevronDown } from 'lucide-react';

export default function StudentsTab() {
    const toast = useToast();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('all');
    const [trackFilter, setTrackFilter] = useState('all');
    
    // Extracted filter options from data
    const grades = useMemo(() => {
        const uniqueGrades = new Set(students.map(s => s.grade).filter(Boolean));
        return Array.from(uniqueGrades);
    }, [students]);

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            const res = await teacherAPI.getAcceptedStudents();
            setStudents(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch accepted students:', error);
            toast.error('حدث خطأ أثناء جلب الطلاب.');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchSearch = s.name?.includes(searchQuery) || s.email?.includes(searchQuery);
            const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter;
            const matchTrack = trackFilter === 'all' || s.track === trackFilter;
            return matchSearch && matchGrade && matchTrack;
        });
    }, [students, searchQuery, gradeFilter, trackFilter]);

    // Grouping logic by Curriculum
    const groupedStudents = useMemo(() => {
        const groups = {};
        filteredStudents.forEach(s => {
            const currName = (s.curriculums && s.curriculums[0]) ? s.curriculums[0] : 'أخرى';
            if (!groups[currName]) {
                groups[currName] = {
                    name: currName,
                    students: [],
                    grade: s.grade || '-',
                    track: s.track || '-'
                };
            }
            groups[currName].students.push(s);
        });
        return Object.values(groups);
    }, [filteredStudents]);

    const [expandedSections, setExpandedSections] = useState([]);

    // Open first curriculum by default
    useEffect(() => {
        if (groupedStudents.length > 0 && expandedSections.length === 0) {
            setExpandedSections([groupedStudents[0].name]);
        }
    }, [groupedStudents, expandedSections.length]);

    const toggleSection = (name) => {
        setExpandedSections(prev => 
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    // Handle updates from details panel
    const handleUpdateStudent = (id, updates) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleRemoveStudent = (id) => {
        setStudents(prev => prev.filter(s => s.id !== id));
        if (selectedStudentId === id) setSelectedStudentId(null);
    };

    const selectedStudent = useMemo(() => 
        students.find(s => s.id === selectedStudentId), 
    [students, selectedStudentId]);

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full relative">
                    <span className="absolute inset-y-0 start-3 flex items-center text-slate-400"><Search className="w-5 h-5"/></span>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو البريد..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full ps-10 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                        className="flex-1 md:flex-none py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-primary"
                    >
                        <option value="all">كل الصفوف</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
            </div>

            {/* Split Layout Container */}
            <div className="flex-1 flex gap-5 min-h-0 relative">
                
                {/* Left Side: Students List */}
                <div className={`flex-1 flex flex-col bg-slate-50 rounded-xl shadow-inner border border-slate-200 overflow-hidden transition-all relative ${selectedStudentId ? 'hidden lg:flex' : 'flex'}`}>
                    
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}

                    {/* List Header */}
                    <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm z-10">
                        <span className="text-sm font-bold text-slate-700">
                            {filteredStudents.length} طالب
                        </span>
                    </div>

                    {/* Scrollable Grouped List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {!loading && groupedStudents.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">
                                لا يوجد طلاب يطابقون بحثك.
                            </div>
                        ) : (
                            groupedStudents.map(group => {
                                const isExpanded = expandedSections.includes(group.name);
                                return (
                                    <div key={group.name} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        {/* Accordion Header */}
                                        <button
                                            onClick={() => toggleSection(group.name)}
                                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-transparent data-[expanded=true]:border-slate-200"
                                            data-expanded={isExpanded}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <div className="text-start">
                                                    <h3 className="text-base font-bold text-slate-800">{group.name}</h3>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                        <span>{group.grade}</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                        <span>{group.track}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full">
                                                    {group.students.length} طلاب
                                                </span>
                                                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {/* Accordion Content */}
                                        <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="p-2 space-y-2">
                                                {group.students.map(student => (
                                                    <button
                                                        key={student.id}
                                                        onClick={() => setSelectedStudentId(student.id)}
                                                        className={`w-full touch-target p-3 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border transition-all text-start ${
                                                            selectedStudentId === student.id
                                                                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-sm'
                                                                : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center shrink-0 border border-slate-200">
                                                            <span className="text-sm font-bold text-slate-600">
                                                                {student.name?.charAt(0)?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <h4 className="text-sm font-bold text-slate-800 truncate">{student.name}</h4>
                                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded flex-shrink-0 ${
                                                                    student.status === 'active' ? 'bg-emerald-light text-emerald-dark' : 'bg-rose-light text-rose-dark'
                                                                }`}>
                                                                    {student.status === 'active' ? 'نشط' : 'موقوف'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                                <span className="font-mono bg-slate-100 px-1 rounded">#{student.student_id}</span>
                                                                <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                                                <span>انضم: {new Date(student.joinDate).toLocaleDateString('ar-EG')}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Details Panel */}
                <div className={`w-full lg:w-[400px] xl:w-[450px] shrink-0 transition-all ${!selectedStudentId ? 'hidden lg:block' : 'block absolute lg:relative inset-0 bg-slate-bg/80 backdrop-blur-sm z-20 lg:z-auto p-4 lg:p-0'}`}>
                    <div className="h-full bg-white rounded-xl shadow-lg border border-slate-200">
                        <StudentDetailsPanel 
                            student={selectedStudent} 
                            onUpdateStudent={handleUpdateStudent}
                            onRemoveStudent={handleRemoveStudent}
                            onClose={() => setSelectedStudentId(null)}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
