'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { authAPI, inviteAPI } from '@/lib/api';
import {
  loginSchema,
  registerStep1Schema,
  registerStudentStep2Schema,
  registerTeacherStep2Schema,
  validateForm,
} from '@/lib/validators';
import ForgotPasswordModal from '../profile/ForgotPasswordModal';
import { validateNationalIdRealtime } from '@/lib/nationalId';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';

const GRADE_LEVELS = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Prep 1', 'Prep 2', 'Prep 3', 'Secondary 1', 'Secondary 2', 'Secondary 3', 'University',
];

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

const GAP = '20px';

// Helper for real-time validation of single fields
const validateFieldRealtime = (schema, field, value) => {
  if (!schema || !schema.shape[field]) return '';
  const result = schema.shape[field].safeParse(value);
  return result.success ? '' : result.error.errors[0].message;
};

export default function LandingAuthCard({ mode, role, onModeChange, onRoleChange, inviteToken }) {
  const { login: authLogin } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [inviteData, setInviteData] = useState(null);
  const [nationalIdValidation, setNationalIdValidation] = useState(null);
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
    referred_by_code: '',
  });

  const isInviteMode = !!inviteToken;

  // Load invite data and pre-fill email
  useEffect(() => {
    if (inviteToken) {
      inviteAPI.verify(inviteToken)
        .then((res) => {
          setInviteData(res.data.data);
          // Pre-fill the email from invite
          setRegisterForm((f) => ({ ...f, email: res.data.data.email || '', role: 'instructor' }));
          setLoginForm((f) => ({ ...f, email: res.data.data.email || '' }));
        })
        .catch(() => {
          // Invite may be expired/used, still allow registration
          setInviteData(null);
        });
    }
  }, [inviteToken]);

  useEffect(() => {
    if (!isInviteMode) {
      setRegisterForm((current) => ({ ...current, role }));
    }
  }, [role, isInviteMode]);

  useEffect(() => {
    setErrors({});
    setStep(1);
  }, [mode]);

  const handleLoginChange = ({ target }) => {
    const { name, value } = target;
    setLoginForm((current) => ({ ...current, [name]: value }));
    const errorMsg = validateFieldRealtime(loginSchema, name, value);
    setErrors((current) => ({ ...current, [name]: errorMsg }));
  };

  const handleRegisterChange = ({ target }) => {
    const { name, value } = target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
    
    // Choose schema based on step and role
    let schema = registerStep1Schema;
    if (step === 2) {
      schema = role === 'student' ? registerStudentStep2Schema : registerTeacherStep2Schema;
    }
    const errorMsg = validateFieldRealtime(schema, name, value);
    setErrors((current) => ({ ...current, [name]: errorMsg }));
    
    if (name === 'national_id') {
      if (value === '') {
        setNationalIdValidation(null);
      } else {
        setNationalIdValidation(validateNationalIdRealtime(value));
      }
    }
  };

  // ─── Post-auth: accept invite ─────────────────
  async function handlePostAuthInvite(user, token) {
    if (!inviteToken) return;

    // Store token for auth context to use
    localStorage.setItem('fittnaclass_pending_invite', inviteToken);

    try {
      await inviteAPI.accept(inviteToken);
      localStorage.removeItem('fittnaclass_pending_invite');
      toast.success('تم قبول الدعوة! أنت الآن مشرف على المقرر.');
    } catch (err) {
      // If it fails (email mismatch, etc.), the invite page can handle it later
      console.error('[Invite accept after auth]', err.response?.data?.message);
    }
  }

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

      // Accept invite before redirecting
      if (isInviteMode) {
        // Set the token first so the accept call has auth
        localStorage.setItem('fittnaclass_token', response.data.data.token);
        localStorage.setItem('fittnaclass_user', JSON.stringify(response.data.data.user));
        await handlePostAuthInvite(response.data.data.user, response.data.data.token);
      }

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

  // ─── Invite-mode: submit directly (no step 2) ─
  const submitInviteRegister = async (event) => {
    event.preventDefault();

    const payload = {
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      role: 'instructor',
    };
    const validation = validateForm(registerStep1Schema, payload);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await authAPI.register({
        ...payload,
        specialization: 'مشرف',
        subject: 'إدارة',
      });
      toast.success('تم إنشاء الحساب بنجاح.');

      // Accept invite before redirecting
      localStorage.setItem('fittnaclass_token', response.data.data.token);
      localStorage.setItem('fittnaclass_user', JSON.stringify(response.data.data.user));
      await handlePostAuthInvite(response.data.data.user, response.data.data.token);

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

    if (role === 'student' && nationalIdValidation?.status === 'invalid') {
        toast.error('يرجى التأكد من أن الرقم القومي صحيح للتسجيل.');
        return;
    }

    const schema = role === 'student' ? registerStudentStep2Schema : registerTeacherStep2Schema;
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

  // ─── Invite Banner ──────────────────────────
  const InviteBanner = () => (
    <div className="mb-5 rounded-xl bg-gradient-to-r from-[#6C63FF]/10 to-[#6C63FF]/5 border border-[#6C63FF]/20 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-[#6C63FF]/15 flex items-center justify-center">
          <span className="text-lg">🛡️</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">دعوة للإشراف</p>
          <p className="text-[11px] text-slate-500">
            {inviteData?.curriculum?.title && (
              <>على مقرر <strong>{inviteData.curriculum.title}</strong></>
            )}
            {inviteData?.inviter?.name && (
              <> — من {inviteData.inviter.name}</>
            )}
          </p>
        </div>
      </div>
      {inviteData?.email && (
        <p className="text-[11px] text-[#6C63FF] font-mono" dir="ltr">
          {inviteData.email}
        </p>
      )}
    </div>
  );

  return (
    <article className="form-card w-full rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
      <div style={{ padding: '24px 28px 28px' }}>
        {/* Invite banner */}
        {isInviteMode && inviteData && <InviteBanner />}

        <header className="mb-6 text-right">
          <h3 className="text-xl font-extrabold leading-snug tracking-tight text-slate-900">
            {isInviteMode
              ? (mode === 'login' ? 'تسجيل الدخول كمشرف' : 'إنشاء حساب مشرف')
              : (mode === 'register' ? 'ابدأ خلال دقائق' : 'مرحبًا بعودتك')}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
            {isInviteMode
              ? (mode === 'login'
                ? 'سجّل الدخول لقبول الدعوة والانضمام كمشرف على المقرر.'
                : 'أنشئ حسابك بسرعة لقبول الدعوة والبدء بالإشراف.')
              : (mode === 'register'
                ? 'أنشئ حسابك للوصول إلى الدروس والاختبارات وخطة مذاكرة مناسبة لمستواك.'
                : 'سجّل الدخول لمتابعة تقدمك واستكمال دروسك من حيث توقفت.')}
          </p>
        </header>

        {mode === 'login' ? (
          <form
            onSubmit={submitLogin}
            className="text-right"
            style={{ display: 'flex', flexDirection: 'column', gap: GAP }}
          >
            <FloatingLabelInput
              id="l-email"
              name="email"
              type="email"
              label="البريد الإلكتروني"
              value={loginForm.email}
              onChange={handleLoginChange}
              autoComplete="email"
              dir="ltr"
              error={errors.email}
              startIcon="mail"
            />

            <div>
              <FloatingLabelInput
                id="l-pass"
                name="password"
                type="password"
                label="كلمة المرور"
                value={loginForm.password}
                onChange={handleLoginChange}
                autoComplete="current-password"
                dir="ltr"
                error={errors.password}
                startIcon="lock"
              />
              <div className="flex justify-end mt-2">
                  <button 
                      type="button" 
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-[12px] font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                      نسيت كلمة السر؟
                  </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-bold text-white transition-all duration-300 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading
                ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <><Icon name="arrow_forward" className="text-lg" />{isInviteMode ? 'دخول وقبول الدعوة' : 'دخول إلى حسابك'}</>}
            </button>
          </form>
        ) : isInviteMode ? (
          /* ═══ Invite Registration (simplified — no role, no step 2) ═══ */
          <form
            onSubmit={submitInviteRegister}
            className="text-right"
            style={{ display: 'flex', flexDirection: 'column', gap: GAP }}
          >
            <FloatingLabelInput
              id="r-name"
              name="name"
              type="text"
              label="الاسم الكامل"
              value={registerForm.name}
              onChange={handleRegisterChange}
              autoComplete="name"
              error={errors.name}
              startIcon="person"
            />

            <div>
              <FloatingLabelInput
                id="r-email"
                name="email"
                type="email"
                label="البريد الإلكتروني"
                value={registerForm.email}
                onChange={handleRegisterChange}
                autoComplete="email"
                dir="ltr"
                error={errors.email}
                startIcon="mail"
                readOnly={!!inviteData?.email}
              />
              {inviteData?.email && (
                <p className="mt-1 text-[11px] text-[#6C63FF]">هذا البريد مرتبط بالدعوة ولا يمكن تغييره.</p>
              )}
            </div>

            <div>
              <FloatingLabelInput
                id="r-pass"
                name="password"
                type="password"
                label="كلمة المرور"
                value={registerForm.password}
                onChange={handleRegisterChange}
                autoComplete="new-password"
                dir="ltr"
                error={errors.password}
                startIcon="lock"
              />
              <p className="mt-1 text-[11px] text-slate-400">الحد الأدنى 6 أحرف.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#5A54E6] text-[14px] font-bold text-white transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:shadow-[#6C63FF]/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading
                ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <><Icon name="shield_person" className="text-lg" />إنشاء حساب وقبول الدعوة</>}
            </button>
          </form>
        ) : (
          /* ═══ Normal Registration (with role + step 2) ═══ */
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
                        ? 'bg-white text-primary ring-1 ring-[#E5E7EB] shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                      }`}
                    >
                      <Icon name="school" className="text-[16px]" />
                      طالب
                    </button>
                    <button
                      type="button"
                      onClick={() => onRoleChange('instructor')}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition-all duration-200 ${role === 'instructor'
                        ? 'bg-white text-secondary ring-1 ring-[#E5E7EB] shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                      }`}
                    >
                      <Icon name="co_present" className="text-[16px]" />
                      مدرس
                    </button>
                  </div>
                  {errors.role && <p className="mt-1 px-1 text-[11px] font-medium text-rose">{errors.role}</p>}
                </div>

                <FloatingLabelInput
                  id="r-name"
                  name="name"
                  type="text"
                  label="الاسم الكامل"
                  value={registerForm.name}
                  onChange={handleRegisterChange}
                  autoComplete="name"
                  error={errors.name}
                  startIcon="person"
                />

                <FloatingLabelInput
                  id="r-email"
                  name="email"
                  type="email"
                  label="البريد الإلكتروني"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  autoComplete="email"
                  dir="ltr"
                  error={errors.email}
                  startIcon="mail"
                />

                <div>
                  <FloatingLabelInput
                    id="r-pass"
                    name="password"
                    type="password"
                    label="كلمة المرور"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    autoComplete="new-password"
                    dir="ltr"
                    error={errors.password}
                    startIcon="lock"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">الحد الأدنى 6 أحرف.</p>
                </div>

                <FloatingLabelInput
                  id="r-referral"
                  name="referred_by_code"
                  type="text"
                  label="كود الإحالة (اختياري)"
                  value={registerForm.referred_by_code}
                  onChange={handleRegisterChange}
                  dir="ltr"
                  startIcon="group_add"
                />

                <button
                  type="button"
                  onClick={goToStepTwo}
                  className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-[14px] font-bold text-white transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                >
                  التالي
                  <Icon name="arrow_forward" className="text-lg" />
                </button>
              </div>
            ) : (
              <form onSubmit={submitRegister} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {role === 'student' ? (
                  <>
                    <div>
                      <FloatingLabelInput
                        id="r-nid"
                        name="national_id"
                        type="text"
                        label="الرقم القومي"
                        value={registerForm.national_id}
                        onChange={handleRegisterChange}
                        dir="ltr"
                        maxLength={14}
                        error={!nationalIdValidation ? errors.national_id : ''}
                        success={nationalIdValidation?.status === 'valid'}
                        startIcon="badge"
                      />
                      {/* Note: In floating label we show error, but we override here for warnings if we want */}
                      {nationalIdValidation && (
                          <div className={`mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium ${
                              nationalIdValidation.status === 'valid' ? 'text-emerald-500' : 
                              nationalIdValidation.status === 'warning' ? 'text-amber-500' : 'text-rose'
                          }`}>
                              <Icon name={
                                  nationalIdValidation.status === 'valid' ? 'check_circle' : 
                                  nationalIdValidation.status === 'warning' ? 'warning' : 'error'
                              } className="text-[14px]" />
                              <span>{nationalIdValidation.message}</span>
                              {(nationalIdValidation.data?.age !== undefined) && (
                                  <span className="text-slate-400 mr-2 text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                      العمر المتوقع: {nationalIdValidation.data.age}
                                  </span>
                              )}
                          </div>
                      )}
                    </div>
                    <div>
                      {/* Used standard select styling adapted for unified UI */}
                      <label htmlFor="r-grade" className="mb-1.5 block text-xs text-slate-400 font-medium">المرحلة الدراسية</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">school</span>
                        <select
                          id="r-grade"
                          name="grade_level"
                          value={registerForm.grade_level}
                          onChange={handleRegisterChange}
                          dir="ltr"
                          className="w-full h-14 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 pl-10 py-3 text-[13px] text-slate-800 outline-none transition-all duration-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 hover:border-slate-300 appearance-none disabled:opacity-50"
                        >
                          <option value="">Select grade level</option>
                          {GRADE_LEVELS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                        </select>
                      </div>
                      {errors.grade_level && <p className="mt-1 text-[11.5px] font-medium text-rose">{errors.grade_level}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <FloatingLabelInput
                      id="r-spec"
                      name="specialization"
                      type="text"
                      label="التخصص"
                      value={registerForm.specialization}
                      onChange={handleRegisterChange}
                      error={errors.specialization}
                      startIcon="category"
                    />

                    <FloatingLabelInput
                      id="r-subj"
                      name="subject"
                      type="text"
                      label="المادة الأساسية"
                      value={registerForm.subject}
                      onChange={handleRegisterChange}
                      error={errors.subject}
                      startIcon="menu_book"
                    />

                    <div>
                      <label htmlFor="r-bio" className="mb-1.5 block text-xs text-slate-400 font-medium">نبذة قصيرة</label>
                      <textarea
                        id="r-bio"
                        name="bio"
                        value={registerForm.bio}
                        onChange={handleRegisterChange}
                        className="w-full min-h-[100px] rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-right text-[13px] leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 hover:border-slate-300 disabled:opacity-50"
                        placeholder="أخبر الطلاب عن خبرتك أو أسلوب الشرح..."
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
                    className="flex h-14 flex-1 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold text-slate-400 transition-all duration-300 hover:bg-slate-50 hover:text-slate-600 active:scale-[0.98] border border-transparent hover:border-slate-200"
                  >
                    <Icon name="arrow_back" className="text-lg" />
                    رجوع
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-bold text-white transition-all duration-300 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading
                      ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      : <><Icon name="check_circle" className="text-lg" />إنشاء الحساب</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-1.5 shadow-inner">
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMode(tab.id)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition-all duration-300 ${mode === tab.id
                  ? 'bg-white text-primary ring-1 ring-[#E5E7EB] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                <Icon name={tab.icon} className="text-[18px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <ForgotPasswordModal 
          isOpen={isForgotModalOpen} 
          onClose={() => setIsForgotModalOpen(false)} 
          initialEmail={loginForm.email}
      />
    </article>
  );
}
