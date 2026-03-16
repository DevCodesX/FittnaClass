'use client';

import { useEffect, useRef } from 'react';

export default function Modal({ isOpen, onClose, children, title, size = 'md', autoCloseSeconds = null }) {
    const overlayRef = useRef(null);
    const timerRef = useRef(null);
    const activityRef = useRef(0);

    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Auto-close after inactivity
    useEffect(() => {
        if (!isOpen || !autoCloseSeconds) return;

        const resetTimer = () => {
            activityRef.current = Date.now();
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                onClose();
            }, autoCloseSeconds * 1000);
        };

        resetTimer();
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach((e) => document.addEventListener(e, resetTimer));

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((e) => document.removeEventListener(e, resetTimer));
        };
    }, [isOpen, autoCloseSeconds, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw]',
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden animate-scale-in`}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                        <button
                            onClick={onClose}
                            className="touch-target rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
            </div>
        </div>
    );
}

