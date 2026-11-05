import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminLoginSheet } from '../services/api';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'secure_exam_auth_user';

export const DEMO_ACCOUNTS = [];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    // 1. Authenticate with Google Sheet `Admin` table
    const res = await adminLoginSheet(email, password);
    if (res && res.success && res.user) {
      setUser(res.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.user));
      return { success: true, user: res.user };
    }

    return {
      success: false,
      error: res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลใน Sheet Admin',
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
