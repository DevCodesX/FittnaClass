'use client';

import { useEffect, useRef, useState } from 'react';

const JitsiMeet = ({ roomName, displayName, isModerator, onReady }) => {
    const containerRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(null);
    const apiRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const loadJitsiScript = () =>
            new Promise((resolve, reject) => {
                if (window.JitsiMeetExternalAPI) {
                    resolve(window.JitsiMeetExternalAPI);
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://meet.jit.si/external_api.js';
                script.async = true;
                script.onload = () => resolve(window.JitsiMeetExternalAPI);
                script.onerror = () => reject(new Error('Failed to load Jitsi API'));
                document.body.appendChild(script);
            });

        const initMeeting = async () => {
            try {
                const JitsiMeetExternalAPI = await loadJitsiScript();
                if (!mounted) return;

                const domain = 'meet.jit.si';
                const options = {
                    roomName: `FittnaClass-${roomName}`,
                    width: '100%',
                    height: '100%',
                    parentNode: containerRef.current,
                    userInfo: {
                        displayName: displayName || (isModerator ? 'المعلم' : 'الطالب'),
                    },
                    configOverwrite: {
                        startWithAudioMuted: true,
                        startWithVideoMuted: true,
                        prejoinPageEnabled: true,
                        disableModeratorIndicator: false,
                        startScreenSharing: false,
                        enableEmailInStats: false,
                        disableDeepLinking: true,
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_WATERMARK_FOR_GUESTS: false,
                        SHOW_BRAND_WATERMARK: false,
                        BRAND_WATERMARK_LINK: '',
                        DEFAULT_BACKGROUND: '#0f172a',
                        DEFAULT_LOGO_URL: '',
                        DEFAULT_WELCOME_PAGE_LOGO_URL: '',
                    },
                };

                const api = new JitsiMeetExternalAPI(domain, options);
                apiRef.current = api;

                api.addEventListener('videoConferenceJoined', () => {
                    if (onReady) onReady(api);
                });

                setIsLoaded(true);
            } catch (err) {
                console.error('Jitsi initialization error:', err);
                if (mounted) setError(err.message);
            }
        };

        initMeeting();

        return () => {
            mounted = false;
            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }
        };
    }, [roomName, displayName, isModerator, onReady]);

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-[18px] border border-rose/20 bg-slate-900">
                <div className="rounded-xl bg-rose/10 p-6 text-center">
                    <span className="mb-3 block text-3xl">🚫</span>
                    <p className="font-medium text-rose">حدث خطأ أثناء تحميل البث المباشر</p>
                    <p className="mt-2 text-sm text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-slate-900">
            {!isLoaded && !error && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800">
                    <div className="flex flex-col items-center">
                        <div className="mb-3 h-9 w-9 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-sm font-medium text-slate-300">جاري تحميل غرفة البث...</p>
                    </div>
                </div>
            )}
            <div ref={containerRef} className="h-full w-full" />
        </div>
    );
};

export default JitsiMeet;
