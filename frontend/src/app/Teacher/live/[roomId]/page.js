'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, DoorOpen, Radio } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import JitsiMeet from '@/components/live/JitsiMeet';

export default function TeacherLiveRoom({ params }) {
    // Unwrap the promise-based params using React.use().
    const resolvedParams = use(params);
    const roomId = resolvedParams.roomId;

    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [copied, setCopied] = useState(false);
    const joinLink =
        typeof window !== 'undefined'
            ? `${window.location.origin}/student/live/${roomId}`
            : `/student/live/${roomId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(joinLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div dir="rtl" className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)] lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F8EAF2] text-[#BE185D]">
                        <Radio className="h-5 w-5" />
                        <div className="absolute -top-1 -left-1 h-3 w-3 rounded-full border-2 border-white bg-[#BE185D] animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">غرفة البث المباشر</h2>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">ID: {roomId}</p>
                    </div>
                </div>

                <div className="w-full max-w-2xl flex-1">
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <span className="truncate font-mono text-xs text-slate-500" dir="ltr">
                            {joinLink}
                        </span>
                        <button
                            onClick={handleCopy}
                            className={`touch-target inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                copied ? 'bg-emerald/10 text-emerald' : 'bg-[#EAF0FE] text-[#4C57B7] hover:bg-[#DCE6FD]'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    تم النسخ
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    نسخ الرابط
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/Teacher/live')}
                    className="touch-target inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose/10 px-4 py-2 text-sm font-semibold text-rose transition-colors hover:bg-rose/20"
                >
                    <DoorOpen className="h-4 w-4" />
                    إنهاء الجلسة
                </button>
            </div>

            <div className="flex-1 overflow-hidden rounded-[18px] border border-slate-200/70 bg-slate-900 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.4)]">
                <JitsiMeet roomName={roomId} displayName={user?.name || 'المعلم'} isModerator={true} />
            </div>
        </div>
    );
}
