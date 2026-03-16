'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { authAPI } from '@/lib/api';
import {
  loginSchema,
  registerStep1Schema,
  registerStudentStep2Schema,
  registerInstructorStep2Schema,
  validateForm,
} from '@/lib/validators';

const GRADE_LEVELS = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Prep 1', 'Prep 2', 'Prep 3', 'Secondary 1', 'Secondary 2', 'Secondary 3', 'University',
];

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

const GAP = '20px';
const INPUT_H = 'h-12';
const LABEL = 'text-xs text-slate-400 font-medium';

export default function LandingAuthCard({ mode, role, onModeChange, onRoleChange }) {
  const { login: authLogin } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    national_id: '',
    grade_level: '',
    specialization: '',
    subject: '',
    bio: '',
  });

  useEffect(() => {
    setRegisterForm((current) => ({ ...current, role }));
  }, [role]);

  useEffect(() => {
    setErrors({});
    setStep(1);
  }, [mode]);

  const inputCls = (field, ltr = false) => {
    const state = errors[field]
      ? 'border-rose/60 bg-rose/5 focus:border-rose focus:ring-rose/8'
      : 'border-slate-200/80 bg-slate-50/60 focus:border-primary/50 focus:bg-white focus:ring-primary/8';
    return `${INPUT_H} w-full rounded-xl border px-4 text-[13px] text-slate-800 placeholder:text-slate-300 outline-none transition-all duration-200 focus:ring-[3px] ${state} ${ltr ? 'text-left' : 'text-right'}`;
  };

  const handleLoginChange = ({ target }) => {
    setLoginForm((current) => ({ ...current, [target.name]: target.value }));
    if (errors[target.name]) setErrors((current) => ({ ...current, [target.name]: '' }));
  };

  const handleRegisterChange = ({ target }) => {
    setRegisterForm((current) => ({ ...current, [target.name]: target.value }));
    if (errors[target.name]) setErrors((current) => ({ ...current, [target.name]: '' }));
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    const validation = validateForm(loginSchema, loginForm);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await authAPI.login(loginForm);
      toast.success('تم تسجيل الدخول بنجاح.');
      authLogin(response.data.data.user, response.data.data.token);
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        toast.error('الخادم غير متاح الآن. تأكد من تشغيل Backend على المنفذ الصحيح.');
      } else {
        toast.error(error.response?.data?.message || 'تعذر تسجيل الدخول، حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const goToStepTwo = () => {
    const payload = {
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      role,
    };
    const validation = validateForm(registerStep1Schema, payload);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    const schema = role === 'student' ? registerStudentStep2Schema : registerInstructorStep2Schema;
    const payload = role === 'student'
      ? { national_id: registerForm.national_id, grade_level: registerForm.grade_level }
      : { specialization: registerForm.specialization, subject: registerForm.subject, bio: registerForm.bio };
    const validation = validateForm(schema, payload);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await authAPI.register({ ...registerForm, role });
      toast.success('تم إنشاء الحساب بنجاح.');
      authLogin(response.data.data.user, response.data.data.token);
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        toast.error('الخادم غير متاح الآن. تأكد من تشغيل Backend على المنفذ الصحيح.');
      } else {
        toast.error(error.response?.data?.message || 'تعذر إنشاء الحساب، حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setErrors({});
    setStep(1);
    onModeChange(nextMode, role);
  };

  const modeTabs = [
    { id: 'register', label: 'إنشاء حساب', icon: 'person_add' },
    { id: 'login', label: 'تسجيل الدخول', icon: 'login' },
  ];

  return (
    <article className="w-full rounded-3xl border border-slate-200/70 bg-white shadow-[0_24px_64px_-20px_rgba(15,23,42,0.18)]">
      <div style={{ padding: '24px 28px 28px' }}>
        <header className="mb-6 text-right">
          <h3 className="text-xl font-extrabold leading-snug tracking-tight text-slate-900">
            {mode === 'register' ? 'ابدأ خلال دقائق' : 'مرحبًا بعودتك'}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
            {mode === 'register'
              ? 'أنشئ حسابك للوصول إلى الدروس والاختبارات وخطة مذاكرة مناسبة لمستواك.'
              : 'سجّل الدخول لمتابعة تقدمك واستكمال دروسك من حيث توقفت.'}
          </p>
        </header>

        {mode === 'login' ? (
          <form
            onSubmit={submitLogin}
            className="text-right"
            style={{ display: 'flex', flexDirection: 'column', gap: GAP }}
          >
            <div>
              <label htmlFor="l-email" className={`mb-1.5 block ${LABEL}`}>البريد الإلكتروني</label>
              <input
                id="l-email"
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                autoComplete="email"
                dir="ltr"
                className={inputCls('email', true)}
                placeholder="name@example.com"
              />
              {errors.email && <p className="mt-1 text-[11px] font-medium text-rose">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="l-pass" className={`mb-1.5 block ${LABEL}`}>كلمة المرور</label>
              <input
                id="l-pass"
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                autoComplete="current-password"
                dir="ltr"
                className={inputCls('password', true)}
                placeholder="********"
              />
              {errors.password && <p className="mt-1 text-[11px] font-medium text-rose">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-white transition-all duration-200 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading
                ? <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <><Icon name="arrow_forward" className="text-base" />دخول إلى حسابك</>}
            </button>
          </form>
        ) : (
          <div className="text-right">
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${step >= 2 ? 'text-primary' : 'text-slate-300'}`}>
                  {role === 'student' ? 'بيانات الطالب' : 'الملف التعليمي'}
                </span>
                <span className={`text-[11px] font-semibold ${step >= 1 ? 'text-primary' : 'text-slate-300'}`}>
                  البيانات الأساسية
                </span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary to-secondary transition-all duration-500 ease-out"
                  style={{ width: step === 1 ? '50%' : '100%' }}
                />
              </div>
            </div>

            {step === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                <div className="rounded-xl bg-slate-50/80 p-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRoleChange('student')}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition-all duration-200 ${role === 'student'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon name="school" className="text-[16px]" />
                      طالب
                    </button>
                    <button
                      type="button"
                      onClick={() => onRoleChange('instructor')}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition-all duration-200 ${role === 'instructor'
                        ? 'bg-white text-secondary shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon name="co_present" className="text-[16px]" />
                      مدرس
                    </button>
                  </div>
                  {errors.role && <p className="mt-1 px-1 text-[11px] font-medium text-rose">{errors.role}</p>}
                </div>

                <div>
                  <label htmlFor="r-name" className={`mb-1.5 block ${LABEL}`}>الاسم الكامل</label>
                  <input
                    id="r-name"
                    type="text"
                    name="name"
                    value={registerForm.name}
                    onChange={handleRegisterChange}
                    autoComplete="name"
                    className={inputCls('name')}
                    placeholder="مثال: أحمد محمد"
                  />
                  {errors.name && <p className="mt-1 text-[11px] font-medium text-rose">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="r-email" className={`mb-1.5 block ${LABEL}`}>البريد الإلكتروني</label>
                  <input
                    id="r-email"
                    type="email"
                    name="email"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    autoComplete="email"
                    dir="ltr"
                    className={inputCls('email', true)}
                    placeholder="name@example.com"
                  />
                  {errors.email && <p className="mt-1 text-[11px] font-medium text-rose">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="r-pass" className={`mb-1.5 block ${LABEL}`}>كلمة المرور</label>
                  <input
                    id="r-pass"
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    autoComplete="new-password"
                    dir="ltr"
                    className={inputCls('password', true)}
                    placeholder="********"
                  />
                  <p className="mt-1 text-[11px] text-slate-300">الحد الأدنى 6 أحرف.</p>
                  {errors.password && <p className="mt-0.5 text-[11px] font-medium text-rose">{errors.password}</p>}
                </div>

                <button
                  type="button"
                  onClick={goToStepTwo}
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-[13px] font-bold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                >
                  التالي
                  <Icon name="arrow_forward" className="text-base" />
                </button>
              </div>
            ) : (
              <form onSubmit={submitRegister} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {role === 'student' ? (
                  <>
                    <div>
                      <label htmlFor="r-nid" className={`mb-1.5 block ${LABEL}`}>الرقم القومي</label>
                      <input
                        id="r-nid"
                        type="text"
                        name="national_id"
                        value={registerForm.national_id}
                        onChange={handleRegisterChange}
                        dir="ltr"
                        maxLength={14}
                        className={inputCls('national_id', true)}
                        placeholder="14 رقم"
                      />
                      {errors.national_id && <p className="mt-1 text-[11px] font-medium text-rose">{errors.national_id}</p>}
                    </div>
                    <div>
                      <label htmlFor="r-grade" className={`mb-1.5 block ${LABEL}`}>المرحلة الدراسية</label>
                      <select
                        id="r-grade"
                        name="grade_level"
                        value={registerForm.grade_level}
                        onChange={handleRegisterChange}
                        dir="ltr"
                        className={inputCls('grade_level', true)}
                      >
                        <option value="">Select grade level</option>
                        {GRADE_LEVELS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                      </select>
                      {errors.grade_level && <p className="mt-1 text-[11px] font-medium text-rose">{errors.grade_level}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor="r-spec" className={`mb-1.5 block ${LABEL}`}>التخصص</label>
                      <input
                        id="r-spec"
                        type="text"
                        name="specialization"
                        value={registerForm.specialization}
                        onChange={handleRegisterChange}
                        className={inputCls('specialization')}
                        placeholder="مثال: رياضيات أو فيزياء"
                      />
                      {errors.specialization && <p className="mt-1 text-[11px] font-medium text-rose">{errors.specialization}</p>}
                    </div>
                    <div>
                      <label htmlFor="r-subj" className={`mb-1.5 block ${LABEL}`}>المادة الأساسية</label>
                      <input
                        id="r-subj"
                        type="text"
                        name="subject"
                        value={registerForm.subject}
                        onChange={handleRegisterChange}
                        className={inputCls('subject')}
                        placeholder="المادة التي تدرّسها"
                      />
                      {errors.subject && <p className="mt-1 text-[11px] font-medium text-rose">{errors.subject}</p>}
                    </div>
                    <div>
                      <label htmlFor="r-bio" className={`mb-1.5 block ${LABEL}`}>نبذة قصيرة</label>
                      <textarea
                        id="r-bio"
                        name="bio"
                        value={registerForm.bio}
                        onChange={handleRegisterChange}
                        className="min-h-24 w-full rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-right text-[13px] leading-relaxed text-slate-800 placeholder:text-slate-300 outline-none transition-all duration-200 focus:border-primary/50 focus:bg-white focus:ring-[3px] focus:ring-primary/8"
                        placeholder="أخبر الطلاب عن خبرتك أو أسلوب الشرح."
                      />
                    </div>
                  </>
                )}

                <div className="mt-1 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrors({});
                    }}
                    className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-slate-600 active:scale-[0.98]"
                  >
                    <Icon name="arrow_back" className="text-base" />
                    رجوع
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-white transition-all duration-200 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading
                      ? <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      : <><Icon name="check_circle" className="text-base" />إنشاء الحساب</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-50/80 p-1.5">
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMode(tab.id)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition-all duration-200 ${mode === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon name={tab.icon} className="text-[16px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
