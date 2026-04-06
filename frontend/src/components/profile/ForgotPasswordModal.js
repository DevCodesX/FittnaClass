import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { authAPI } from '@/lib/api';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';

export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }) {
    const toast = useToast();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    if (!isOpen) return null;

    const handleRequestOTP = async (e) => {
        if (e) e.preventDefault();
        if (!email.trim()) {
            toast.error('البريد الإلكتروني مطلوب');
            return;
        }

        setIsLoading(true);
        try {
            const res = await authAPI.forgotPassword({ email });
            if (res.data.success) {
                toast.success(step === 2 ? 'تم إعادة إرسال الرمز' : res.data.message);
                setCooldown(60);
                if (step === 1) setStep(2);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'فشل في إرسال الرمز');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            toast.error('رمز التحقق مطلوب');
            return;
        }

        setIsLoading(true);
        try {
            const res = await authAPI.verifyOTP({ email, otp });
            if (res.data.success) {
                toast.success(res.data.message);
                setResetToken(res.data.token);
                setStep(3);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'الرمز غير صحيح أو منتهي الصلاحية');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword !== confirmPassword) {
            toast.error('كلمات المرور غير متطابقة أو فارغة');
            return;
        }

        setIsLoading(true);
        try {
            const res = await authAPI.resetPassword({ token: resetToken, newPassword });
            if (res.data.success) {
                toast.success(res.data.message);
                onCloseModal(); // Close and reset modal
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
        } finally {
            setIsLoading(false);
        }
    };

    const onCloseModal = () => {
        setStep(1);
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setCooldown(0);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">
                        {step === 1 && 'استعادة كلمة المرور'}
                        {step === 2 && 'إدخال رمز التحقق'}
                        {step === 3 && 'كلمة مرور جديدة'}
                    </h2>
                    <button onClick={onCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 && (
                        <form onSubmit={handleRequestOTP} className="space-y-5">
                            <p className="text-sm text-slate-600">أدخل بريدك الإلكتروني المسجل وسنرسل لك رمز تحقق مكون من 6 أرقام.</p>
                            <FloatingLabelInput
                                id="forgot-email"
                                name="email"
                                type="email"
                                label="البريد الإلكتروني"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                dir="ltr"
                                startIcon="mail"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'إرسال الرمز'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-5">
                            <p className="text-sm text-slate-600">تم إرسال رمز التحقق إلى <strong dir="ltr">{email}</strong>. الصلاحية: 10 دقائق.</p>
                            <div>
                                <FloatingLabelInput
                                    id="forgot-otp"
                                    name="otp"
                                    type="text"
                                    label="رمز التحقق"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    dir="ltr"
                                    maxLength={6}
                                    startIcon="dialpad"
                                    required
                                    className="text-center tracking-widest text-lg font-bold"
                                />
                                <div className="flex justify-start mt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleRequestOTP(null)}
                                        disabled={cooldown > 0 || isLoading}
                                        className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors disabled:text-slate-400 disabled:cursor-not-allowed"
                                    >
                                        {cooldown > 0 ? `إعادة الإرسال خلال ${cooldown} ثانية` : 'إعادة إرسال الرمز'}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تحقق'}
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <p className="text-sm text-slate-600">أدخل كلمة المرور الجديدة الخاصة بك.</p>
                            <FloatingLabelInput
                                id="forgot-newpass"
                                name="newPassword"
                                type="password"
                                label="كلمة المرور الجديدة"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                dir="ltr"
                                startIcon="lock"
                                required
                                minLength={6}
                            />
                            <FloatingLabelInput
                                id="forgot-confirmpass"
                                name="confirmPassword"
                                type="password"
                                label="تأكيد كلمة المرور"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                dir="ltr"
                                startIcon="lock_clock"
                                required
                                minLength={6}
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'حفظ كلمة المرور'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
