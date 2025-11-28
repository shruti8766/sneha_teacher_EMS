import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedSession = localStorage.getItem('sessionId');

    if (storedUser && storedSession) {
      setUser(JSON.parse(storedUser));
      setSessionId(storedSession);
    }
  }, []);

  const login = (data: LoginResponse) => {
    setUser(data.user);
    setSessionId(data.sessionId);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('sessionId', data.sessionId);
  };

  const logout = () => {
    setUser(null);
    setSessionId(null);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      sessionId, 
      isAuthenticated: !!sessionId, 
      login, 
      logout 
    }}>
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