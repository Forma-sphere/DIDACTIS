'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import type { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set('token', accessToken, { expires: 1 });
  Cookies.set('refreshToken', refreshToken, { expires: 30 });
}

function clearTokens() {
  Cookies.remove('token');
  Cookies.remove('refreshToken');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = Cookies.get('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
    } catch {
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const register = async (payload: { email: string; password: string; firstName: string; lastName: string }) => {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    const refreshToken = Cookies.get('refreshToken');
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }); } catch { /* ignore */ }
    }
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  const resendVerification = async () => {
    await api.post('/auth/resend-verification');
    return;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
