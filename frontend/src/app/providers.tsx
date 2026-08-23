import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/AuthContext';
import { ThemeProvider, useTheme } from '../features/theme/ThemeContext';
import { RealtimeSync } from './RealtimeSync';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" closeButton theme={theme} />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <RealtimeSync />
            {children}
            <ThemedToaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
