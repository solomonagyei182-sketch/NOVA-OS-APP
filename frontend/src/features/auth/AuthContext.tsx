import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler } from '../../lib/api';
import type { LoginableRole, User } from '../../lib/types';

export type RegisterInput = { name: string; email: string; password: string; confirmPassword: string };
export type SetupInput = {
  businessName?: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  /** True when the account table is empty — the workspace hasn't been initialized yet. */
  needsSetup: boolean;
  sessionMessage: string | null;
  login: (email: string, password: string, role: LoginableRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (input: RegisterInput) => Promise<{ message: string }>;
  /** Creates the workspace's first Manager account and signs them in immediately. */
  completeSetup: (input: SetupInput) => Promise<void>;
  /** Clears local auth state without calling the API — the server-side session is already gone. */
  clearSession: (message?: string) => void;
  clearSessionMessage: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api
        .get<{ user: User }>('/auth/me')
        .then((res) => setUser(res.user))
        .catch(() => setUser(null)),
      api
        .get<{ needsSetup: boolean }>('/auth/setup-status')
        .then((res) => setNeedsSetup(res.needsSetup))
        .catch(() => setNeedsSetup(false)),
    ]).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((message) => {
      setUser(null);
      setSessionMessage(message);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email: string, password: string, role: LoginableRole) {
    const res = await api.post<{ user: User }>('/auth/login', { email, password, role });
    setUser(res.user);
    setSessionMessage(null);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort — clear local state regardless
    }
    setUser(null);
  }

  async function register(input: RegisterInput) {
    return api.post<{ message: string }>('/auth/register', input);
  }

  async function completeSetup(input: SetupInput) {
    const res = await api.post<{ user: User }>('/auth/setup', input);
    setNeedsSetup(false);
    setUser(res.user);
    setSessionMessage(null);
  }

  function clearSession(message?: string) {
    setUser(null);
    if (message) setSessionMessage(message);
  }

  function clearSessionMessage() {
    setSessionMessage(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        needsSetup,
        sessionMessage,
        login,
        logout,
        register,
        completeSetup,
        clearSession,
        clearSessionMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
