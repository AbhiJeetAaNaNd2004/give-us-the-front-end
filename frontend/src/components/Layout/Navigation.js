import React from 'react';
import { NavLink } from 'react-router-dom';
import { canAccessAdminFeatures, canAccessSuperAdminFeatures } from '../../utils/auth';

const Navigation = () => {
  const isAdmin = canAccessAdminFeatures();
  const isSuperAdmin = canAccessSuperAdminFeatures();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', roles: ['employee', 'admin', 'super_admin'] },
    { path: '/attendance', label: 'My Attendance', roles: ['employee', 'admin', 'super_admin'] },
    { path: '/users', label: 'User Management', roles: ['admin', 'super_admin'] },
    { path: '/faces', label: 'Face Management', roles: ['admin', 'super_admin'] },
    { path: '/cameras', label: 'Camera Management', roles: ['super_admin'] },
    { path: '/system', label: 'System Control', roles: ['super_admin'] },
    { path: '/live-feed', label: 'Live Feed', roles: ['admin', 'super_admin'] },
  ];

  const getAccessibleItems = () => {
    return navItems.filter(item => {
      if (item.roles.includes('employee')) return true;
      if (item.roles.includes('admin') && isAdmin) return true;
      if (item.roles.includes('super_admin') && isSuperAdmin) return true;
      return false;
    });
  };

  return (
    <nav className="bg-gray-800 border-r border-gray-700 w-64 min-h-screen">
      <div className="p-4">
        <div className="space-y-2">
          {getAccessibleItems().map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;