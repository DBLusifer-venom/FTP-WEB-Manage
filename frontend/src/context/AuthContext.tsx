import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, setAccessToken, getAccessToken } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        setAccessToken(token);
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch {
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await authApi.login({ email, password });
    setAccessToken(access_token);
    const userData = await authApi.getMe();
    setUser(userData);
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (getAccessToken()) {
      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch {
        setAccessToken(null);
        setUser(null);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};