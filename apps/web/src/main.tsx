import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { LocaleProvider } from './context/LocaleContext.tsx';
import './i18n.ts';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: true,
            staleTime: 5 * 60 * 1000,
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <BrowserRouter>
                        <LocaleProvider>
                            <App />
                        </LocaleProvider>
                    </BrowserRouter>
                </AuthProvider>
            </QueryClientProvider>
        </AppErrorBoundary>
    </React.StrictMode>,
);
