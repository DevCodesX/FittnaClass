'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);
const AUTH_CHANGE_EVENT = 'fittnaclass-auth-change';
const EMPTY_SESSION = { user: null, token: null };

let cachedSnapshot = EMPTY_SESSION;
let cachedToken = null;
let cachedRawUser = null;

function readSession() {
    if (typeof window === 'undefined') {
        return EMPTY_SESSION;
    }

    const token = localStorage.getItem('fittnaclass_token');
    const rawUser = localStorage.getItem('fittnaclass_user');

    if (!token || !rawUser) {
        if (cachedSnapshot !== EMPTY_SESSION) {
            cachedSnapshot = EMPTY_SESSION;
            cachedToken = null;
            cachedRawUser = null;
        }
        return EMPTY_SESSION;
    }

    // Only create a new object if the underlying data actually changed
    if (token === cachedToken && rawUser === cachedRawUser) {
        return cachedSnapshot;
    }

    try {
        cachedToken = token;
        cachedRawUser = rawUser;
        cachedSnapshot = { token, user: JSON.parse(rawUser) };
        return cachedSnapshot;
    } catch {
        cachedToken = null;
        cachedRawUser = null;
        cachedSnapshot = EMPTY_SESSION;
        return EMPTY_SESSION;
    }
}

function subscribeToSession(callback) {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const handleChange = () => callback();
    window.addEventListener('storage', handleChange);
    window.addEventListener(AUTH_CHANGE_EVENT, handleChange);

    return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
    };
}

function broadcastAuthChange() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }
}

export function AuthProvider({ children }) {
    const router = useRouter();
    const session = useSyncExternalStore(subscribeToSession, readSession, () => EMPTY_SESSION);

    const login = useCallback((userData, authToken) => {
        localStorage.setItem('fittnaclass_token', authToken);
        localStorage.setItem('fittnaclass_user', JSON.stringify(userData));
        broadcastAuthChange();

        if (userData.role === 'instructor') {
            router.push('/instructor/dashboard');
        } else {
            router.push('/student/explore');
        }
    }, [router]);

    const logout = useCallback(() => {
        localStorage.removeItem('fittnaclass_token');
        localStorage.removeItem('fittnaclass_user');
        broadcastAuthChange();
        router.push('/?auth=login');
    }, [router]);

    const value = useMemo(() => ({
        user: session.user,
        token: session.token,
        isLoading: false,
        login,
        logout,
    }), [session.user, session.token, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
