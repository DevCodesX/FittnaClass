'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { teacherAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { useConfirm } from '@/context/ConfirmContext';

// ─── Permission Definitions ────────────────────────────────────
const PERMISSION_GROUPS = [
    {
        label: 'المدفوعات',
        icon: '💳',
        permissions: [
            { key: 'view_payments', label: 'عرض المدفوعات' },
            { key: 'approve_payments', label: 'قبول المدفوعات' },
            { key: 'reject_payments', label: 'رفض المدفوعات' },
        ],
    },
    {
        label: 'المحتوى',
        icon: '📚',
        permissions: [
            { key: 'create_lessons', label: 'إنشاء دروس' },
            { key: 'edit_lessons', label: 'تعديل دروس' },
            { key: 'delete_lessons', label: 'حذف دروس' },
        ],
    },
    {
        label: 'الطلاب',
        icon: '👨‍🎓',
        permissions: [
            { key: 'view_students', label: 'عرض الطلاب' },
            { key: 'manage_students', label: 'إدارة الطلاب' },
        ],
    },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

const ACTION_LABELS = {
    add_admin: 'إضافة مشرف',
    remove_admin: 'إزالة مشرف',
    update_admin_permissions: 'تحديث صلاحيات مشرف',
    accept_invite: 'قبول دعوة',
    send_invite: 'إرسال دعوة',
    cancel_invite: 'إلغاء دعوة',
    create_section: 'إنشاء وحدة',
    update_section: 'تعديل وحدة',
    delete_section: 'حذف وحدة',
    create_lesson: 'إنشاء درس',
    update_lesson: 'تعديل درس',
    delete_lesson: 'حذف درس',
    upload_video: 'رفع فيديو',
    update_curriculum: 'تحديث المقرر',
    publish_curriculum: 'نشر المقرر',
    approve_payment: 'قبول دفعة',
    reject_payment: 'رفض دفعة',
};

export default function CurriculumAdminsPage() {
    const toast = useToast();
    const router = useRouter();
    const params = useParams();
    const curriculumId = params.id;
    const confirm = useConfirm();

    // ─── State ─────────────────────────────────
    const [admins, setAdmins] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [curriculum, setCurriculum] = useState(null);

    // Add admin modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addEmail, setAddEmail] = useState('');
    const [addPermissions, setAddPermissions] = useState([]);
    const [addLoading, setAddLoading] = useState(false);
    const [lastInviteLink, setLastInviteLink] = useState(null);

    // Edit permissions modal
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [editPermissions, setEditPermissions] = useState([]);
    const [editLoading, setEditLoading] = useState(false);

    // Activity log
    const [showLog, setShowLog] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logPagination, setLogPagination] = useState({ page: 1, totalPages: 1 });
    const [logLoading, setLogLoading] = useState(false);

    // ─── Data Fetching ─────────────────────────
    useEffect(() => {
        fetchData();
    }, [curriculumId]);

    async function fetchData() {
        try {
            const [adminsRes, currRes, invitesRes] = await Promise.all([
                teacherAPI.getAdmins(curriculumId),
                teacherAPI.getCurriculumDetails(curriculumId),
                teacherAPI.getInvites(curriculumId),
            ]);
            setAdmins(adminsRes.data.data || []);
            setCurriculum(currRes.data.data || null);
            setInvites(invitesRes.data.data || []);
        } catch (err) {
            toast.error('فشل تحميل البيانات.');
            router.push('/Teacher/upload-center');
        } finally {
            setLoading(false);
        }
    }

    async function fetchLogs(page = 1) {
        setLogLoading(true);
        try {
            const res = await teacherAPI.getAdminActivityLog(curriculumId, page);
            setLogs(res.data.data || []);
            setLogPagination(res.data.pagination || { page: 1, totalPages: 1 });
        } catch {
            toast.error('فشل تحميل سجل النشاط.');
        } finally {
            setLogLoading(false);
        }
    }

    // ─── Handlers ──────────────────────────────
    function togglePermission(list, setList, key) {
        setList((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
    }

    function toggleAllPermissions(list, setList) {
        if (list.length === ALL_PERMISSION_KEYS.length) {
            setList([]);
        } else {
            setList([...ALL_PERMISSION_KEYS]);
        }
    }

    async function handleAddAdmin() {
        if (!addEmail.trim()) {
            toast.error('البريد الإلكتروني مطلوب.');
            return;
        }
        if (addPermissions.length === 0) {
            toast.error('يجب تحديد صلاحية واحدة على الأقل.');
            return;
        }
        setAddLoading(true);
        setLastInviteLink(null);
        try {
            const res = await teacherAPI.addAdmin(curriculumId, {
                email: addEmail.trim(),
                permissions: addPermissions,
            });

            if (res.data.type === 'invite') {
                // Unregistered user — show invite link
                const link = `${window.location.origin}${res.data.inviteLink}`;
                setLastInviteLink(link);
                setInvites((prev) => [res.data.data, ...prev]);
                toast.success(res.data.message);
            } else {
                // Registered user — added directly
                setAdmins((prev) => [...prev, res.data.data]);
                setShowAddModal(false);
                setAddEmail('');
                setAddPermissions([]);
                toast.success(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إضافة المشرف.');
        } finally {
            setAddLoading(false);
        }
    }

    async function handleUpdatePermissions() {
        if (!editingAdmin) return;
        if (editPermissions.length === 0) {
            toast.error('يجب تحديد صلاحية واحدة على الأقل.');
            return;
        }
        setEditLoading(true);
        try {
            await teacherAPI.updateAdmin(curriculumId, editingAdmin.id, {
                permissions: editPermissions,
            });
            setAdmins((prev) =>
                prev.map((a) => a.id === editingAdmin.id ? { ...a, permissions: editPermissions } : a)
            );
            setEditingAdmin(null);
            toast.success('تم تحديث الصلاحيات بنجاح.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل تحديث الصلاحيات.');
        } finally {
            setEditLoading(false);
        }
    }

    async function handleRemoveAdmin(adminId) {
        const isConfirmed = await confirm({
            title: 'إزالة المشرف',
            message: 'هل أنت متأكد من إزالة هذا المشرف؟'
        });
        if (!isConfirmed) return;
        try {
            await teacherAPI.removeAdmin(curriculumId, adminId);
            setAdmins((prev) => prev.filter((a) => a.id !== adminId));
            toast.success('تمت إزالة المشرف بنجاح.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إزالة المشرف.');
        }
    }

    async function handleCancelInvite(inviteId) {
        const isConfirmed = await confirm({
            title: 'إلغاء الدعوة',
            message: 'هل أنت متأكد من إلغاء هذه الدعوة؟'
        });
        if (!isConfirmed) return;
        try {
            await teacherAPI.cancelInvite(curriculumId, inviteId);
            setInvites((prev) => prev.filter((i) => i.id !== inviteId));
            toast.success('تم إلغاء الدعوة بنجاح.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إلغاء الدعوة.');
        }
    }

    async function handleResendInvite(inviteId) {
        try {
            const res = await teacherAPI.resendInvite(curriculumId, inviteId);
            const link = `${window.location.origin}${res.data.inviteLink}`;
            await navigator.clipboard.writeText(link);
            toast.success('تم تجديد رابط الدعوة ونسخه!');
            // Update invite in the list
            setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, ...res.data.data } : i));
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل تجديد الدعوة.');
        }
    }

    function copyInviteLink(link) {
        navigator.clipboard.writeText(link);
        toast.success('تم نسخ رابط الدعوة!');
    }

    function openEditModal(admin) {
        setEditingAdmin(admin);
        setEditPermissions([...(admin.permissions || [])]);
    }

    function getStatusBadge(status) {
        const map = {
            active: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700' },
            pending: { label: 'في انتظار القبول', cls: 'bg-amber-100 text-amber-700' },
            removed: { label: 'تمت الإزالة', cls: 'bg-red-100 text-red-700' },
            accepted: { label: 'تم القبول', cls: 'bg-emerald-100 text-emerald-700' },
            expired: { label: 'منتهية الصلاحية', cls: 'bg-slate-100 text-slate-500' },
            cancelled: { label: 'ملغاة', cls: 'bg-red-100 text-red-500' },
        };
        const s = map[status] || map.pending;
        return <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${s.cls}`}>{s.label}</span>;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }

    // ─── Permission Checkbox Component ─────────
    function PermissionCheckboxes({ permissions, setPermissions }) {
        return (
            <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                        type="checkbox"
                        checked={permissions.length === ALL_PERMISSION_KEYS.length}
                        onChange={() => toggleAllPermissions(permissions, setPermissions)}
                        className="w-4 h-4 accent-[#6C63FF] rounded"
                    />
                    <span className="text-sm font-bold text-slate-800">تحديد الكل</span>
                </label>
                {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-base">{group.icon}</span>
                            <span className="text-sm font-bold text-slate-700">{group.label}</span>
                        </div>
                        <div className="p-3 space-y-2">
                            {group.permissions.map((perm) => (
                                <label
                                    key={perm.key}
                                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={permissions.includes(perm.key)}
                                        onChange={() => togglePermission(permissions, setPermissions, perm.key)}
                                        className="w-4 h-4 accent-[#6C63FF] rounded"
                                    />
                                    <span className="text-sm text-slate-700">{perm.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ─── Loading state ─────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const pendingInvites = invites.filter((i) => i.status === 'pending');
    const acceptedInvites = invites.filter((i) => i.status === 'accepted');

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 animate-fade-in">
                <div>
                    <button
                        onClick={() => router.push(`/Teacher/curriculum/${curriculumId}`)}
                        className="text-sm text-slate-400 hover:text-primary mb-2 flex items-center gap-1 transition-colors"
                    >
                        ← العودة لإدارة المقرر
                    </button>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="text-2xl">🛡️</span>
                        إدارة المشرفين
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {curriculum?.title} — <span className="font-mono text-primary font-bold">{curriculum?.course_code}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowLog(true); fetchLogs(1); }}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        📋 سجل النشاط
                    </button>
                    <button
                        onClick={() => { setShowAddModal(true); setLastInviteLink(null); }}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        + إضافة مشرف
                    </button>
                </div>
            </div>

            {/* ═══ Active Admins ═══ */}
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span>👥</span> المشرفون النشطون
                <span className="text-xs font-normal text-slate-400">({admins.length})</span>
            </h2>
            {admins.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] text-center animate-fade-in mb-8">
                    <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🛡️</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">لا يوجد مشرفون بعد</h3>
                    <p className="text-slate-500 mb-6">أضف مشرفين لمساعدتك في إدارة هذا المقرر.</p>
                    <button
                        onClick={() => { setShowAddModal(true); setLastInviteLink(null); }}
                        className="px-8 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                        إضافة مشرف جديد
                    </button>
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in mb-8">
                    {admins.map((admin) => (
                        <div
                            key={admin.id}
                            className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:border-primary/20 transition-all group"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-lg">
                                            {admin.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-slate-900">{admin.user?.name || 'غير معروف'}</h4>
                                            {getStatusBadge(admin.status)}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{admin.user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(admin)}
                                        className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
                                    >
                                        تعديل الصلاحيات
                                    </button>
                                    <button
                                        onClick={() => handleRemoveAdmin(admin.id)}
                                        className="px-3 py-1.5 text-xs font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        إزالة
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                                {(admin.permissions || []).map((perm) => {
                                    const permDef = PERMISSION_GROUPS.flatMap((g) => g.permissions).find((p) => p.key === perm);
                                    return (
                                        <span key={perm} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                                            {permDef?.label || perm}
                                        </span>
                                    );
                                })}
                                {(!admin.permissions || admin.permissions.length === 0) && (
                                    <span className="text-xs text-slate-400">لا توجد صلاحيات</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ Pending Invites ═══ */}
            {pendingInvites.length > 0 && (
                <>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span>📨</span> الدعوات المعلقة
                        <span className="text-xs font-normal text-slate-400">({pendingInvites.length})</span>
                    </h2>
                    <div className="space-y-3 mb-8 animate-fade-in">
                        {pendingInvites.map((invite) => (
                            <div
                                key={invite.id}
                                className="bg-white rounded-2xl p-4 border border-amber-200/50 shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:border-amber-300/60 transition-all"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                            <span className="text-amber-600 font-bold text-sm">📨</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 font-mono" dir="ltr">{invite.email}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {getStatusBadge(invite.status)}
                                                <span className="text-[10px] text-slate-400">
                                                    تنتهي: {formatDate(invite.expires_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}/invite/${invite.token}`;
                                                copyInviteLink(link);
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
                                        >
                                            📋 نسخ الرابط
                                        </button>
                                        <button
                                            onClick={() => handleResendInvite(invite.id)}
                                            className="px-3 py-1.5 text-xs font-bold text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                                        >
                                            🔄 تجديد
                                        </button>
                                        <button
                                            onClick={() => handleCancelInvite(invite.id)}
                                            className="px-3 py-1.5 text-xs font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                                    {(invite.permissions || []).map((perm) => {
                                        const permDef = PERMISSION_GROUPS.flatMap((g) => g.permissions).find((p) => p.key === perm);
                                        return (
                                            <span key={perm} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700">
                                                {permDef?.label || perm}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ═══ Add Admin Modal ═══ */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setAddEmail(''); setAddPermissions([]); setLastInviteLink(null); }}
                title="إضافة مشرف جديد"
                size="md"
            >
                <div className="p-6 space-y-5">
                    {/* Show invite link if just created */}
                    {lastInviteLink && (
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                            <p className="text-sm font-bold text-emerald-800 mb-2">✅ تم إنشاء رابط الدعوة!</p>
                            <p className="text-xs text-emerald-600 mb-3">المستخدم غير مسجل. شارك هذا الرابط معه:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={lastInviteLink}
                                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-emerald-200 bg-white font-mono"
                                    dir="ltr"
                                />
                                <button
                                    onClick={() => copyInviteLink(lastInviteLink)}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    نسخ
                                </button>
                            </div>
                            <button
                                onClick={() => { setLastInviteLink(null); setAddEmail(''); setAddPermissions([]); }}
                                className="w-full mt-3 py-2 text-xs font-bold text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                                إضافة مشرف آخر
                            </button>
                        </div>
                    )}

                    {!lastInviteLink && (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    value={addEmail}
                                    onChange={(e) => setAddEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    dir="ltr"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    إذا لم يكن المستخدم مسجلاً، سيتم إنشاء رابط دعوة لمشاركته
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">الصلاحيات</label>
                                <PermissionCheckboxes permissions={addPermissions} setPermissions={setAddPermissions} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleAddAdmin}
                                    disabled={addLoading}
                                    className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {addLoading ? 'جارٍ الإضافة...' : 'إضافة المشرف'}
                                </button>
                                <button
                                    onClick={() => { setShowAddModal(false); setAddEmail(''); setAddPermissions([]); }}
                                    className="flex-1 py-3 text-sm font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* ═══ Edit Permissions Modal ═══ */}
            <Modal
                isOpen={!!editingAdmin}
                onClose={() => setEditingAdmin(null)}
                title={`تعديل صلاحيات: ${editingAdmin?.user?.name || ''}`}
                size="md"
            >
                <div className="p-6 space-y-5">
                    <PermissionCheckboxes permissions={editPermissions} setPermissions={setEditPermissions} />
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleUpdatePermissions}
                            disabled={editLoading}
                            className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {editLoading ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                        </button>
                        <button
                            onClick={() => setEditingAdmin(null)}
                            className="flex-1 py-3 text-sm font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ═══ Activity Log Modal ═══ */}
            <Modal
                isOpen={showLog}
                onClose={() => setShowLog(false)}
                title="سجل نشاط المشرفين"
                size="lg"
            >
                <div className="p-6">
                    {logLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <span className="text-3xl block mb-2">📋</span>
                            <p className="text-sm">لا توجد إدخالات في السجل بعد.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-primary">
                                                {log.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-slate-800">{log.user?.name || 'غير معروف'}</span>
                                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </span>
                                            </div>
                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <p className="text-xs text-slate-500 mt-1 break-all">
                                                    {Object.entries(log.details)
                                                        .filter(([, v]) => v && typeof v !== 'object')
                                                        .map(([k, v]) => `${k}: ${v}`)
                                                        .join(' • ')}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-slate-400 mt-1">{formatDate(log.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {logPagination.totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => fetchLogs(logPagination.page - 1)}
                                        disabled={logPagination.page <= 1}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
                                    >
                                        السابق
                                    </button>
                                    <span className="text-xs text-slate-500">
                                        {logPagination.page} / {logPagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchLogs(logPagination.page + 1)}
                                        disabled={logPagination.page >= logPagination.totalPages}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
                                    >
                                        التالي
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
