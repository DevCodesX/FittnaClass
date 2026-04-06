'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import JitsiMeet from '@/components/live/JitsiMeet';

export default function StudentLiveRoom({ params }) {
    // Unwrap the promise-based params using React.use()
    const resolvedParams = use(params);
    const roomId = resolvedParams.roomId;
    
    const router = useRouter();
    const { user, isLoading } = useAuth();

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-slate-300 font-medium">جاري التحقق من الصلاحيات...</p>
                </div>
            </div>
        );
    }

    // Role safeguard: if a teacher tries to access student route, we can let them but maybe warn, or just allow it. No strict block needed right now since we know their role from useAuth
    // The layout already redirects if not student

    return (
        <div className="h-screen w-full flex flex-col bg-slate-900">
            {/* Minimal Header */}
            <div className="h-14 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/student/explore')}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
                        aria-label="العودة للصفحة الرئيسية"
                    >
                        <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose animate-pulse" />
                        <span className="text-white font-medium text-sm drop-shadow-sm">بث مباشر متصل</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 rounded-full px-3 py-1.5 border border-white/5">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-300">{user?.name}</span>
                </div>
            </div>

            {/* Jitsi Meet Container */}
            <div className="flex-1 w-full relative">
                <JitsiMeet 
                    roomName={roomId} 
                    displayName={user?.name || 'طالب'} 
                    isModerator={false} 
                />
            </div>
        </div>
    );
}
