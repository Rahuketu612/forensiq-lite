'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDevMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'forensiq_token';
const USER_KEY = 'forensiq_user';

// Dev mode: automatically use demo auditor
const DEV_BYPASS_ENABLED = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
const DEV_USER: User = {
  id: 'dev-bypass-user',
  email: 'auditor@forensiq.local',
  name: 'Dev Auditor',
  role: 'AUDITOR',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize dev bypass mode
  useEffect(() => {
    if (DEV_BYPASS_ENABLED) {
      localStorage.setItem(TOKEN_KEY, 'dev-bypass-token');
      localStorage.setItem(USER_KEY, JSON.stringify(DEV_USER));
      setUser(DEV_USER);
      setIsLoading(false);
      return;
    }

    // Check for existing token on mount
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Dev bypass: use demo user directly
    if (DEV_BYPASS_ENABLED) {
      localStorage.setItem(TOKEN_KEY, 'dev-bypass-token');
      localStorage.setItem(USER_KEY, JSON.stringify(DEV_USER));
      setUser(DEV_USER);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.login(email, password);
      localStorage.setItem(TOKEN_KEY, response.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setUser(response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    if (DEV_BYPASS_ENABLED) {
      localStorage.setItem(TOKEN_KEY, 'dev-bypass-token');
      localStorage.setItem(USER_KEY, JSON.stringify({ ...DEV_USER, email, name }));
      setUser({ ...DEV_USER, email, name });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.register({ email, name, password });
      localStorage.setItem(TOKEN_KEY, response.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setUser(response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    if (DEV_BYPASS_ENABLED) return; // Can't logout in dev mode
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isDevMode: DEV_BYPASS_ENABLED,
        login,
        register,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth(redirectTo = '/login') {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isLoading, isAuthenticated, redirectTo]);

  return { user, isLoading, isAuthenticated };
}

// Get current token
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// Check if dev bypass is active
export function isDevBypass(): boolean {
  return DEV_BYPASS_ENABLED;
}