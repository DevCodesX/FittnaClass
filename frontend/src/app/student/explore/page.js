import { Suspense } from 'react';
import ExploreContent from '@/components/student/explore/ExploreContent';

export const metadata = {
    title: 'استكشف المقررات | فيتنا كلاس',
    description: 'اكتشف محتوى تعليميًا مصممًا خصيصًا لطلاب الثانوية العامة والأزهر في مصر. تصفح المقررات، وابدأ رحلة التفوق مع نخبة من أفضل المعلمين.',
    keywords: 'مقررات, ثانوية عامة, أزهر, تعليم, كورسات, شرح, فيتنا كلاس, دروس',
    openGraph: {
        title: 'استكشف المقررات | فيتنا كلاس',
        description: 'اكتشف محتوى تعليميًا مصممًا خصيصًا لطلاب الثانوية العامة والأزهر في مصر.',
        siteName: 'فيتنا كلاس',
        locale: 'ar_EG',
        type: 'website',
    },
};

function ExploreFallback() {
    return (
        <section dir="rtl" className="min-h-[calc(100vh-140px)] bg-slate-50/50 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0f2b5b]"></div>
                <p className="text-sm font-medium text-slate-500 animate-pulse">جاري تحميل المقررات...</p>
            </div>
        </section>
    );
}

export default function ExplorePage() {
    return (
        <Suspense fallback={<ExploreFallback />}>
            <ExploreContent />
        </Suspense>
    );
}
