import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password?: string, phone?: string) => Promise<boolean>;
  logout: () => void;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bharatkart_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data);
      } else {
        localStorage.removeItem('bharatkart_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      // Auto-initialize demo customer if not logged in
      quickDemoLogin('CUSTOMER');
    }
  }, []);

  const login = async (email: string, password: string = 'user123'): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setToken(json.data.token);
        setUser(json.data.user);
        localStorage.setItem('bharatkart_token', json.data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string = 'user123', phone?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setToken(json.data.token);
        setUser(json.data.user);
        localStorage.setItem('bharatkart_token', json.data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Registration error:', err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('bharatkart_token');
    setToken(null);
    setUser(null);
  };

  const quickDemoLogin = async (role: UserRole) => {
    setLoading(true);
    let email = 'rahul.sharma@example.com';
    let pass = 'user123';

    if (role === 'ADMIN') {
      email = 'admin@bharatkart.in';
      pass = 'admin123';
    } else if (role === 'SUPER_ADMIN') {
      email = 'superadmin@bharatkart.in';
      pass = 'super123';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setToken(json.data.token);
        setUser(json.data.user);
        localStorage.setItem('bharatkart_token', json.data.token);
      }
    } catch (e) {
      console.error('Quick demo login error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        login,
        register,
        logout,
        quickDemoLogin,
        updateUser,
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
