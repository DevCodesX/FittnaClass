/**
 * Educational classification system for FittnaClass.
 * Tracks (الشُعب) → Subjects (المواد) mapping for Egyptian secondary schools.
 */

export const TRACKS = [
    {
        id: 'ثانوية_عامة_علمي_علوم',
        label: 'الثانوية العامة - علمي علوم',
        shortLabel: 'عامة علمي علوم',
        icon: 'biotech',
        subjects: [
            'الفيزياء',
            'الكيمياء',
            'الأحياء',
            'الجيولوجيا وعلوم البيئة',
            'الرياضيات',
            'اللغة العربية',
            'اللغة الإنجليزية',
            'اللغة الفرنسية',
        ],
    },
    {
        id: 'ثانوية_عامة_علمي_رياضة',
        label: 'الثانوية العامة - علمي رياضة',
        shortLabel: 'عامة علمي رياضة',
        icon: 'calculate',
        subjects: [
            'الفيزياء',
            'الكيمياء',
            'الرياضيات البحتة',
            'الرياضيات التطبيقية',
            'اللغة العربية',
            'اللغة الإنجليزية',
            'اللغة الفرنسية',
        ],
    },
    {
        id: 'ثانوية_عامة_أدبي',
        label: 'الثانوية العامة - أدبي',
        shortLabel: 'عامة أدبي',
        icon: 'history_edu',
        subjects: [
            'اللغة العربية',
            'اللغة الإنجليزية',
            'اللغة الفرنسية',
            'التاريخ',
            'الجغرافيا',
            'الفلسفة والمنطق',
            'علم النفس والاجتماع',
        ],
    },
    {
        id: 'ثانوية_أزهرية_علمي',
        label: 'الثانوية الأزهرية - علمي',
        shortLabel: 'أزهرية علمي',
        icon: 'mosque',
        subjects: [
            'الفيزياء',
            'الكيمياء',
            'الأحياء',
            'الرياضيات',
            'الفقه',
            'التفسير',
            'الحديث',
            'التوحيد',
            'النحو والصرف',
        ],
    },
    {
        id: 'ثانوية_أزهرية_أدبي',
        label: 'الثانوية الأزهرية - أدبي',
        shortLabel: 'أزهرية أدبي',
        icon: 'menu_book',
        subjects: [
            'اللغة العربية',
            'النحو والصرف',
            'البلاغة',
            'الأدب والنصوص',
            'الفقه',
            'التفسير',
            'الحديث',
            'التوحيد',
            'المنطق',
            'التاريخ الإسلامي',
        ],
    },
];

/** Get a track object by its ID. */
export function getTrackById(trackId) {
    return TRACKS.find((t) => t.id === trackId) || null;
}

/** Get the list of subjects for a given track ID. */
export function getSubjectsForTrack(trackId) {
    return getTrackById(trackId)?.subjects || [];
}

/** Get the human-readable label for a track ID. */
export function getTrackLabel(trackId) {
    return getTrackById(trackId)?.label || trackId || '';
}

/** Get a flat, deduplicated list of all subjects across every track. */
export function getAllSubjects() {
    const set = new Set();
    for (const track of TRACKS) {
        for (const subject of track.subjects) {
            set.add(subject);
        }
    }
    return [...set];
}

/** Check whether a track ID belongs to the Azhari system. */
export function isAzhari(trackId) {
    return trackId?.startsWith('ثانوية_أزهرية') || false;
}
