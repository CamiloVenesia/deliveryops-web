import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import {
    QueryClient,
    QueryClientProvider
} from '@tanstack/react-query';

import App from './App.jsx';

import {
    AuthProvider
} from './auth/AuthContext.jsx';

import {
    ToastProvider
} from './components/ToastProvider.jsx';

import './styles/globals.css';

const queryClient =
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1,
                staleTime: 30_000,
                refetchOnWindowFocus: false
            },

            mutations: {
                retry: 0
            }
        }
    });

createRoot(
    document.getElementById('root')
).render(
    <QueryClientProvider
        client={queryClient}
    >
        <BrowserRouter>
            <ToastProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ToastProvider>
        </BrowserRouter>
    </QueryClientProvider>
);