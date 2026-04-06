const fs = require('fs');
const path = require('path');

const curriculumPagePath = path.join(__dirname, 'frontend/src/app/Teacher/curriculum/[id]/page.js');
let content = fs.readFileSync(curriculumPagePath, 'utf8');

// 1. Add imports to curriculum/[id]/page.js
if (!content.includes('lucide-react')) {
    content = content.replace(
        "import Modal from '@/components/ui/Modal';",
        "import Modal from '@/components/ui/Modal';\nimport { ArrowRight, StopCircle, Radio, BarChart, ShieldAlert, Edit2, ImagePlus, Plus, FolderOpen, Folder, Trash2, PlayCircle, PlusCircle, Video, GripVertical, Tv, Clock, Film, X, FileVideo, UploadCloud } from 'lucide-react';"
    );
}

// 2. Replace icons in curriculum/[id]/page.js
const replacements = [
    { from: /<span className="material-symbols-outlined text-sm">arrow_forward<\/span>/g, to: '<ArrowRight className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-\[18px\]">stop_circle<\/span>/g, to: '<StopCircle className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-\[18px\]">podcasts<\/span>/g, to: '<Radio className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-\[18px\]">leaderboard<\/span>/g, to: '<BarChart className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-white text-3xl">edit<\/span>/g, to: '<Edit2 className="w-8 h-8 text-white" />' },
    { from: /<span className="material-symbols-outlined text-slate-500">add_photo_alternate<\/span>/g, to: '<ImagePlus className="w-6 h-6 text-slate-500" />' },
    { from: /<span className="material-symbols-outlined text-lg">add<\/span>/g, to: '<Plus className="w-5 h-5" />' },
    { from: /<span className="material-symbols-outlined text-3xl mb-2 block">folder_open<\/span>/g, to: '<FolderOpen className="w-8 h-8 mb-2 block" />' },
    { from: /<span className="material-symbols-outlined text-slate-400 text-sm">folder<\/span>/g, to: '<Folder className="w-4 h-4 text-slate-400" />' },
    { from: /<span className="material-symbols-outlined text-sm">edit<\/span>/g, to: '<Edit2 className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-sm">delete<\/span>/g, to: '<Trash2 className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-primary">play_lesson<\/span>/g, to: '<PlayCircle className="w-6 h-6 text-primary" />' },
    { from: /<span className="material-symbols-outlined text-\[20px\]">add_circle<\/span>/g, to: '<PlusCircle className="w-5 h-5" />' },
    { from: /<span className="material-symbols-outlined text-3xl text-slate-400">video_library<\/span>/g, to: '<Video className="w-8 h-8 text-slate-400" />' },
    { from: /<span className="material-symbols-outlined text-slate-300 cursor-grab hover:text-primary transition-colors">drag_indicator<\/span>/g, to: '<GripVertical className="w-5 h-5 text-slate-300 cursor-grab hover:text-primary transition-colors" />' },
    { from: /<span className="material-symbols-outlined text-primary">\s*\{lesson\.type === 'live' \? 'live_tv' : 'play_circle'\}\s*<\/span>/g, to: "{lesson.type === 'live' ? <Tv className=\"w-6 h-6 text-primary\" /> : <PlayCircle className=\"w-6 h-6 text-primary\" />}" },
    { from: /<span className="material-symbols-outlined text-\[14px\]">videocam<\/span>/g, to: '<Video className="w-3.5 h-3.5" />' },
    { from: /<span className="material-symbols-outlined text-\[14px\]">schedule<\/span>/g, to: '<Clock className="w-3.5 h-3.5" />' },
    { from: /<span className="material-symbols-outlined text-\[14px\]">folder<\/span>/g, to: '<Folder className="w-3.5 h-3.5" />' },
    { from: /<span className="material-symbols-outlined text-\[18px\]">edit<\/span>/g, to: '<Edit2 className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-\[18px\]">delete<\/span>/g, to: '<Trash2 className="w-4 h-4" />' },
    { from: /<span className="material-symbols-outlined text-primary text-4xl">folder_open<\/span>/g, to: '<FolderOpen className="w-10 h-10 text-primary" />' },
    { from: /<span className="material-symbols-outlined text-primary">movie<\/span>/g, to: '<Film className="w-6 h-6 text-primary" />' },
    { from: /<span className="material-symbols-outlined text-lg">close<\/span>/g, to: '<X className="w-5 h-5" />' },
    { from: /<span className="material-symbols-outlined text-slate-500">video_file<\/span>/g, to: '<FileVideo className="w-6 h-6 text-slate-500" />' },
    { from: /<span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">upload_file<\/span>/g, to: '<UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-primary transition-colors" />' },
    { from: /🛡️ إدارة المشرفين/g, to: '<ShieldAlert className="w-4 h-4" /> إدارة المشرفين' }
];

replacements.forEach(({from, to}) => {
    content = content.replace(from, to);
});

fs.writeFileSync(curriculumPagePath, content, 'utf8');

// 3. Update Teacher layout.js
const layoutPath = path.join(__dirname, 'frontend/src/app/Teacher/layout.js');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

if (!layoutContent.includes('lucide-react')) {
    layoutContent = layoutContent.replace(
        "import NotificationDropdown from '@/components/ui/NotificationDropdown';",
        "import NotificationDropdown from '@/components/ui/NotificationDropdown';\nimport { LayoutDashboard, Radio, BookOpen, Users, CreditCard, GraduationCap } from 'lucide-react';"
    );
    
    // Replace NAV_ITEMS icon strings with Lucide components
    layoutContent = layoutContent.replace(/icon: 'space_dashboard',/g, 'icon: LayoutDashboard,');
    layoutContent = layoutContent.replace(/icon: 'stream',/g, 'icon: Radio,');
    layoutContent = layoutContent.replace(/icon: 'library_books',/g, 'icon: BookOpen,');
    layoutContent = layoutContent.replace(/icon: 'school',/g, 'icon: Users,');
    layoutContent = layoutContent.replace(/icon: 'payments',/g, 'icon: CreditCard,');
    
    // Replace render logic
    layoutContent = layoutContent.replace(
        /<span className={`material-symbols-outlined text-\[22px\] transition-colors \$\{isActive \? 'text-white' : 'text-slate-400'\}`}>[\s\S]*?\{item\.icon\}[\s\S]*?<\/span>/g,
        '<span className={`transition-colors ${isActive ? "text-white" : "text-slate-400"}`}><item.icon className="w-5 h-5" /></span>'
    );
    
    // Replace Top Logo school icon
    layoutContent = layoutContent.replace(
        /<span className="material-symbols-outlined text-white text-xl">school<\/span>/g,
        '<GraduationCap className="w-5 h-5 text-white" />'
    );
}

fs.writeFileSync(layoutPath, layoutContent, 'utf8');

console.log("Done");
