import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { endpoints } from '../services/api';
import { refreshSocketAuth } from '../services/socket';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    endpoints
      .me()
      .then((r) => alive && setUser(r.user))
      .catch(() => alive && setUser(null)) // 401 = not signed in
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await endpoints.login(email, password);
    setUser(r.user);
    refreshSocketAuth();
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await endpoints.logout();
    } finally {
      setUser(null);
      refreshSocketAuth();
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

export const homeFor = (role: AuthUser['role']) => (role === 'owner' || (role as string) === 'admin' ? '/owner' : role === 'barber' ? '/barber' : '/reception');
