
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = (
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000/api'
).replace(/\/+$/, '');

const CHECK_INTERVAL_MS = 60_000;
const CHECK_TIMEOUT_MS = 12_000;

export function useConnectivity() {
    const queryClient = useQueryClient();

    const [status, setStatus] = useState(() =>
        navigator.onLine === false ? 'offline' : 'checking'
    );

    const requestRef = useRef(null);
    const previousRef = useRef(null);

    const check = useCallback(async () => {
        if (navigator.onLine === false) {
            previousRef.current = 'offline';
            setStatus('offline');
            return;
        }

        requestRef.current?.abort();

        const controller = new AbortController();
        requestRef.current = controller;

        const timeout = window.setTimeout(
            () => controller.abort(),
            CHECK_TIMEOUT_MS
        );

        try {
            const response = await fetch(`${API_URL}/health`, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'omit',
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(
                    'El servidor no respondió correctamente'
                );
            }

            const data = await response.json();

            if (data?.status !== 'ok') {
                throw new Error('Respuesta de salud inválida');
            }

            if (requestRef.current !== controller) return;

            const recovered = ['offline', 'unreachable'].includes(
                previousRef.current
            );

            previousRef.current = 'online';
            setStatus('online');

            if (recovered) {
                await queryClient.invalidateQueries({
                    refetchType: 'active'
                });
            }
        } catch {
            if (requestRef.current !== controller) return;

            const next = navigator.onLine === false
                ? 'offline'
                : 'unreachable';

            previousRef.current = next;
            setStatus(next);
        } finally {
            window.clearTimeout(timeout);

            if (requestRef.current === controller) {
                requestRef.current = null;
            }
        }
    }, [queryClient]);

    useEffect(() => {
        function handleOffline() {
            requestRef.current?.abort();
            previousRef.current = 'offline';
            setStatus('offline');
        }

        function handleOnline() {
            setStatus('checking');
            void check();
        }

        function handleVisibility() {
            if (!document.hidden) void check();
        }

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        document.addEventListener(
            'visibilitychange',
            handleVisibility
        );

        const timer = window.setInterval(() => {
            if (!document.hidden) void check();
        }, CHECK_INTERVAL_MS);

        const initialCheck = window.setTimeout(
            () => void check(),
            0
        );

        return () => {
            window.clearTimeout(initialCheck);

            window.removeEventListener(
                'offline',
                handleOffline
            );

            window.removeEventListener(
                'online',
                handleOnline
            );

            document.removeEventListener(
                'visibilitychange',
                handleVisibility
            );

            window.clearInterval(timer);
            requestRef.current?.abort();
            requestRef.current = null;
        };
    }, [check]);

    return { status, retry: check };
}
