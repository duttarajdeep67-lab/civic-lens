import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
  register: (data: any) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isCitizen: boolean;
  isOfficer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('civiclens_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('civiclens_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('civiclens_token');
      if (storedToken) {
        try {
          const freshUser = await authService.getMe();
          setUser(freshUser);
          localStorage.setItem('civiclens_user', JSON.stringify(freshUser));
        } catch (err) {
          console.warn('Session verification failed, clearing auth:', err);
          setUser(null);
          setToken(null);
          localStorage.removeItem('civiclens_token');
          localStorage.removeItem('civiclens_user');
        }
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const resp = await authService.login(credentials);
    setToken(resp.access_token);
    setUser(resp.user);
    localStorage.setItem('civiclens_token', resp.access_token);
    localStorage.setItem('civiclens_user', JSON.stringify(resp.user));
    return resp;
  };

  const register = async (data: any): Promise<AuthResponse> => {
    const resp = await authService.register(data);
    setToken(resp.access_token);
    setUser(resp.user);
    localStorage.setItem('civiclens_token', resp.access_token);
    localStorage.setItem('civiclens_user', JSON.stringify(resp.user));
    return resp;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('civiclens_token');
      localStorage.removeItem('civiclens_user');
    }
  };

  const isCitizen = user?.role === 'citizen';
  const isOfficer = user?.role === 'officer' || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isCitizen,
        isOfficer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
