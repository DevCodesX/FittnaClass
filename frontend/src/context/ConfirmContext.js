'use client';

import { createContext, useState, useContext, useCallback } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        resolver: null,
    });

    const confirm = useCallback(({ title, message }) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                resolver: resolve,
            });
        });
    }, []);

    const handleConfirm = () => {
        if (confirmState.resolver) confirmState.resolver(true);
        setConfirmState({ isOpen: false, title: '', message: '', resolver: null });
    };

    const handleCancel = () => {
        if (confirmState.resolver) confirmState.resolver(false);
        setConfirmState({ isOpen: false, title: '', message: '', resolver: null });
    };

    return (
        <ConfirmContext.Provider value={{ confirm, confirmState, handleConfirm, handleCancel }}>
            {children}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context.confirm;
}

// Export internal state/handlers for the modal itself
export function useConfirmModal() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirmModal must be used within a ConfirmProvider');
    }
    return {
        isOpen: context.confirmState.isOpen,
        title: context.confirmState.title,
        message: context.confirmState.message,
        onConfirm: context.handleConfirm,
        onCancel: context.handleCancel,
    };
}
