import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Restore session from stored token on mount */
  useEffect(() => {
    if (!api.hasToken()) { setLoading(false); return; }
    api.getMe()
      .then(res => setUser(res.data))
      .catch(() => { api.clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const loginFn = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    setUser(res.data);
    return res.data;
  }, []);

  const registerFn = useCallback(async (email, password, display_name) => {
    const res = await api.register(email, password, display_name);
    setUser(res.data);
    return res.data;
  }, []);

  const logoutFn = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const updateProfileFn = useCallback(async (data) => {
    const res = await api.updateProfile(data);
    setUser(res.data);
    return res.data;
  }, []);

  const value = {
    user, loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    updateProfile: updateProfileFn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
