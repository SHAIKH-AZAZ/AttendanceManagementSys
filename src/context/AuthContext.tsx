'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { api } from '@/lib/client';

interface AuthContextValue {
  user: User | null;
  /** 'loading' only while the existing session is checked on first load. */
  status: 'loading' | 'ready';
  /** Throws with the server's message when the credentials are rejected. */
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    let active = true;
    api
      .get<{ user: User }>('/api/auth/me')
      .then(
        (data) => data.user,
        () => null
      )
      .then((sessionUser) => {
        if (!active) return;
        setUser(sessionUser);
        setStatus('ready');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User }>('/api/auth/login', { email, password });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => undefined);
    setUser(null);
    // Views are role-specific; don't carry one over to the next account.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
