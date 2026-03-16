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

    useEffect(() => {
        async function fetchContent() {
            try {
                const res = await studentAPI.getCourseContent(id);
                setCourse(res.data.data);
                setLessons(res.data.data?.contents || []);
            } catch (err) {
                if (err.response?.status === 403) {
                    toast.error('You do not have access to this course.');
                    router.push('/student/my-courses');
                } else {
                    toast.error('Failed to load course content.');
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
        setCurrentLesson(index);
        setPlaying(false);
        setCurrentTime(0);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.pause();
        }
    };

    const formatTime = (s) => {
        if (isNaN(s)) return '0:00';
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const currentLessonData = lessons[currentLesson];

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
                            #{course?.course_code} · Lesson {currentLesson + 1} of {lessons.length}
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

                {/* Video Player */}
                <div
                    ref={containerRef}
                    className="relative flex-1 bg-black flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                    onMouseMove={showControlsTemporarily}
                >
                    {currentLessonData?.video_url ? (
                        <>
                            <video
                                ref={videoRef}
                                src={currentLessonData.video_url}
                                className="w-full h-full object-contain"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
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
                                    ? 'Video URL will load here'
                                    : 'No lessons available for this course yet'}
                            </p>
                            <p className="text-sm text-white/30 mt-2">
                                {currentLessonData?.video_url || 'Ask your instructor to add video content'}
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
                    <h3 className="text-white font-semibold text-sm">Course Content</h3>
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
                        <p className="text-slate-400 text-sm text-center py-8">No lessons available</p>
                    ) : (
                        lessons.map((lesson, index) => (
                            <button
                                key={lesson.id}
                                onClick={() => {
                                    selectLesson(index);
                                    setSidebarOpen(false);
                                }}
                                className={`touch-target w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${index === currentLesson
                                        ? 'bg-emerald/10 border-l-2 border-emerald'
                                        : 'hover:bg-white/5 border-l-2 border-transparent'
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${index === currentLesson
                                            ? 'bg-emerald text-white'
                                            : 'bg-slate-700 text-slate-300'
                                        }`}
                                >
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`text-sm font-medium truncate ${index === currentLesson ? 'text-emerald' : 'text-slate-300'
                                            }`}
                                    >
                                        {lesson.title}
                                    </p>
                                </div>
                                {index === currentLesson && (
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
        </div>
    );
}
