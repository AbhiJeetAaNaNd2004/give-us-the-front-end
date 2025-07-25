import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../UI/Button';
import { getUserRole, clearUserRole } from '../../utils/auth';
import apiService from '../../services/api';

const Header = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const userRole = getUserRole();

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to clear the httpOnly cookie
      await apiService.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear user role from localStorage and redirect
      clearUserRole();
      navigate('/login');
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'employee':
        return 'Employee';
      default:
        return role;
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-300">Role: {getRoleDisplayName(userRole)}</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;