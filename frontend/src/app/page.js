'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LandingAuthCard from '@/components/landing/AuthCard';

const NAV_LINKS = [
  { label: 'المواد', href: '#subjects' },
  { label: 'ابدأ الآن', href: '#auth' },
  { label: 'الدعم', href: '#footer' },
];

const HERO_METRICS = [
  { value: '+120', label: 'درس وفيديو تعليمي' },
  { value: '+20', label: 'مادة دراسية' },
  { value: '24/7', label: 'وصول مستمر من أي مكان' },
];

const SUBJECT_GROUPS = [
  {
    title: 'عامة علمي علوم',
    desc: 'الفيزياء والكيمياء والأحياء والجيولوجيا وغيرها لطلاب الشعبة العلمية علوم.',
    tone: 'border-primary/20',
    chip: 'bg-primary/10 text-primary',
    cta: 'bg-primary text-white hover:bg-primary-dark',
    items: ['الفيزياء', 'الكيمياء', 'الأحياء', 'الجيولوجيا', 'الرياضيات'],
  },
  {
    title: 'عامة علمي رياضة',
    desc: 'الرياضيات البحتة والتطبيقية وباقي المواد لطلاب الشعبة العلمية رياضة.',
    tone: 'border-blue-500/20',
    chip: 'bg-blue-500/10 text-blue-600',
    cta: 'bg-blue-600 text-white hover:bg-blue-700',
    items: ['الفيزياء', 'الكيمياء', 'الرياضيات البحتة', 'الرياضيات التطبيقية'],
  },
  {
    title: 'عامة أدبي',
    desc: 'التاريخ والجغرافيا والفلسفة وعلم النفس لطلاب الشعبة الأدبية.',
    tone: 'border-purple-500/20',
    chip: 'bg-purple-500/10 text-purple-600',
    cta: 'bg-purple-600 text-white hover:bg-purple-700',
    items: ['التاريخ', 'الجغرافيا', 'الفلسفة والمنطق', 'علم النفس والاجتماع'],
  },
  {
    title: 'أزهرية علمي',
    desc: 'المواد العلمية والشرعية لطلاب الثانوية الأزهرية الشعبة العلمية.',
    tone: 'border-secondary/20',
    chip: 'bg-secondary/10 text-secondary',
    cta: 'bg-secondary text-white hover:bg-emerald-dark',
    items: ['الفيزياء', 'الكيمياء', 'الأحياء', 'الفقه', 'التفسير', 'الحديث'],
  },
  {
    title: 'أزهرية أدبي',
    desc: 'المواد الشرعية واللغوية والأدبية لطلاب الثانوية الأزهرية الشعبة الأدبية.',
    tone: 'border-teal-500/20',
    chip: 'bg-teal-500/10 text-teal-600',
    cta: 'bg-teal-600 text-white hover:bg-teal-700',
    items: ['الفقه', 'التفسير', 'الحديث', 'النحو والصرف', 'البلاغة', 'المنطق'],
  },
];

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function SectionContainer({ children, className = '' }) {
  return <div className={`landing-shell ${className}`}>{children}</div>;
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-3xl text-center landing-stack-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-primary shadow-sm shadow-slate-900/5" style={{ padding: '8px 16px' }}>
        <Icon name="north_east" className="text-sm" />
        {eyebrow}
      </span>
      <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl" style={{ textWrap: 'balance' }}>
        {title}
      </h2>
      <p className="text-base leading-8 text-slate-600 sm:text-lg">{description}</p>
    </div>
  );
}

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authMode = searchParams.get('auth') === 'login' ? 'login' : 'register';
  const inviteToken = searchParams.get('invite') || null;
  const authRole = inviteToken ? 'instructor' : (searchParams.get('role') === 'instructor' ? 'instructor' : 'student');

  useEffect(() => {
    if (!searchParams.get('auth')) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchParams]);

  const updateAuthState = (mode = 'register', role = 'student', shouldScroll = false) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('auth', mode);
    if (mode === 'register') {
      params.set('role', role);
    } else {
      params.delete('role');
    }
    // Preserve invite token across auth state changes
    if (inviteToken) {
      params.set('invite', inviteToken);
    }
    router.replace(`/?${params.toString()}`, { scroll: false });
    if (shouldScroll) {
      requestAnimationFrame(() => {
        document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  return (
    <div id="top" className="flex min-h-screen flex-col bg-background-light text-slate-900">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <SectionContainer>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5 py-4 lg:gap-8 lg:py-5">
            <a href="#top" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon name="school" className="text-[24px]" />
              </div>
              <div className="text-right">
                <p className="text-lg font-black tracking-tight text-slate-900">FittnaClass</p>
                <p className="text-xs font-medium text-slate-500">منصة تعليمية للثانوية العامة والأزهرية</p>
              </div>
            </a>

            <nav className="hidden items-center justify-center gap-8 lg:flex">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateAuthState('login', authRole, true)}
                className="hidden h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition-all hover:border-primary/20 hover:bg-white lg:inline-flex"
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => updateAuthState('register', 'student', true)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark"
              >
                أنشئ حسابك
              </button>
            </div>
          </div>
        </SectionContainer>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1">

        {/* Hero */}
        <section className="landing-section-hero relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(71,143,230,0.16),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.11),_transparent_34%)]" />
          <SectionContainer className="relative">
            <div className="landing-hero-grid">
              <div className="landing-stack-32 text-right">
                <div className="landing-stack-24">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-xs font-bold text-primary shadow-sm shadow-slate-900/5">
                    <Icon name="verified" className="text-sm" />
                    تعليم رقمي موثوق لطلاب مصر
                  </span>

                  <div className="landing-stack-16">
                    <h1 className="text-4xl font-black leading-[1.13] tracking-tight text-slate-950 sm:text-5xl xl:text-[4rem]" style={{ textWrap: 'balance' }}>
                      منصة متكاملة لطلاب الثانوية العامة والأزهرية مع{' '}
                      <span className="text-primary">FittnaClass</span>
                    </h1>
                    <p className="max-w-[40rem] text-base leading-8 text-slate-600 sm:text-lg">
                      دروس مباشرة ومسجلة، اختبارات تفاعلية، ومتابعة مستمرة تساعدك على تحسين مستواك والوصول لهدفك الدراسي.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-start">
                    <button
                      type="button"
                      onClick={() => updateAuthState('register', 'student', true)}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-7 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark"
                    >
                      ابدأ كطالب الآن
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAuthState('login', authRole, true)}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 text-base font-bold text-slate-800 transition-all hover:border-primary/20 hover:bg-slate-50"
                    >
                      تسجيل الدخول
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {HERO_METRICS.map((item) => (
                    <article key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                      <p className="text-3xl font-black text-slate-950">{item.value}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{item.label}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="landing-hero-aside w-full max-w-[540px] justify-self-center">
                <div id="auth">
                  <LandingAuthCard
                    mode={authMode}
                    role={authRole}
                    onModeChange={(nextMode, nextRole) => updateAuthState(nextMode, nextRole ?? authRole)}
                    onRoleChange={(nextRole) => updateAuthState('register', nextRole)}
                    inviteToken={inviteToken}
                  />
                </div>
              </div>
            </div>
          </SectionContainer>
        </section>

        {/* Subjects */}
        <section id="subjects" className="landing-section bg-background-light">
          <SectionContainer>
            <SectionHeading
              eyebrow="المواد الدراسية"
              title="مواد الثانوية العامة والأزهرية"
              description="ابدأ مذاكرة موادك بطريقة أوضح من خلال عرض منظم للمواد الأساسية في كل نظام دراسي."
            />
            <div className="grid max-w-5xl gap-6 md:grid-cols-2" style={{ margin: '48px auto 0' }}>
              {SUBJECT_GROUPS.map((group) => (
                <article
                  key={group.title}
                  className={`flex h-full flex-col rounded-[32px] border bg-white shadow-sm shadow-slate-900/5 ${group.tone}`}
                  style={{ padding: '32px' }}
                >
                  <h3 className="text-2xl font-black text-slate-900">{group.title}</h3>
                  <p className="mt-3 text-sm leading-8 text-slate-600">{group.desc}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {group.items.map((item) => (
                      <span key={item} className={`rounded-full text-sm font-bold ${group.chip}`} style={{ padding: '8px 16px' }}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateAuthState('register', 'student', true)}
                    className={`mt-8 inline-flex h-11 items-center justify-center rounded-2xl text-sm font-bold transition-all ${group.cta}`}
                    style={{ padding: '0 20px' }}
                  >
                    استعرض المواد
                  </button>
                </article>
              ))}
            </div>
          </SectionContainer>
        </section>

        {/* CTA Banner */}
        <section className="landing-section bg-white">
          <SectionContainer>
            <div
              className="landing-cta-shell overflow-hidden rounded-[36px] text-white shadow-[0_32px_80px_-42px_rgba(15,23,42,0.65)]"
              style={{ padding: '56px 48px' }}
            >
              <div className="mx-auto max-w-3xl text-center landing-stack-24">
                <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white/90">
                  <Icon name="bolt" className="text-sm" />
                  خطوتك القادمة نحو التفوق
                </span>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  اختر طريقك وابدأ الآن مع FittnaClass
                </h2>
                <p className="text-base leading-8 text-white/80 sm:text-lg">
                  اختر نوع حسابك وابدأ رحلتك التعليمية اليوم مع محتوى موثوق ودعم مستمر من فريق متخصص.
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => updateAuthState('register', 'student', true)}
                    className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-2xl bg-white px-6 text-sm font-bold text-primary transition-all hover:bg-slate-100"
                  >
                    ابدأ كطالب
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAuthState('register', 'instructor', true)}
                    className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-bold text-white transition-all hover:bg-white/15"
                  >
                    ابدأ كمدرس
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAuthState('login', authRole, true)}
                    className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-2xl border border-white/20 bg-transparent px-6 text-sm font-bold text-white transition-all hover:bg-white/10"
                  >
                    تسجيل الدخول
                  </button>
                </div>
              </div>
            </div>
          </SectionContainer>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer
        id="footer"
        className="mt-auto border-t border-white/10 bg-[#050b1f] text-white"
        itemScope
        itemType="https://schema.org/WPFooter"
      >
        <SectionContainer style={{ paddingTop: '72px', paddingBottom: '26px' }}>
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-14">
            <div className="text-right lg:pt-1" itemScope itemType="https://schema.org/Organization">
              <p className="text-[22px] font-black tracking-tight" itemProp="name">FittnaClass</p>
              <p className="mt-2 text-sm font-semibold text-white/60" itemProp="description">منصة تعليمية للطالب والمدرس</p>
              <p className="mt-5 max-w-sm text-sm leading-8 text-white/55 lg:mr-auto">
                تساعد الطلاب والمدرسين على التعلم والتعليم بكفاءة عبر تجربة رقمية سهلة ونتائج قابلة للقياس.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2.5" aria-label="مميزات المنصة">
                {[
                  { icon: 'auto_stories', label: 'دروس منظمة' },
                  { icon: 'quiz', label: 'اختبارات تفاعلية' },
                  { icon: 'trending_up', label: 'تقدم قابل للقياس' },
                ].map((feat) => (
                  <span
                    key={feat.label}
                    className="inline-flex items-center gap-2 rounded-full text-xs font-semibold text-white/70"
                    style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Icon name={feat.icon} className="text-[14px] text-primary" />
                    {feat.label}
                  </span>
                ))}
              </div>
            </div>

            <nav className="text-right lg:px-4" aria-label="روابط سريعة">
              <p className="text-lg font-bold text-white/90">روابط سريعة</p>
              <ul className="mt-5 space-y-2.5 text-sm text-white/75">
                {[
                  { href: '#top', icon: 'home', label: 'الرئيسية' },
                  { href: '#subjects', icon: 'menu_book', label: 'المواد الدراسية' },
                  { href: '#auth', icon: 'arrow_circle_left', label: 'ابدأ الآن' },
                ].map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                    >
                      <Icon name={link.icon} className="text-[16px] text-white/40" />
                      <span className="font-semibold">{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="text-right">
              <p className="text-lg font-bold text-white/90">انضم الآن</p>
              <p className="mt-4 max-w-xs text-sm leading-8 text-white/55">
                سجل واستمتع بخطة تعلم مخصصة تناسب مستواك من أول يوم.
              </p>
              <div className="mt-6 flex flex-col items-end gap-3">
                <button
                  type="button"
                  title="إنشاء حساب طالب مجاني في FittnaClass"
                  onClick={() => updateAuthState('register', 'student', true)}
                  className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
                  style={{ padding: '0 22px', background: 'linear-gradient(135deg, #5A73FF 0%, #4B63EE 100%)' }}
                >
                  <Icon name="person_add" className="text-[16px]" />
                  إنشاء حساب مجاني
                </button>
                <button
                  type="button"
                  title="تسجيل الدخول إلى حسابك في FittnaClass"
                  onClick={() => updateAuthState('login', authRole, true)}
                  className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.02] text-sm font-bold text-white/80 transition-all duration-200 hover:bg-white/[0.08] hover:text-white"
                  style={{ padding: '0 22px' }}
                >
                  <Icon name="login" className="text-[16px]" />
                  تسجيل الدخول
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-5">
            <div className="flex flex-col gap-3 text-xs text-white/38 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-right italic">تعلم أذكى اليوم - نتائج أقوى غداً</p>
              <p className="text-right">© 2026 FittnaClass <span className="px-1">·</span> جميع الحقوق محفوظة</p>
            </div>
          </div>
        </SectionContainer>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LandingContent />
    </Suspense>
  );
}
