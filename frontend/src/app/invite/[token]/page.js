'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { inviteAPI } from '@/lib/api';

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token;

    const [invite, setInvite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);

    const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('fittnaclass_token');

    useEffect(() => {
        verifyToken();
    }, [token]);

    async function verifyToken() {
        try {
            const res = await inviteAPI.verify(token);
            setInvite(res.data.data);
        } catch (err) {
            const code = err.response?.data?.code;
            const message = err.response?.data?.message || 'رابط الدعوة غير صالح.';
            setError({ code, message });
        } finally {
            setLoading(false);
        }
    }

    async function handleAccept() {
        setAccepting(true);
        try {
            await inviteAPI.accept(token);
            setAccepted(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'فشل قبول الدعوة.';
            setError({ code: 'ACCEPT_FAILED', message: msg });
        } finally {
            setAccepting(false);
        }
    }

    function handleContinueAsAdmin() {
        // Save invite token and redirect to auth with invite context
        if (typeof window !== 'undefined') {
            localStorage.setItem('fittnaclass_pending_invite', token);
        }
        router.push(`/?auth=register&invite=${token}`);
    }

    function handleLogin() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('fittnaclass_pending_invite', token);
        }
        router.push(`/?auth=login&invite=${token}`);
    }

    // ─── Permission label map ──────────────────
    const PERM_LABELS = {
        view_payments: 'عرض المدفوعات',
        approve_payments: 'قبول المدفوعات',
        reject_payments: 'رفض المدفوعات',
        create_lessons: 'إنشاء دروس',
        edit_lessons: 'تعديل دروس',
        delete_lessons: 'حذف دروس',
        view_students: 'عرض الطلاب',
        manage_students: 'إدارة الطلاب',
    };

    // ─── Loading ───────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50" dir="rtl">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#6C63FF]/20 border-t-[#6C63FF] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">جارٍ التحقق من الدعوة...</p>
                </div>
            </div>
        );
    }

    // ─── Error ─────────────────────────────────
    if (error) {
        const icons = {
            INVALID_TOKEN: '🔗',
            ALREADY_USED: '✅',
            CANCELLED: '🚫',
            EXPIRED: '⏰',
            ACCEPT_FAILED: '❌',
        };
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50" dir="rtl">
                <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200 max-w-md w-full mx-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">{icons[error.code] || '❌'}</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-3">الدعوة غير صالحة</h2>
                    <p className="text-slate-500 text-sm mb-6">{error.message}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-8 py-3 rounded-xl text-sm font-bold bg-[#6C63FF] text-white hover:bg-[#6C63FF]/90 transition-colors"
                    >
                        العودة للصفحة الرئيسية
                    </button>
                </div>
            </div>
        );
    }

    // ─── Accepted ─────────────────────────────
    if (accepted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50" dir="rtl">
                <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200 max-w-md w-full mx-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🎉</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-3">تم قبول الدعوة!</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        أنت الآن مشرف على مقرر <strong className="text-slate-700">{invite?.curriculum?.title}</strong>.
                    </p>
                    <button
                        onClick={() => router.push('/Teacher/dashboard')}
                        className="px-8 py-3 rounded-xl text-sm font-bold bg-[#6C63FF] text-white hover:bg-[#6C63FF]/90 transition-colors"
                    >
                        الذهاب للوحة التحكم
                    </button>
                </div>
            </div>
        );
    }

    // ─── Invite Details ───────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50" dir="rtl">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 max-w-lg w-full mx-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-[#6C63FF]/10 flex items-center justify-center mx-auto mb-5">
                        <span className="text-4xl">🛡️</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">دعوة للإشراف</h1>
                    <p className="text-slate-500 text-sm">
                        تمت دعوتك بواسطة <strong className="text-slate-700">{invite?.inviter?.name}</strong> لتكون مشرفًا
                    </p>
                </div>

                {/* Curriculum Info */}
                <div className="bg-gradient-to-br from-[#6C63FF]/5 to-transparent rounded-2xl p-5 mb-6 border border-[#6C63FF]/10">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{invite?.curriculum?.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-mono text-[#6C63FF] font-bold">{invite?.curriculum?.course_code}</span>
                        {invite?.curriculum?.subject && (
                            <>
                                <span>•</span>
                                <span>{invite?.curriculum?.subject}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Permissions */}
                <div className="mb-8">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">الصلاحيات الممنوحة لك:</h4>
                    <div className="flex flex-wrap gap-2">
                        {(invite?.permissions || []).map((perm) => (
                            <span
                                key={perm}
                                className="px-3 py-1 text-xs font-medium rounded-full bg-[#6C63FF]/10 text-[#6C63FF]"
                            >
                                {PERM_LABELS[perm] || perm}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Expiry notice */}
                <p className="text-[11px] text-slate-400 text-center mb-6">
                    تنتهي صلاحية هذه الدعوة في {new Date(invite?.expiresAt).toLocaleDateString('ar-EG', {
                        year: 'numeric', month: 'long', day: 'numeric',
                    })}
                </p>

                {/* Action buttons */}
                {isLoggedIn ? (
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#6C63FF] to-[#5A54E6] text-white hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-[#6C63FF]/20"
                    >
                        {accepting ? 'جارٍ القبول...' : '🛡️ قبول الدعوة والمتابعة كمشرف'}
                    </button>
                ) : (
                    <div className="space-y-3">
                        {/* Primary CTA: Continue as Admin */}
                        <button
                            onClick={handleContinueAsAdmin}
                            className="w-full py-4 rounded-xl text-sm font-bold bg-gradient-to-r from-[#6C63FF] to-[#5A54E6] text-white hover:opacity-90 transition-all shadow-lg shadow-[#6C63FF]/20 flex items-center justify-center gap-2"
                        >
                            <span>🛡️</span>
                            المتابعة كمشرف — إنشاء حساب
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[11px] text-slate-400 font-medium">أو</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* Secondary: Login */}
                        <button
                            onClick={handleLogin}
                            className="w-full py-3.5 rounded-xl text-sm font-bold border-2 border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/5 transition-colors flex items-center justify-center gap-2"
                        >
                            لديّ حساب بالفعل — تسجيل الدخول
                        </button>

                        <p className="text-center text-[10px] text-slate-400 mt-1">
                            سيتم قبول الدعوة تلقائيًا بعد تسجيل الدخول أو إنشاء الحساب
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
