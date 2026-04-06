'use client';

import { useAuth } from '@/context/AuthContext';
import StudentLayout from '@/app/student/layout';
import TeacherLayout from '@/app/Teacher/layout';
import ProfileView from '@/components/profile/ProfileView';

export default function ProfilePage() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-bg bg-background-light">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null; // The layout wrappers will redirect to login anyway if accessed directly when not configured
    }

    // Role-based Layout Wrapper
    if (user.role === 'student') {
        return (
            <StudentLayout>
                <ProfileView />
            </StudentLayout>
        );
    }

    if (user.role === 'instructor' || user.role === 'assistant') {
        return (
            <TeacherLayout>
                <ProfileView />
            </TeacherLayout>
        );
    }

    return null;
}
