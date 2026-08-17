import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<any>;
  register: (name: string, email: string, password?: string) => Promise<any>;
  verifyOTP: (email: string, otp: string) => Promise<any>;
  logout: () => void;
  quickLoginAs: (role: 'admin' | 'user') => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('tixora_user') || localStorage.getItem('tixora_user');
    const savedToken = localStorage.getItem('tixora_token') || localStorage.getItem('tixora_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem('tixora_user');
        localStorage.removeItem('tixora_token');
        localStorage.removeItem('tixora_user');
        localStorage.removeItem('tixora_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password: password || 'password123' });
      const data = response.data;
      if (data.token) {
        const u: User = {
          id: data._id || data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          isVerified: true,
          createdAt: new Date().toISOString()
        };
        setUser(u);
        setToken(data.token);
        localStorage.setItem('tixora_user', JSON.stringify(u));
        localStorage.setItem('tixora_token', data.token);
      }
      return data;
    } catch (error: any) {
      if (error.response?.data?.needsVerification) {
        throw error.response.data;
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password?: string) => {
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password: password || 'password123'
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      const response = await axios.post('/api/auth/verify-otp', { email, otp });
      const data = response.data;
      const u: User = {
        id: data._id || data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      setUser(u);
      setToken(data.token);
      localStorage.setItem('tixora_user', JSON.stringify(u));
      localStorage.setItem('tixora_token', data.token);
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'OTP verification failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('tixora_user');
    localStorage.removeItem('tixora_token');
    localStorage.removeItem('tixora_user');
    localStorage.removeItem('tixora_token');
  };

  const quickLoginAs = async (role: 'admin' | 'user') => {
    const email = role === 'admin' ? 'admin@tixora.com' : 'user@tixora.com';
    return await login(email, 'password123');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOTP, logout, quickLoginAs }}>
      {children}
    </AuthContext.Provider>
  );
};
