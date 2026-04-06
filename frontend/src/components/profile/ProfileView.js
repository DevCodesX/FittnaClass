'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { authAPI } from '@/lib/api';
import ForgotPasswordModal from './ForgotPasswordModal';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';

export default function ProfileView() {
    const { user, updateSession } = useAuth();
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: user?.name || '',
        currentPassword: '',
        password: '',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.name }));
            if (user.avatar_url) setAvatarPreview(user.avatar_url);
        }
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('الرجاء اختيار صورة صالحة');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                toast.error('حجم الصورة يجب ألا يتجاوز 2 ميجابايت');
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(user?.avatar_url || null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            toast.error('الاسم بالكامل مطلوب');
            return;
        }

        if (formData.password && !formData.currentPassword) {
            toast.error('يرجى إدخال كلمة المرور الحالية لتغيير كلمة المرور');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            if (formData.password) {
                data.append('currentPassword', formData.currentPassword);
                data.append('password', formData.password);
            }
            if (avatarFile) data.append('avatar', avatarFile);

            const res = await authAPI.updateProfile(data);
            
            if (res.data.success) {
                toast.success('تم تحديث الملف الشخصي بنجاح');
                updateSession(res.data.data.user);
                setFormData(prev => ({ ...prev, currentPassword: '', password: '' })); // Clear password fields
                setAvatarFile(null); // Clear file status to show saved image properly
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">الملف الشخصي</h2>
                    <p className="text-sm text-slate-500 mt-1">قم بتحديث معلوماتك الشخصية والصورة الرمزية الخاصة بك.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative group shrink-0">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center">
                                {avatarPreview ? (
                                    <img 
                                        src={avatarPreview.startsWith('blob:') ? avatarPreview : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${avatarPreview}`} 
                                        alt="Profile Avatar" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl font-bold text-slate-300">
                                        {formData.name.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-dark transition-colors"
                                title="تغيير الصورة"
                            >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/jpeg, image/png, image/webp" 
                                className="hidden" 
                            />
                        </div>
                        <div className="text-center sm:text-right flex-1 flex flex-col items-center sm:items-start">
                            <h3 className="text-sm font-semibold text-slate-700">الصورة الرمزية</h3>
                            <p className="text-xs text-slate-500 mt-1">يفضل أن تكون الصورة مربعة وبحجم أقل من 2 ميجابايت. (JPEG, PNG, WebP)</p>
                            {avatarFile && (
                                <button 
                                    type="button" 
                                    onClick={handleRemoveAvatar}
                                    className="mt-3 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                    إلغاء الصورة المحددة
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-100" />

                    {/* Personal Info Section */}
                    <div className="space-y-6">
                        <FloatingLabelInput
                            id="email"
                            name="email"
                            type="email"
                            label="البريد الإلكتروني (غير قابل للتعديل)"
                            value={user?.email || ''}
                            disabled
                            dir="ltr"
                            startIcon="mail"
                        />

                        <FloatingLabelInput
                            id="name"
                            name="name"
                            type="text"
                            label="الاسم بالكامل"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            startIcon="person"
                        />

                        {/* Password Section */}
                        <div className="space-y-5 pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-800">تغيير كلمة المرور</h3>
                            
                            <div>
                                <FloatingLabelInput
                                    id="currentPassword"
                                    name="currentPassword"
                                    type="password"
                                    label="كلمة المرور الحالية"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    dir="ltr"
                                    startIcon="lock"
                                />
                                <div className="flex justify-end mt-1.5 ">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsForgotModalOpen(true)}
                                        className="text-xs text-primary hover:text-primary-dark font-semibold transition-colors"
                                    >
                                        نسيت كلمة المرور؟
                                    </button>
                                </div>
                            </div>

                            <div>
                                <FloatingLabelInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    label="كلمة المرور الجديدة (اختياري)"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    dir="ltr"
                                    startIcon="lock_reset"
                                />
                                <p className="text-xs text-slate-400 mt-1">ستبقى كلمة المرور القديمة كما هي إذا تركت هذا الحقل فارغاً.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px]"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "حفظ التغييرات"
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <ForgotPasswordModal 
                isOpen={isForgotModalOpen} 
                onClose={() => setIsForgotModalOpen(false)} 
                initialEmail={user?.email || ''}
            />
        </div>
    );
}
