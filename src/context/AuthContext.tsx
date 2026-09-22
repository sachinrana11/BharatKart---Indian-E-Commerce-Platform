import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.js';
import { authApi, apiClient, setAuthTokenProvider } from '../services/api.js';

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
  const [token, setToken] = useState<string | null>(() => apiClient.getToken());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const userData = await authApi.getMe();
      if (userData) {
        setUser(userData);
      } else {
        apiClient.clearToken();
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      apiClient.clearToken();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize token state with API service request interceptor
  useEffect(() => {
    setAuthTokenProvider(() => token);
    return () => {
      setAuthTokenProvider(null);
    };
  }, [token]);

  useEffect(() => {
    // Listen for unauthorized 401 events dispatched by api interceptor
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);

    if (token) {
      fetchCurrentUser();
    } else {
      // Auto-initialize demo customer if not logged in
      quickDemoLogin('CUSTOMER');
    }

    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string = 'user123'): Promise<boolean> => {
    try {
      const res = await authApi.login(email, password);
      if (res && res.token && res.user) {
        apiClient.setToken(res.token);
        setToken(res.token);
        setUser(res.user);
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
      const res = await authApi.register({ name, email, password, phone });
      if (res && res.token && res.user) {
        apiClient.setToken(res.token);
        setToken(res.token);
        setUser(res.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Registration error:', err);
      return false;
    }
  };

  const logout = () => {
    authApi.logout();
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
      const res = await authApi.login(email, pass);
      if (res && res.token && res.user) {
        apiClient.setToken(res.token);
        setToken(res.token);
        setUser(res.user);
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
