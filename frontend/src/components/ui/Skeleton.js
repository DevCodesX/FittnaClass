export function Skeleton({ className = '', variant = 'text' }) {
    const variants = {
        text: 'h-4 w-full',
        title: 'h-6 w-3/4',
        avatar: 'h-12 w-12 rounded-full',
        card: 'h-48 w-full rounded-xl',
        button: 'h-10 w-24 rounded-lg',
        thumbnail: 'h-32 w-full rounded-lg',
    };

    return <div className={`skeleton ${variants[variant]} ${className}`} />;
}

export function CourseCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200/80">
            <Skeleton variant="thumbnail" className="!rounded-none !h-40" />
            <div className="p-5 space-y-3">
                <Skeleton variant="button" className="!w-20 !h-6" />
                <Skeleton variant="title" />
                <Skeleton variant="text" className="!w-1/2" />
                <div className="flex justify-between pt-2">
                    <Skeleton variant="text" className="!w-24" />
                    <Skeleton variant="text" className="!w-16" />
                </div>
            </div>
        </div>
    );
}
