export default function ExploreHeader() {
    return (
        <header className="flex flex-col items-center text-center mb-8 sm:mb-10 w-full px-4">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                استكشف <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-[#0f2b5b]">المقررات</span>
            </h2>
            <p className="mx-auto mt-4 sm:mt-6 w-full max-w-[650px] text-[15px] sm:text-base leading-relaxed sm:leading-[1.75] text-slate-600">
                اكتشف محتوى تعليميًا مصممًا خصيصًا لجميع الطلاب في مصر، في مختلف المراحل التعليمية. تصفح المقررات وابدأ رحلتك نحو التفوق.
            </p>
        </header>
    );
}
