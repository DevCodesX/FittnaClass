�'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { studentAPI } from '@/lib/api';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// �"?�"?�"? Date Helpers �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
function fmt(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isToday(s) { return s === fmt(new Date()); }
function dayLabel(s) {
    const t = new Date(); const ts = fmt(t);
    const y = new Date(t); y.setDate(y.getDate() - 1);
    const tm = new Date(t); tm.setDate(tm.getDate() + 1);
    if (s === ts) return 'ا�"�S�^�.';
    if (s === fmt(y)) return 'أ�.س';
    if (s === fmt(tm)) return 'غدا�<';
    const d = new Date(s + 'T00:00:00');
    return ['ا�"أحد','ا�"إث�?�S�?','ا�"ث�"اثاء','ا�"أربعاء','ا�"خ�.�Sس','ا�"ج�.عة','ا�"سبت'][d.getDay()];
}
function dayNum(s) { return new Date(s + 'T00:00:00').getDate(); }
function monthLabel(s) {
    return ['�S�?ا�Sر','فبرا�Sر','�.ارس','أبر�S�"','�.ا�S�^','�S�^�?�S�^','�S�^�"�S�^','أغسطس','سبت�.بر','أ�fت�^بر','�?�^ف�.بر','د�Sس�.بر'][new Date(s + 'T00:00:00').getMonth()];
}
function weekRange(offset = 0) {
    const dates = [];
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    // Start from Saturday (weekend start for Arabic calendar)
    const dayOfWeek = base.getDay();
    const satOffset = (dayOfWeek + 1) % 7; // days since Saturday
    base.setDate(base.getDate() - satOffset);
    for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        dates.push(fmt(d));
    }
    return dates;
}

// �"?�"?�"? Sortable Block �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
function SortableBlock({ task, onToggle, onDelete, actionLoading }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `task-${task.id}`,
        data: { task, type: 'task' },
        disabled: task.type === 'event',
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <BlockCard
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                actionLoading={actionLoading}
                dragListeners={listeners}
                dragDisabled={task.type === 'event'}
            />
        </div>
    );
}

// �"?�"?�"? Block Card �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
function BlockCard({ task, onToggle, onDelete, actionLoading, dragListeners, dragDisabled, isOverlay }) {
    const completed = task.status === 'completed';
    const eventType = task.event_block?.type;
    const isLiveEvent = task.type === 'event' && eventType === 'live';
    const typeConfig = {
        lesson: { icon: 'menu_book', color: 'primary', label: 'درس', bg: 'bg-primary/8' },
        custom: { icon: 'edit_note', color: 'slate-500', label: '�.خصصة', bg: 'bg-slate-50' },
        timer: { icon: 'timer', color: 'amber', label: '�.ؤ�,ت', bg: 'bg-amber-light/40' },
        review: { icon: 'replay', color: 'violet', label: '�.راجعة', bg: 'bg-violet-50' },
    };
    if (task.type === 'event') {
        typeConfig.event = isLiveEvent
            ? { icon: 'sensors', color: 'rose', label: 'Live', bg: 'bg-rose-light/70' }
            : { icon: 'fact_check', color: 'amber', label: 'Exam', bg: 'bg-amber-light/70' };
    }

    const tc = typeConfig[task.type] || typeConfig.custom;
    const joinLiveUrl = task.type === 'event' && isLiveEvent ? task.event_block?.meeting_url : null;
    const cardClass = task.type === 'event'
        ? isLiveEvent
            ? 'bg-rose-light/35 border-rose/25 hover:border-rose/40'
            : 'bg-amber-light/45 border-amber/30 hover:border-amber/45'
        : completed
            ? 'bg-emerald-light/20 border-emerald/15'
            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm';

    return (
        <div className={`
            rounded-xl border transition-all duration-200 group
            ${isOverlay ? 'shadow-2xl scale-105 rotate-1 bg-white border-primary/30' : ''}
            ${cardClass}
        `}>
            <div className="flex items-start gap-2.5 p-3">
                {/* Drag Handle */}
                <button
                    {...(!dragDisabled ? (dragListeners || {}) : {})}
                    className={`
                        mt-0.5 p-0.5 flex-shrink-0 touch-none transition-colors
                        ${dragDisabled
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing'
                        }
                    `}
                    tabIndex={-1}
                    disabled={dragDisabled}
                    title={dragDisabled ? 'Event blocks cannot be moved' : undefined}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>drag_indicator</span>
                </button>

                {/* Checkbox */}
                <button
                    onClick={() => onToggle?.(task.id, task.status)}
                    disabled={actionLoading === task.id}
                    className={`
                        w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5
                        ${completed ? 'bg-emerald border-emerald text-white' : 'border-slate-300 hover:border-primary bg-white'}
                        ${actionLoading === task.id ? 'opacity-40' : ''}
                    `}
                >
                    {completed && <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-snug ${completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-[1px] rounded ${tc.bg} text-${tc.color}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{tc.icon}</span>
                            {tc.label}
                        </span>
                        {task.metadata?.course_name && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{task.metadata.course_name}</span>
                        )}
                        {task.type === 'event' && task.event_block?.time && (
                            <span className={`text-[10px] font-semibold ${isLiveEvent ? 'text-rose' : 'text-amber-700'}`}>
                                {task.event_block.time}
                            </span>
                        )}
                        {task.type === 'timer' && task.metadata?.duration && (
                            <span className="text-[10px] text-amber font-bold">{task.metadata.duration}د</span>
                        )}
                        {task.metadata?.ai_generated && (
                            <span className="text-[10px] text-purple-500 font-semibold flex items-center gap-0.5">
                                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>auto_awesome</span>
                                AI
                            </span>
                        )}
                        {task.metadata?.overdue && (
                            <span className="text-[10px] text-rose font-semibold flex items-center gap-0.5">
                                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>schedule</span>
                                �.تأخرة
                            </span>
                        )}
                        {task.metadata?.review_number && (
                            <span className="text-[10px] text-violet-500">#{task.metadata.review_number}</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.type === 'lesson' && task.curriculum_id && !completed && (
                        <Link
                            href={`/student/watch/${task.curriculum_id}`}
                            className="p-1 text-emerald-dark hover:bg-emerald-light/60 rounded-md transition-colors"
                            title="ابدأ ا�"درس"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        </Link>
                    )}
                    {isLiveEvent && !completed && (
                        joinLiveUrl ? (
                            <a
                                href={joinLiveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-rose text-white hover:bg-rose-600 transition-colors"
                                title="Join Live"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>video_call</span>
                                Join Live
                            </a>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-500">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>video_call</span>
                                Join Live
                            </span>
                        )
                    )}
                    {task.type !== 'event' && (
                        <button
                            onClick={() => onDelete?.(task.id)}
                            disabled={actionLoading === task.id}
                            className="p-1 text-slate-300 hover:text-rose hover:bg-rose-light/40 rounded-md transition-colors"
                            title="Delete"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// �"?�"?�"? Day Column �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
function DayColumn({ dateStr, tasks, onToggle, onDelete, actionLoading, onAddClick, isMobile }) {
    const today = isToday(dateStr);
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'completed').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const taskIds = useMemo(() => tasks.map(t => `task-${t.id}`), [tasks]);

    return (
        <div className={`
            flex flex-col rounded-2xl border transition-all
            ${isMobile ? 'min-h-0' : 'min-h-[340px] w-[260px] flex-shrink-0'}
            ${today ? 'border-primary/25 bg-primary/[0.02]' : 'border-slate-100 bg-white/60'}
        `}>
            {/* Column Header */}
            <div className={`px-3.5 py-2.5 border-b ${today ? 'border-primary/10' : 'border-slate-50'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${today ? 'text-primary' : 'text-slate-700'}`}>{dayNum(dateStr)}</span>
                        <div>
                            <span className={`text-[11px] font-semibold block leading-none ${today ? 'text-primary' : 'text-slate-500'}`}>{dayLabel(dateStr)}</span>
                            <span className="text-[10px] text-slate-400 leading-none">{monthLabel(dateStr)}</span>
                        </div>
                        {today && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                    </div>
                    {total > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pct === 100 ? 'bg-emerald-light text-emerald-dark' : 'bg-slate-100 text-slate-500'
                        }`}>{done}/{total}</span>
                    )}
                </div>
                {total > 0 && (
                    <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Tasks */}
            <div className="flex-1 p-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: isMobile ? 'none' : '400px' }}>
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <SortableBlock
                            key={task.id}
                            task={task}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            actionLoading={actionLoading}
                        />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="text-center py-6">
                        <span className="material-symbols-outlined text-slate-200" style={{ fontSize: '28px' }}>event_note</span>
                        <p className="text-[11px] text-slate-300 mt-1">�"ا ت�^جد �.�?ا�.</p>
                    </div>
                )}
            </div>

            {/* Add Button */}
            <div className="px-2 pb-2">
                <button
                    onClick={() => onAddClick(dateStr)}
                    className="w-full flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl border border-dashed border-slate-200 hover:border-primary/30 transition-all"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                    إضافة
                </button>
            </div>
        </div>
    );
}

// �"?�"?�"? Main Planner Page �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
export default function PlannerPage() {
    const toast = useToast();
    const [weekOffset, setWeekOffset] = useState(0);
    const [dayData, setDayData] = useState({});
    const [overallProgress, setOverallProgress] = useState({ total: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addModalDate, setAddModalDate] = useState(null);
    const [showAIModal, setShowAIModal] = useState(false);
    const [activeTask, setActiveTask] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileDate, setMobileDate] = useState(fmt(new Date()));
    const [difficultyTask, setDifficultyTask] = useState(null);
    const [srsStats, setSrsStats] = useState(null);
    const boardRef = useRef(null);

    const dates = useMemo(() => weekRange(weekOffset), [weekOffset]);

    // Responsive detection
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Sensors for dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    // Fetch week data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await studentAPI.getPlanRange(dates[0], dates[dates.length - 1]);
            const d = res.data.data;
            setDayData(d.days || {});
            setOverallProgress(d.overall_progress || { total: 0, completed: 0 });
        } catch {
            toast.error('حدث خطأ ف�S تح�.�S�" ا�"خطة.');
        } finally {
            setLoading(false);
        }
    }, [dates]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Fetch SRS stats
    const fetchSRSStats = useCallback(async () => {
        try {
            const res = await studentAPI.getSRSStats();
            setSrsStats(res.data.data);
        } catch { /* silent */ }
    }, []);
    useEffect(() => { fetchSRSStats(); }, [fetchSRSStats]);

    // Scroll to today column on desktop
    useEffect(() => {
        if (!isMobile && boardRef.current) {
            const todayCol = boardRef.current.querySelector('[data-today-col="true"]');
            if (todayCol) todayCol.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [dates, isMobile, loading]);

    // �"?�"?�"? Task helpers �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
    const getTasksForDate = (dateStr) => {
        return dayData[dateStr]?.tasks || [];
    };

    const findTaskDate = (taskId) => {
        for (const d of dates) {
            const tasks = getTasksForDate(d);
            if (tasks.some(t => t.id === taskId)) return d;
        }
        return null;
    };

    const findTaskById = (taskId) => {
        const date = findTaskDate(taskId);
        if (!date) return null;
        return getTasksForDate(date).find(t => t.id === taskId) || null;
    };

    // �"?�"?�"? Drag & Drop �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
    function handleDragStart(event) {
        const { active } = event;
        const taskId = parseInt(String(active.id).replace('task-', ''));
        const task = findTaskById(taskId);
        if (task?.type === 'event') {
            setActiveTask(null);
            return;
        }
        setActiveTask(task || null);
    }

    function handleDragOver(event) {
        const { active, over } = event;
        if (!over) return;

        const activeId = parseInt(String(active.id).replace('task-', ''));
        const activeTask = findTaskById(activeId);
        if (activeTask?.type === 'event') return;

        const overId = String(over.id);
        const activeDate = findTaskDate(activeId);

        let overDate = null;
        if (overId.startsWith('task-')) {
            const overTaskId = parseInt(overId.replace('task-', ''));
            overDate = findTaskDate(overTaskId);
        } else if (dates.includes(overId)) {
            overDate = overId;
        }

        if (!activeDate || !overDate || activeDate === overDate) return;

        // Optimistic cross-day move
        setDayData(prev => {
            const updated = { ...prev };
            const srcTasks = [...(updated[activeDate]?.tasks || [])];
            const destTasks = [...(updated[overDate]?.tasks || [])];

            const taskIdx = srcTasks.findIndex(t => t.id === activeId);
            if (taskIdx === -1) return prev;

            const [movedTask] = srcTasks.splice(taskIdx, 1);
            destTasks.push(movedTask);

            updated[activeDate] = { ...updated[activeDate], tasks: srcTasks, progress: { total: srcTasks.length, completed: srcTasks.filter(t => t.status === 'completed').length } };
            updated[overDate] = { ...updated[overDate], tasks: destTasks, progress: { total: destTasks.length, completed: destTasks.filter(t => t.status === 'completed').length } };
            return updated;
        });
    }

    async function handleDragEnd(event) {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = parseInt(String(active.id).replace('task-', ''));
        const activeTask = findTaskById(activeId);
        if (activeTask?.type === 'event') return;

        const overId = String(over.id);

        const activeDate = findTaskDate(activeId);
        if (!activeDate) return;

        // Same container reorder
        if (overId.startsWith('task-')) {
            const overTaskId = parseInt(overId.replace('task-', ''));
            const overDate = findTaskDate(overTaskId);

            if (activeDate === overDate) {
                const tasks = getTasksForDate(activeDate);
                const oldIdx = tasks.findIndex(t => t.id === activeId);
                const newIdx = tasks.findIndex(t => t.id === overTaskId);
                if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
                    const reordered = arrayMove(tasks, oldIdx, newIdx);
                    setDayData(prev => ({
                        ...prev,
                        [activeDate]: { ...prev[activeDate], tasks: reordered },
                    }));
                    // Persist
                    try {
                        await studentAPI.reorderTasks({ task_id: activeId, new_order: newIdx + 1 });
                    } catch { /* silent */ }
                }
                return;
            }
        }

        // Cross-day move already handled optimistically in handleDragOver. Persist:
        let targetDate = null;
        if (overId.startsWith('task-')) {
            const overTaskId = parseInt(overId.replace('task-', ''));
            targetDate = findTaskDate(overTaskId);
        } else if (dates.includes(overId)) {
            targetDate = overId;
        }

        if (targetDate) {
            try {
                await studentAPI.reorderTasks({ task_id: activeId, target_date: targetDate, new_order: 9999 });
            } catch { /* silent */ }
        }
    }

    // �"?�"?�"? Task Actions �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
    const toggleTask = async (taskId, currentStatus) => {
        // Find the task to check if it's lesson/review (for SRS)
        const completingLessonOrReview = currentStatus !== 'completed';
        let targetTask = null;
        if (completingLessonOrReview) {
            for (const d of dates) {
                const tasks = getTasksForDate(d);
                const found = tasks.find(t => t.id === taskId);
                if (found) { targetTask = found; break; }
            }
        }

        // Optimistic update
        setDayData(prev => {
            const updated = { ...prev };
            for (const d of dates) {
                const tasks = updated[d]?.tasks || [];
                const idx = tasks.findIndex(t => t.id === taskId);
                if (idx !== -1) {
                    const newTasks = [...tasks];
                    newTasks[idx] = { ...newTasks[idx], status: currentStatus === 'completed' ? 'pending' : 'completed' };
                    updated[d] = {
                        ...updated[d],
                        tasks: newTasks,
                        progress: { total: newTasks.length, completed: newTasks.filter(t => t.status === 'completed').length },
                    };
                    break;
                }
            }
            return updated;
        });
        // Recalc overall
        setTimeout(() => {
            setDayData(prev => {
                let t = 0, c = 0;
                for (const d of dates) { t += (prev[d]?.progress?.total || 0); c += (prev[d]?.progress?.completed || 0); }
                setOverallProgress({ total: t, completed: c });
                return prev;
            });
        }, 0);

        try {
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
            const res = await studentAPI.updateTask(taskId, { status: newStatus });

            // Gamification feedback
            const gam = res.data?.gamification;
            if (gam && gam.points > 0) {
                toast.success(`+${gam.points} �?�,طة${gam.leveled_up ? ` �YZ? �.ست�^�? ${gam.level}!` : ''}`);
                if (gam.new_achievements?.length > 0) {
                    for (const ach of gam.new_achievements) {
                        setTimeout(() => toast.success(`�Y�? إ�?جاز: ${ach.title}`), 500);
                    }
                }
            }

            // Show difficulty dialog for lesson/review blocks when completing
            if (completingLessonOrReview && targetTask && ['lesson', 'review'].includes(targetTask.type) && targetTask.lesson_id) {
                setDifficultyTask(targetTask);
            }
        } catch {
            toast.error('حدث خطأ.');
            fetchData();
        }
    };

    const deleteTask = async (taskId) => {
        setActionLoading(taskId);
        try {
            await studentAPI.deleteTask(taskId);
            await fetchData();
            toast.success('ت�. حذف ا�"�.�?�.ة.');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'حدث خطأ ف�S ا�"حذف.');
        } finally {
            setActionLoading(null);
        }
    };

    const openAddModal = (dateStr) => {
        setAddModalDate(dateStr);
        setShowAddModal(true);
    };

    const handleCreated = () => {
        setShowAddModal(false);
        fetchData();
    };

    const handleAIDone = () => {
        setShowAIModal(false);
        fetchData();
    };

    const overallPct = overallProgress.total > 0 ? Math.round((overallProgress.completed / overallProgress.total) * 100) : 0;

    // �"?�"?�"? Mobile date strip dates (same week) �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
    const mobileDates = dates;

    // �"?�"?�"? Render �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
    return (
        <div className="py-5 sm:py-8 animate-fade-in" dir="rtl">
            {/* �"?�"?�"? Header �"?�"?�"? */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>calendar_month</span>
                        جد�^�" ا�"�.ذا�fرة
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">خطط �"أسب�^ع�f ا�"دراس�S بذ�fاء</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAIModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-l from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-600/20 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        خطة ذ�f�Sة
                    </button>
                    <button
                        onClick={() => openAddModal(isMobile ? mobileDate : fmt(new Date()))}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        إضافة ب�"�^�f
                    </button>
                </div>
            </div>

            {/* �"?�"?�"? Week Navigation �"?�"?�"? */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-slate-100 p-2">
                <button
                    onClick={() => setWeekOffset(w => w + 1)}
                    className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                        {dayNum(dates[0])} - {dayNum(dates[6])} {monthLabel(dates[0])}
                    </span>
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => setWeekOffset(0)}
                            className="text-[11px] font-semibold text-primary hover:text-primary-dark px-2 py-0.5 bg-primary/5 rounded-md transition-colors"
                        >
                            ا�"�S�^�.
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setWeekOffset(w => w - 1)}
                    className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_left</span>
                </button>
            </div>

            {/* �"?�"?�"? Overall Progress �"?�"?�"? */}
            {overallProgress.total > 0 && (
                <div className="mb-4 bg-white rounded-xl border border-slate-100 px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-semibold text-slate-600">
                            أ�?�?�Sت {overallProgress.completed} �.�? {overallProgress.total} �.�?ا�. �?ذا ا�"أسب�^ع
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            overallPct === 100 ? 'bg-emerald-light text-emerald-dark' : 'bg-primary/10 text-primary'
                        }`}>{overallPct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                overallPct === 100 ? 'bg-gradient-to-l from-emerald to-emerald-dark' : 'bg-gradient-to-l from-primary to-primary-dark'
                            }`}
                            style={{ width: `${overallPct}%` }}
                        />
                    </div>
                    {overallPct === 100 && (
                        <p className="text-[11px] text-emerald-dark font-semibold mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>celebration</span>
                            أحس�?ت! أ�?�?�Sت ج�.�Sع �.�?ا�. ا�"أسب�^ع
                        </p>
                    )}
                </div>
            )}

            {/* �"?�"?�"? Board �"?�"?�"? */}
            {loading ? (
                <div className={`${isMobile ? '' : 'flex gap-3 overflow-x-auto pb-4'}`}>
                    {(isMobile ? [1] : [1,2,3,4,5]).map(i => (
                        <div key={i} className={`rounded-2xl border border-slate-100 bg-white/60 p-3 space-y-2 ${isMobile ? 'mb-3' : 'w-[260px] flex-shrink-0 min-h-[340px]'}`}>
                            <div className="h-5 w-20 skeleton rounded-md" />
                            <div className="h-1 skeleton rounded-full" />
                            <div className="space-y-2 pt-2">
                                {[1,2].map(j => <div key={j} className="h-16 skeleton rounded-xl" />)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : isMobile ? (
                /* �"?�"?�"? Mobile: Single Day Focus �"?�"?�"? */
                <div>
                    {/* Day strip */}
                    <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 mb-3" style={{ scrollbarWidth: 'none' }}>
                        {mobileDates.map(d => {
                            const active = d === mobileDate;
                            const today = isToday(d);
                            const dayTasks = getTasksForDate(d);
                            const hasTasks = dayTasks.length > 0;
                            return (
                                <button
                                    key={d}
                                    onClick={() => setMobileDate(d)}
                                    className={`
                                        flex-shrink-0 flex flex-col items-center justify-center rounded-xl
                                        w-[54px] h-[66px] transition-all duration-200 border
                                        ${active
                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                            : today
                                                ? 'bg-primary/5 text-primary border-primary/20'
                                                : 'bg-white text-slate-600 border-slate-100'
                                        }
                                    `}
                                >
                                    <span className={`text-[9px] font-medium ${active ? 'text-white/70' : 'text-slate-400'}`}>
                                        {dayLabel(d)}
                                    </span>
                                    <span className="text-lg font-bold leading-none">{dayNum(d)}</span>
                                    {hasTasks && !active && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Single day column (no DndContext needed for mobile) */}
                    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <DayColumn
                            dateStr={mobileDate}
                            tasks={getTasksForDate(mobileDate)}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                            actionLoading={actionLoading}
                            onAddClick={openAddModal}
                            isMobile
                        />
                        <DragOverlay>
                            {activeTask && <BlockCard task={activeTask} isOverlay />}
                        </DragOverlay>
                    </DndContext>
                </div>
            ) : (
                /* �"?�"?�"? Desktop: Multi-Day Board �"?�"?�"? */
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
                        {dates.map(d => (
                            <div key={d} data-today-col={isToday(d) ? 'true' : 'false'}>
                                <DayColumn
                                    dateStr={d}
                                    tasks={getTasksForDate(d)}
                                    onToggle={toggleTask}
                                    onDelete={deleteTask}
                                    actionLoading={actionLoading}
                                    onAddClick={openAddModal}
                                />
                            </div>
                        ))}
                    </div>
                    <DragOverlay>
                        {activeTask && <BlockCard task={activeTask} isOverlay />}
                    </DragOverlay>
                </DndContext>
            )}

            {/* �"?�"?�"? Today's Reviews Banner �"?�"?�"? */}
            {srsStats && (srsStats.due_today > 0 || srsStats.overdue > 0) && (
                <div className="mt-4 bg-gradient-to-l from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-3.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-violet-600" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>replay</span>
                            <div>
                                <p className="text-[13px] font-bold text-violet-800">�.راجعات ا�"�S�^�.</p>
                                <p className="text-[11px] text-violet-500">
                                    {srsStats.due_today > 0 && <span>{srsStats.due_today} �.راجعة �.ستح�,ة</span>}
                                    {srsStats.overdue > 0 && <span className="text-rose font-semibold"> · {srsStats.overdue} �.تأخرة</span>}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-violet-500">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>neurology</span>
                            {srsStats.total_tracked} درس �.تتبع
                        </div>
                    </div>
                </div>
            )}

            {/* �"?�"?�"? Modals �"?�"?�"? */}
            {showAddModal && (
                <AddBlockModal
                    date={addModalDate || fmt(new Date())}
                    onClose={() => setShowAddModal(false)}
                    onCreated={handleCreated}
                />
            )}
            {showAIModal && (
                <AIGenerateModal
                    onClose={() => setShowAIModal(false)}
                    onDone={handleAIDone}
                />
            )}
            {difficultyTask && (
                <DifficultyModal
                    task={difficultyTask}
                    onClose={() => setDifficultyTask(null)}
                    onSubmitted={() => { setDifficultyTask(null); fetchData(); fetchSRSStats(); }}
                />
            )}
        </div>
    );
}

// �"?�"?�"? Add Block Modal �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
function AddBlockModal({ date, onClose, onCreated }) {
    const toast = useToast();
    const [tab, setTab] = useState('lesson');
    const [courses, setCourses] = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [selectedCurriculum, setSelectedCurriculum] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedLesson, setSelectedLesson] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [timerDuration, setTimerDuration] = useState(30);
    const [timerTitle, setTimerTitle] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try { const r = await studentAPI.getPlannerCourses(); setCourses(r.data.data || []); }
            catch { toast.error('حدث خطأ ف�S تح�.�S�" ا�"�.�,ررات.'); }
            finally { setCoursesLoading(false); }
        })();
    }, []);

    const currCurr = courses.find(c => String(c.id) === selectedCurriculum);
    const currSec = currCurr?.sections?.find(s => String(s.id) === selectedSection);
    const currLes = currSec?.lessons?.find(l => String(l.id) === selectedLesson);

    const handleSubmit = async () => {
        if (submitting) return;

        let payload;
        if (tab === 'lesson') {
            if (!selectedLesson) { toast.error('�Sرج�? تحد�Sد ا�"درس.'); return; }
            payload = { date, type: 'lesson', lesson_id: parseInt(selectedLesson), title: currLes?.title };
        } else if (tab === 'custom') {
            if (!customTitle.trim()) { toast.error('�Sرج�? إدخا�" ع�?�^ا�? ا�"�.�?�.ة.'); return; }
            payload = { date, type: 'custom', title: customTitle.trim() };
        } else {
            if (timerDuration < 1) { toast.error('�Sرج�? تحد�Sد ا�"�.دة.'); return; }
            payload = { date, type: 'timer', title: timerTitle.trim() || `�.ؤ�,ت ${timerDuration} د�,�S�,ة`, metadata: { duration: timerDuration } };
        }

        setSubmitting(true);
        try {
            await studentAPI.createTask(payload);
            toast.success('ت�.ت ا�"إضافة!');
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.message || 'حدث خطأ.');
        } finally { setSubmitting(false); }
    };

    const tabs = [
        { key: 'lesson', label: 'درس', icon: 'menu_book' },
        { key: 'custom', label: '�.�?�.ة', icon: 'edit_note' },
        { key: 'timer', label: '�.ؤ�,ت', icon: 'timer' },
    ];

    const canSubmit = (tab === 'lesson' && selectedLesson) || (tab === 'custom' && customTitle.trim()) || (tab === 'timer' && timerDuration > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up max-h-[88vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>add_task</span>
                        إضافة ب�"�^�f
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{dayLabel(date)} {dayNum(date)}</span>
                        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2.5 text-[13px] font-semibold transition-all relative ${tab === t.key ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                            <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{t.icon}</span>{t.label}</span>
                            {tab === t.key && <div className="absolute bottom-0 inset-x-4 h-[2.5px] bg-primary rounded-t-full" />}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1">
                    {tab === 'lesson' ? (
                        <div className="space-y-3.5">
                            {coursesLoading ? (
                                <div className="space-y-3"><div className="h-11 skeleton rounded-xl" /><div className="h-11 skeleton rounded-xl" /></div>
                            ) : courses.length === 0 ? (
                                <div className="text-center py-8"><span className="material-symbols-outlined text-slate-300" style={{ fontSize: '36px' }}>school</span><p className="text-sm text-slate-400 mt-1">�"ا ت�^جد �.�,ررات</p></div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">ا�"�.�,رر</label>
                                        <select value={selectedCurriculum} onChange={e => { setSelectedCurriculum(e.target.value); setSelectedSection(''); setSelectedLesson(''); }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none">
                                            <option value="">اختر ا�"�.�,رر...</option>
                                            {courses.map(c => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    {selectedCurriculum && currCurr?.sections?.length > 0 && (
                                        <div className="animate-fade-in">
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ا�"�^حدة</label>
                                            <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setSelectedLesson(''); }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none">
                                                <option value="">اختر ا�"�^حدة...</option>
                                                {currCurr.sections.map(s => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {selectedSection && currSec?.lessons?.length > 0 && (
                                        <div className="animate-fade-in">
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ا�"درس</label>
                                            <select value={selectedLesson} onChange={e => setSelectedLesson(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none">
                                                <option value="">اختر ا�"درس...</option>
                                                {currSec.lessons.map(l => <option key={l.id} value={String(l.id)}>{l.title}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {currLes && (
                                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 animate-scale-in flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                            <div><p className="text-sm font-semibold text-slate-800">{currLes.title}</p><p className="text-[10px] text-slate-400">{currCurr?.title}</p></div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : tab === 'custom' ? (
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ع�?�^ا�? ا�"�.�?�.ة</label>
                            <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="�.ثا�": �.راجعة ا�"فص�" ا�"ثا�"ث..." className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-slate-300" maxLength={255} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 mb-2">�.دة ا�"�.ؤ�,ت</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[15, 30, 45, 60].map(m => (
                                        <button key={m} onClick={() => setTimerDuration(m)} className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${timerDuration === m ? 'bg-amber/10 border-amber text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber/30'}`}>
                                            {m} د
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <label className="text-[11px] text-slate-500 font-semibold flex-shrink-0">�.دة �.حددة:</label>
                                    <input type="number" min="1" max="360" value={timerDuration} onChange={e => setTimerDuration(parseInt(e.target.value) || 0)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-center outline-none focus:border-amber" />
                                    <span className="text-[11px] text-slate-400">د�,�S�,ة</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">ع�?�^ا�? (اخت�Sار�S)</label>
                                <input type="text" value={timerTitle} onChange={e => setTimerTitle(e.target.value)} placeholder="�.ذا�fرة تر�f�Sز..." className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-amber/20 focus:border-amber outline-none placeholder:text-slate-300" maxLength={255} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={handleSubmit} disabled={submitting || !canSubmit} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${submitting || !canSubmit ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-[0.98]'}`}>
                        {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ ا�"إضافة...</> : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_task</span>إضافة</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// �"?�"?�"? AI Generate Modal �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
function AIGenerateModal({ onClose, onDone }) {
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [curriculum, setCurriculum] = useState('');
    const [numDays, setNumDays] = useState(7);
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return fmt(d); });
    const [dailyMinutes, setDailyMinutes] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try { const r = await studentAPI.getPlannerCourses(); setCourses(r.data.data || []); }
            catch { /* silent */ }
            finally { setCoursesLoading(false); }
        })();
    }, []);

    const selectedCourse = courses.find(c => String(c.id) === curriculum);
    const totalLessons = selectedCourse?.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 0;
    const perDay = numDays > 0 ? Math.ceil(totalLessons / numDays) : 0;

    const handleGenerate = async () => {
        if (!curriculum) { toast.error('�Sرج�? تحد�Sد ا�"�.�,رر.'); return; }
        if (numDays < 1 || numDays > 30) { toast.error('عدد ا�"أ�Sا�. ب�S�? 1 �^ 30.'); return; }

        setSubmitting(true);
        try {
            const res = await studentAPI.aiGeneratePlan({
                curriculum_id: parseInt(curriculum),
                num_days: numDays,
                start_date: startDate,
                daily_minutes: dailyMinutes > 0 ? dailyMinutes : undefined,
            });
            toast.success(res.data.message);
            onDone();
        } catch (err) {
            toast.error(err.response?.data?.message || 'حدث خطأ ف�S إ�?شاء ا�"خطة.');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up max-h-[88vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined bg-gradient-to-l from-purple-600 to-indigo-600 bg-clip-text text-transparent" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1", WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>auto_awesome</span>
                        خطة ذ�f�Sة
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span></button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <p className="text-[13px] text-slate-500 leading-relaxed bg-purple-50 rounded-xl p-3 border border-purple-100">
                        <span className="font-semibold text-purple-700">�f�Sف �Sع�.�"�Y</span> �?" �S�,�^�. ا�"ذ�fاء ا�"اصط�?اع�S بتح�"�S�" در�^س ا�"�.�,رر �^ت�^ز�Sع�?ا بش�f�" �.ت�^از�? ع�"�? ا�"أ�Sا�. ا�"�.حددة.
                    </p>

                    {/* Curriculum */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">ا�"�.�,رر</label>
                        {coursesLoading ? <div className="h-11 skeleton rounded-xl" /> : (
                            <select value={curriculum} onChange={e => setCurriculum(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none appearance-none">
                                <option value="">اختر ا�"�.�,رر...</option>
                                {courses.map(c => <option key={c.id} value={String(c.id)}>{c.title} �?" {c.subject}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Num days slider */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">عدد ا�"أ�Sا�.: <span className="text-primary font-bold">{numDays}</span></label>
                        <input type="range" min="1" max="14" value={numDays} onChange={e => setNumDays(parseInt(e.target.value))} className="w-full accent-purple-600" />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>1 �S�^�.</span><span>14 �S�^�.</span></div>
                    </div>

                    {/* Start date */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">تار�Sخ ا�"بدا�Sة</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
                    </div>

                    {/* Daily minutes (optional) */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-2">�^�,ت ا�"�.ذا�fرة ا�"�S�^�.�S (اخت�Sار�S)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[0, 30, 60, 90].map(m => (
                                <button key={m} onClick={() => setDailyMinutes(m)} className={`py-2 rounded-xl border text-[12px] font-semibold transition-all ${dailyMinutes === m ? 'bg-purple-50 border-purple-400 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-purple-200'}`}>
                                    {m === 0 ? 'ت�"�,ائ�S' : `${m} د`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    {curriculum && totalLessons > 0 && (
                        <div className="bg-gradient-to-l from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-100 animate-scale-in">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-purple-600" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>insights</span>
                                <span className="text-[12px] font-bold text-purple-700">�.عا�S�?ة ا�"خطة</span>
                            </div>
                            <p className="text-[12px] text-slate-600 leading-relaxed">
                                س�Sت�. ت�^ز�Sع <strong className="text-purple-700">{totalLessons} درس</strong> ع�"�? <strong className="text-purple-700">{numDays} أ�Sا�.</strong>
                                {' '}(�?^{perDay} {perDay > 1 ? 'در�^س' : 'درس'} �S�^�.�Sا�<)
                            </p>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={handleGenerate} disabled={submitting || !curriculum} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${submitting || !curriculum ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-l from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/20 hover:shadow-xl active:scale-[0.98]'}`}>
                        {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جارٍ إ�?شاء ا�"خطة...</> : <><span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>إ�?شاء خطة ذ�f�Sة</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// �"?�"?�"? Difficulty Modal (SRS) �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
function DifficultyModal({ task, onClose, onSubmitted }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    const handleSubmit = async (difficulty) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await studentAPI.submitDifficulty({ task_id: task.id, difficulty });
            setSubmitted(res.data.data);
            toast.success(res.data.message);
            setTimeout(() => onSubmitted(), 2000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'حدث خطأ.');
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const options = [
        {
            key: 'hard',
            label: 'صعب',
            desc: '�"�. أف�?�. ج�Sدا�<',
            icon: 'sentiment_dissatisfied',
            gradient: 'from-rose-500 to-red-500',
            glow: 'shadow-rose-500/20',
            bg: 'hover:bg-rose-50 hover:border-rose-200',
        },
        {
            key: 'medium',
            label: '�.ت�^سط',
            desc: 'ف�?�.ت بعض ا�"أجزاء',
            icon: 'sentiment_neutral',
            gradient: 'from-amber-500 to-orange-500',
            glow: 'shadow-amber-500/20',
            bg: 'hover:bg-amber-50 hover:border-amber-200',
        },
        {
            key: 'easy',
            label: 'س�?�"',
            desc: 'ف�?�.ت با�"�fا�.�"',
            icon: 'sentiment_satisfied',
            gradient: 'from-emerald-500 to-green-500',
            glow: 'shadow-emerald-500/20',
            bg: 'hover:bg-emerald-50 hover:border-emerald-200',
        },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" dir="rtl">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!submitted ? onClose : undefined} />
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl animate-scale-in overflow-hidden mx-4">
                {submitted ? (
                    /* Success state */
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-violet-100">
                            <span className="material-symbols-outlined text-violet-600" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>neurology</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">ت�. تسج�S�" ا�"ت�,�S�S�.!</h3>
                        <p className="text-sm text-slate-500 mb-3">
                            ا�"�.راجعة ا�"�,اد�.ة بعد <strong className="text-violet-600">{submitted.interval} {submitted.interval === 1 ? '�S�^�.' : 'أ�Sا�.'}</strong>
                        </p>
                        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                            <span>ا�"ت�fرار #{submitted.repetition_count}</span>
                            <span>·</span>
                            <span>�.عا�.�" ا�"س�?�^�"ة: {submitted.ease_factor}</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-5 pb-2 text-center">
                            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-violet-100">
                                <span className="material-symbols-outlined text-violet-600" style={{ fontSize: '26px', fontVariationSettings: "'FILL' 1" }}>psychology</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">�f�Sف �fا�?ت صع�^بة ا�"درس�Y</h3>
                            <p className="text-[13px] text-slate-400 truncate px-4">{task.title}</p>
                        </div>

                        {/* Options */}
                        <div className="p-5 pt-3 space-y-2.5">
                            {options.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => handleSubmit(opt.key)}
                                    disabled={submitting}
                                    className={`
                                        w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 transition-all
                                        ${opt.bg}
                                        ${submitting ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
                                    `}
                                >
                                    <span className={`w-9 h-9 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center shadow-lg ${opt.glow}`}>
                                        <span className="material-symbols-outlined text-white" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                                    </span>
                                    <div className="text-right">
                                        <p className="text-[13px] font-bold text-slate-800">{opt.label}</p>
                                        <p className="text-[11px] text-slate-400">{opt.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Skip */}
                        <div className="px-5 pb-4">
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="w-full py-2 text-[12px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                تخط�S ا�"ت�,�S�S�.
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}



