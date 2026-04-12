import React, { createContext, useCallback, useContext, useState } from 'react';
import { User } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (provider: 'apple' | 'google') => Promise<User>;
  logout: () => void;
  refreshUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    async (provider: 'apple' | 'google') => {
      setIsLoading(true);
      try {
        const loggedIn = await api.loginUser(provider);
        setUser(loggedIn);
        return loggedIn;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => setUser(null), []);

  const refreshUser = useCallback((updated: User) => setUser(updated), []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
