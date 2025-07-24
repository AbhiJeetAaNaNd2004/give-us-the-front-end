import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './UI';

const Layout = ({ children, title, currentPage = 'dashboard' }) => {
  const { role, logout, hasRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', key: 'dashboard', roles: ['employee', 'admin', 'super_admin'] },
    { name: 'Attendance', key: 'attendance', roles: ['employee', 'admin', 'super_admin'] },
    { name: 'Users', key: 'users', roles: ['admin', 'super_admin'] },
    { name: 'Face Management', key: 'faces', roles: ['admin', 'super_admin'] },
    { name: 'Live Feed', key: 'video', roles: ['admin', 'super_admin'] },
    { name: 'Cameras', key: 'cameras', roles: ['super_admin'] },
    { name: 'System Control', key: 'system', roles: ['super_admin'] },
  ];

  const availableNavItems = navigationItems.filter(item => 
    item.roles.includes(role)
  );

  const getRoleDisplayName = (role) => {
    const roleNames = {
      employee: 'Employee',
      admin: 'Admin',
      super_admin: 'Super Admin'
    };
    return roleNames[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      employee: 'bg-blue-600',
      admin: 'bg-green-600',
      super_admin: 'bg-purple-600'
    };
    return colors[role] || 'bg-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-indigo-400">
                  Face Recognition System
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {availableNavItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => window.location.hash = `#${item.key}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                    currentPage === item.key
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* User Info and Logout */}
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getRoleBadgeColor(role)}`}>
                {getRoleDisplayName(role)}
              </span>
              <Button
                onClick={logout}
                variant="secondary"
                size="sm"
              >
                Logout
              </Button>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path
                    className={!isMobileMenuOpen ? 'block' : 'hidden'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                  <path
                    className={isMobileMenuOpen ? 'block' : 'hidden'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {availableNavItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    window.location.hash = `#${item.key}`;
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors duration-150 ${
                    currentPage === item.key
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {title && (
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white">{title}</h2>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;