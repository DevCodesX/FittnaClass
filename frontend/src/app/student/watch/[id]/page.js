'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { studentAPI } from '@/lib/api';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITIES = ['1080p', '720p', '480p', '360p', '144p', 'Auto'];

export default function WatchPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const containerRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [currentLesson, setCurrentLesson] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeLiveSession, setActiveLiveSession] = useState(null);

    // Installment state
    const [installmentInfo, setInstallmentInfo] = useState(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payReceiptFile, setPayReceiptFile] = useState(null);
    const [payReceiptPreview, setPayReceiptPreview] = useState(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    // Player state
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [quality, setQuality] = useState('Auto');
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [videoError, setVideoError] = useState(false);

    useEffect(() => {
        async function fetchContent() {
            try {
                const [res, liveRes] = await Promise.all([
                    studentAPI.getCurriculumContent(id),
                    studentAPI.getActiveLiveSession(id).catch(() => ({ data: { data: null } }))
                ]);
                const curriculum = res.data.data;
                setCourse(curriculum);
                setActiveLiveSession(liveRes.data?.data || null);

                // Flatten sections → lessons into a single ordered array
                const allLessons = [];
                for (const section of curriculum?.sections || []) {
                    for (const lesson of section.lessons || []) {
                        allLessons.push({ ...lesson, sectionTitle: section.title });
                    }
                }
                setLessons(allLessons);

                // Set installment info if present
                if (curriculum?.installment_info) {
                    setInstallmentInfo(curriculum.installment_info);
                }
            } catch (err) {
                if (err.response?.status === 403) {
                    toast.error('ليس لديك صلاحية للوصول لهذا المقرر.');
                    router.push('/student/my-courses');
                } else {
                    toast.error('فشل تحميل محتوى المقرر.');
                }
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Auto-fullscreen on landscape
    useEffect(() => {
        const handleOrientation = () => {
            if (screen.orientation && screen.orientation.type.includes('landscape') && videoRef.current) {
                containerRef.current?.requestFullscreen?.();
            }
        };
        screen.orientation?.addEventListener?.('change', handleOrientation);
        return () => screen.orientation?.removeEventListener?.('change', handleOrientation);
    }, []);

    // Controls auto-hide
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (playing) setShowControls(false);
        }, 3000);
    }, [playing]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (playing) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setPlaying(!playing);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleProgressClick = (e) => {
        if (!progressRef.current || !videoRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoRef.current.currentTime = pos * duration;
    };

    const handleSpeedChange = (newSpeed) => {
        setSpeed(newSpeed);
        if (videoRef.current) videoRef.current.playbackRate = newSpeed;
        setShowSpeedMenu(false);
    };

    const handleVolumeChange = (e) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        setMuted(vol === 0);
        if (videoRef.current) {
            videoRef.current.volume = vol;
            videoRef.current.muted = vol === 0;
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !muted;
            setMuted(!muted);
        }
    };

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch { }
    };

    const selectLesson = (index) => {
        const lesson = lessons[index];
        if (lesson?.is_locked) {
            toast.error('هذا الدرس مقفل. ادفع القسط التالي لفتحه.');
            return;
        }
        setCurrentLesson(index);
        setPlaying(false);
        setCurrentTime(0);
        setVideoError(false);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.pause();
        }
    };

    const handlePayInstallment = async () => {
        if (!payReceiptFile) {
            toast.error('يرجى إرفاق إيصال الدفع.');
            return;
        }
        setSubmittingPayment(true);
        try {
            const formData = new FormData();
            formData.append('receipt', payReceiptFile);
            await studentAPI.payInstallment(id, formData);
            toast.success('تم إرسال إيصال القسط بنجاح! في انتظار الموافقة.');
            setShowPayModal(false);
            setPayReceiptFile(null);
            setPayReceiptPreview(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل في إرسال الإيصال.');
        } finally {
            setSubmittingPayment(false);
        }
    };

    const formatTime = (s) => {
        if (isNaN(s)) return '0:00';
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentLessonData = lessons[currentLesson];

    useEffect(() => {
        setVideoError(false);
    }, [currentLessonData?.video_url]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row">
            {/* Video Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
                    <Link
                        href="/student/my-courses"
                        className="touch-target w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{course?.title}</p>
                        <p className="text-slate-400 text-xs truncate">
                            #{course?.course_code} · الدرس {currentLesson + 1} من {lessons.length}
                        </p>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="touch-target w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                {/* Active Live Session Banner */}
                {activeLiveSession && (
                    <div className="bg-red-600/20 border-b border-red-500/30 px-4 py-3 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <div>
                                <h4 className="text-red-100 font-bold text-sm">البث المباشر يعمل الآن: {activeLiveSession.title}</h4>
                                {activeLiveSession.description && (
                                    <p className="text-red-200/80 text-xs mt-0.5">{activeLiveSession.description}</p>
                                )}
                            </div>
                        </div>
                        <button 
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
                            onClick={() => toast.success('تم الانضمام لغرفة الانتظار (سيتم تفعيل البث هنا)')}
                        >
                            انضم للبث
                        </button>
                    </div>
                )}

                {/* Installment Payment Progress */}
                {installmentInfo && (
                    <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>دفعت {installmentInfo.paid_amount?.toFixed(2)} من {installmentInfo.total_price?.toFixed(2)} ج.م</span>
                            <span>{installmentInfo.unlock_percentage?.toFixed(0)}% مفتوح</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                                style={{ width: `${installmentInfo.unlock_percentage || 0}%` }}
                            />
                        </div>
                        {installmentInfo.unlock_percentage < 100 && (
                            <button
                                onClick={() => setShowPayModal(true)}
                                className="mt-2 w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors"
                            >
                                ادفع القسط التالي
                            </button>
                        )}
                    </div>
                )}

                {/* Video Player */}
                <div
                    ref={containerRef}
                    className="relative flex-1 bg-black flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                    onMouseMove={showControlsTemporarily}
                >
                    {currentLessonData?.video_url ? (
                        <>
                            {videoError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center z-10" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-4xl mb-4">⚠️</span>
                                    <h3 className="text-white font-medium text-lg mb-2">Video Unavailable</h3>
                                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                                        We're having trouble loading this video. The file might be missing or unsupported.
                                    </p>
                                    <button 
                                        onClick={() => {
                                            setVideoError(false);
                                            if (videoRef.current) videoRef.current.load();
                                        }}
                                        className="px-4 py-2 bg-emerald hover:bg-emerald/90 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            <video
                                ref={videoRef}
                                src={currentLessonData.video_url}
                                className={`w-full h-full object-contain ${videoError ? 'invisible' : 'visible'}`}
                                preload="metadata"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onError={() => {
                                    setVideoError(true);
                                    setPlaying(false);
                                }}
                                onEnded={() => {
                                    setPlaying(false);
                                    if (currentLesson < lessons.length - 1) {
                                        selectLesson(currentLesson + 1);
                                    }
                                }}
                            />

                            {/* Play overlay */}
                            {!playing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                                        <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Controls */}
                            <div
                                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
                                    }`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Progress bar */}
                                <div
                                    ref={progressRef}
                                    className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-4 group hover:h-2.5 transition-all"
                                    onClick={handleProgressClick}
                                >
                                    <div
                                        className="h-full bg-emerald rounded-full relative"
                                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-emerald rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {/* Play/Pause */}
                                        <button onClick={togglePlay} className="touch-target w-10 h-10 flex items-center justify-center text-white hover:text-emerald transition-colors">
                                            {playing ? (
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            )}
                                        </button>

                                        {/* Volume */}
                                        <button onClick={toggleMute} className="touch-target w-10 h-10 flex items-center justify-center text-white hover:text-emerald transition-colors">
                                            {muted || volume === 0 ? (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-3.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                                            )}
                                        </button>
                                        <input
                                            type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                            className="w-20 h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                                        />

                                        {/* Time */}
                                        <span className="text-white/80 text-xs font-mono ml-2">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Speed */}
                                        <div className="relative">
                                            <button
                                                onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }}
                                                className="touch-target px-3 h-9 text-white/80 hover:text-white text-xs font-medium rounded-lg hover:bg-white/10 transition-colors"
                                            >
                                                {speed}x
                                            </button>
                                            {showSpeedMenu && (
                                                <div className="absolute bottom-12 right-0 bg-slate-800 rounded-xl shadow-2xl p-2 min-w-[100px] animate-scale-in">
                                                    {SPEEDS.map((s) => (
                                                        <button
                                                            key={s}
                                                            onClick={() => handleSpeedChange(s)}
                                                            className={`touch-target w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${speed === s ? 'bg-emerald/20 text-emerald' : 'text-white/80 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {s}x
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quality */}
                                        <div className="relative">
                                            <button
                                                onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}
                                                className="touch-target px-3 h-9 text-white/80 hover:text-white text-xs font-medium rounded-lg hover:bg-white/10 transition-colors"
                                            >
                                                {quality}
                                            </button>
                                            {showQualityMenu && (
                                                <div className="absolute bottom-12 right-0 bg-slate-800 rounded-xl shadow-2xl p-2 min-w-[120px] animate-scale-in">
                                                    {QUALITIES.map((q) => (
                                                        <button
                                                            key={q}
                                                            onClick={() => { setQuality(q); setShowQualityMenu(false); }}
                                                            className={`touch-target w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${quality === q ? 'bg-emerald/20 text-emerald' : 'text-white/80 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Fullscreen */}
                                        <button onClick={toggleFullscreen} className="touch-target w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {isFullscreen ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-white/50 p-8">
                            <p className="text-5xl mb-4">🎥</p>
                            <p className="text-lg font-medium">
                                {lessons.length > 0
                                    ? 'سيتم تحميل الفيديو هنا'
                                    : 'لا توجد دروس في هذا المقرر بعد'}
                            </p>
                            <p className="text-sm text-white/30 mt-2">
                                {currentLessonData?.video_url || 'اطلب من المعلم إضافة محتوى فيديو'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Lesson Title Bar */}
                <div className="px-4 py-3 bg-slate-800 border-t border-slate-700">
                    <h3 className="text-white font-medium text-sm truncate">
                        {currentLessonData?.title || `Lesson ${currentLesson + 1}`}
                    </h3>
                </div>
            </div>

            {/* Sidebar — Lesson List */}
            <div
                className={`${sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                    } fixed lg:static right-0 top-0 bottom-0 z-50 lg:z-auto w-80 bg-slate-800 border-l border-slate-700 transition-transform lg:translate-x-0 overflow-y-auto`}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                    <h3 className="text-white font-semibold text-sm">محتوى المقرر</h3>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="touch-target lg:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="py-2">
                    {lessons.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-8">لا توجد دروس متاحة</p>
                    ) : (
                        lessons.map((lesson, index) => (
                            <button
                                key={lesson.id}
                                onClick={() => {
                                    selectLesson(index);
                                    if (!lesson.is_locked) setSidebarOpen(false);
                                }}
                                className={`touch-target w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${lesson.is_locked
                                        ? 'opacity-50 cursor-not-allowed'
                                        : index === currentLesson
                                            ? 'bg-emerald/10 border-l-2 border-emerald'
                                            : 'hover:bg-white/5 border-l-2 border-transparent'
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${lesson.is_locked
                                            ? 'bg-slate-600 text-slate-400'
                                            : index === currentLesson
                                                ? 'bg-emerald text-white'
                                                : 'bg-slate-700 text-slate-300'
                                        }`}
                                >
                                    {lesson.is_locked ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`text-sm font-medium truncate ${lesson.is_locked
                                                ? 'text-slate-500'
                                                : index === currentLesson ? 'text-emerald' : 'text-slate-300'
                                            }`}
                                    >
                                        {lesson.title}
                                    </p>
                                    {lesson.is_locked && (
                                        <p className="text-[10px] text-slate-500">مقفل — ادفع القسط التالي</p>
                                    )}
                                </div>
                                {!lesson.is_locked && index === currentLesson && (
                                    <div className="w-2 h-2 bg-emerald rounded-full flex-shrink-0" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Pay Next Installment Modal */}
            {showPayModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-slide-up">
                        <button onClick={() => setShowPayModal(false)} className="absolute left-4 top-4 text-slate-400 hover:text-slate-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h2 className="text-lg font-bold text-slate-800 mb-1 text-right">ادفع القسط التالي</h2>
                        <p className="text-sm text-slate-500 mb-5 text-right">
                            القسط {(installmentInfo?.approved_count || 0) + 1} من {installmentInfo?.total_installments}
                        </p>

                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary/40 transition-colors cursor-pointer relative mb-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setPayReceiptFile(file);
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setPayReceiptPreview(ev.target.result);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {payReceiptPreview ? (
                                <div className="space-y-2">
                                    <img src={payReceiptPreview} alt="Receipt" className="max-h-40 mx-auto rounded-xl" />
                                    <p className="text-sm text-emerald-600 font-medium">✓ تم إرفاق الإيصال</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-3xl mb-2">📸</p>
                                    <p className="text-sm font-medium text-slate-600">انقر لإرفاق إيصال الدفع</p>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handlePayInstallment}
                            disabled={submittingPayment || !payReceiptFile}
                            className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {submittingPayment ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'إرسال الإيصال'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
