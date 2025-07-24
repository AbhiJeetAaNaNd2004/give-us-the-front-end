import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import LiveVideoPage from './pages/LiveVideoPage';
import AttendancePage from './pages/AttendancePage';
import { LoadingSpinner } from './components/UI';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <LoginPage />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

// Main App Router Component
const AppRouter = () => {
  const { role, isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Handle hash-based routing
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'dashboard';
      setCurrentPage(hash);
    };

    handleHashChange(); // Set initial page
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <LoginPage />;
  }

  // Route based on current page and user role
  switch (currentPage) {
    case 'dashboard':
      if (role === 'super_admin') {
        return <SuperAdminDashboard />;
      } else if (role === 'admin') {
        return <AdminDashboard />;
      } else {
        return <EmployeeDashboard />;
      }

    case 'attendance':
      // All roles can access attendance page
      return <AttendancePage />;

    case 'users':
      return (
        <ProtectedRoute requiredRole="admin">
          {role === 'super_admin' ? <SuperAdminDashboard /> : <AdminDashboard />}
        </ProtectedRoute>
      );

    case 'faces':
      return (
        <ProtectedRoute requiredRole="admin">
          {role === 'super_admin' ? <SuperAdminDashboard /> : <AdminDashboard />}
        </ProtectedRoute>
      );

    case 'video':
      return (
        <ProtectedRoute requiredRole="admin">
          <LiveVideoPage />
        </ProtectedRoute>
      );

    case 'cameras':
      return (
        <ProtectedRoute requiredRole="super_admin">
          <SuperAdminDashboard />
        </ProtectedRoute>
      );

    case 'system':
      return (
        <ProtectedRoute requiredRole="super_admin">
          <SuperAdminDashboard />
        </ProtectedRoute>
      );

    default:
      // Redirect to dashboard for unknown routes
      window.location.hash = '#dashboard';
      return null;
  }
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <div className="App">
        <AppRouter />
      </div>
    </AuthProvider>
  );
};

export default App;
