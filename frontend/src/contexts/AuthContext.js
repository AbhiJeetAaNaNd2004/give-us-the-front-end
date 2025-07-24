import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [role, setRole] = useState(localStorage.getItem('userRole'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const storedToken = localStorage.getItem('authToken');
    const storedRole = localStorage.getItem('userRole');
    
    if (storedToken && storedRole) {
      setToken(storedToken);
      setRole(storedRole);
      setUser({ role: storedRole });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      const { access_token, role: userRole } = response;
      
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('userRole', userRole);
      
      setToken(access_token);
      setRole(userRole);
      setUser({ role: userRole });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    setToken(null);
    setRole(null);
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!token && !!role;
  };

  const hasRole = (requiredRole) => {
    if (!role) return false;
    
    const roleHierarchy = {
      employee: 1,
      admin: 2,
      super_admin: 3
    };
    
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  const value = {
    user,
    token,
    role,
    loading,
    login,
    logout,
    isAuthenticated,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};