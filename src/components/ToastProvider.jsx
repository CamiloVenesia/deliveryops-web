import {
    useCallback,
    useMemo,
    useState
} from 'react';

import {
    CheckCircle2,
    CircleAlert,
    Info,
    X
} from 'lucide-react';

import {
    ToastContext
} from './toastContext.js';

const icons = {
    success:
        CheckCircle2,

    error:
        CircleAlert,

    info:
        Info
};

export function ToastProvider({
    children
}) {
    const [
        toasts,
        setToasts
    ] =
        useState([]);

    const removeToast =
        useCallback(
            (
                id
            ) => {
                setToasts(
                    (
                        current
                    ) =>
                        current.filter(
                            (
                                toast
                            ) =>
                                toast.id !==
                                id
                        )
                );
            },
            []
        );

    const pushToast =
        useCallback(
            ({
                type =
                    'success',

                title,

                message
            }) => {
                const id =
                    crypto.randomUUID();

                setToasts(
                    (
                        current
                    ) => [
                        ...current,

                        {
                            id,
                            type,
                            title,
                            message
                        }
                    ]
                );

                window.setTimeout(
                    () => {
                        removeToast(
                            id
                        );
                    },
                    4200
                );

                return id;
            },
            [
                removeToast
            ]
        );

    const value =
        useMemo(
            () => ({
                pushToast,
                removeToast
            }),
            [
                pushToast,
                removeToast
            ]
        );

    return (
        <ToastContext.Provider
            value={
                value
            }
        >
            {children}

            <div
                className="toast-stack"
                aria-live="polite"
            >
                {toasts.map(
                    (
                        toast
                    ) => {
                        const Icon =
                            icons[
                                toast.type
                            ] ??
                            Info;

                        return (
                            <div
                                className={`toast toast--${toast.type}`}
                                key={
                                    toast.id
                                }
                            >
                                <div className="toast__icon">
                                    <Icon
                                        size={
                                            18
                                        }
                                    />
                                </div>

                                <div className="toast__body">
                                    <strong>
                                        {
                                            toast.title
                                        }
                                    </strong>

                                    {toast.message && (
                                        <span>
                                            {
                                                toast.message
                                            }
                                        </span>
                                    )}
                                </div>

                                <button
                                    className="toast__close"
                                    type="button"
                                    onClick={() =>
                                        removeToast(
                                            toast.id
                                        )
                                    }
                                    aria-label="Cerrar notificación"
                                >
                                    <X
                                        size={
                                            16
                                        }
                                    />
                                </button>
                            </div>
                        );
                    }
                )}
            </div>
        </ToastContext.Provider>
    );
}