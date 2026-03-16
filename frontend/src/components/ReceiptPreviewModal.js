'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

export default function ReceiptPreviewModal({ isOpen, onClose, receiptUrl, onApprove, onReject }) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [action, setAction] = useState(null); // 'approve' | 'reject'
    const [rejectReason, setRejectReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const intervalRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    const imgRef = useRef(null);

    // Auto-close timer
    useEffect(() => {
        if (!isOpen) return;
        setTimeLeft(30);
        lastActivityRef.current = Date.now();

        intervalRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
            const remaining = Math.max(0, 30 - elapsed);
            setTimeLeft(remaining);
            if (remaining <= 0) {
                onClose();
            }
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [isOpen, onClose]);

    // Reset activity on interaction
    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        setTimeLeft(30);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach((e) => document.addEventListener(e, resetActivity));
        return () => events.forEach((e) => document.removeEventListener(e, resetActivity));
    }, [isOpen, resetActivity]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setRotation(0);
            setAction(null);
            setRejectReason('');
        }
    }, [isOpen]);

    const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
    const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25));
    const handleRotate = () => setRotation((r) => (r + 90) % 360);
    const handleReset = () => { setScale(1); setRotation(0); };

    const handleWheel = (e) => {
        e.preventDefault();
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
    };

    const handleApprove = async () => {
        setLoading(true);
        try {
            await onApprove();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        setLoading(true);
        try {
            await onReject(rejectReason);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Receipt Preview">
            <div className="relative">
                {/* Timer bar */}
                <div className="h-1 bg-slate-100">
                    <div
                        className="h-full bg-amber transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                </div>

                {/* Controls bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <button onClick={handleZoomIn} className="touch-target w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors text-sm font-bold">+</button>
                        <button onClick={handleZoomOut} className="touch-target w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors text-sm font-bold">−</button>
                        <button onClick={handleRotate} className="touch-target w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors" title="Rotate">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button onClick={handleReset} className="touch-target px-3 h-9 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 hover:bg-slate-100 transition-colors">Reset</button>
                    </div>
                    <span className="text-xs text-slate-400">{Math.round(scale * 100)}% · {timeLeft}s</span>
                </div>

                {/* Image area */}
                <div
                    className="flex items-center justify-center overflow-auto bg-slate-900/5 p-4"
                    style={{ height: '50vh' }}
                    onWheel={handleWheel}
                >
                    {receiptUrl ? (
                        <img
                            ref={imgRef}
                            src={`${API_BASE}${receiptUrl}`}
                            alt="Payment Receipt"
                            className="max-w-full max-h-full object-contain transition-transform duration-200"
                            style={{
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                            }}
                            draggable={false}
                        />
                    ) : (
                        <div className="text-slate-400 text-center">
                            <p className="text-4xl mb-2">🖼️</p>
                            <p>No receipt image available</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-200">
                    {action === 'reject' ? (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Reason for Rejection <span className="text-rose">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Please provide a reason for rejecting this receipt..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose transition-colors resize-none mb-4"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAction(null)}
                                    className="touch-target flex-1 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={!rejectReason.trim() || loading}
                                    className="touch-target flex-1 py-3 bg-rose text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        '✕ Confirm Rejection'
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="touch-target flex-1 py-3.5 bg-emerald text-white font-semibold rounded-xl hover:bg-emerald-dark transition-colors shadow-lg shadow-emerald/20 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    '✓ Accept Receipt'
                                )}
                            </button>
                            <button
                                onClick={() => setAction('reject')}
                                className="touch-target flex-1 py-3.5 bg-rose text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-rose/20"
                            >
                                ✕ Reject Receipt
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
