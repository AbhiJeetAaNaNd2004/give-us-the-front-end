export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const getUserRole = () => {
  return localStorage.getItem('userRole');
};

export const setAuthData = (token, role) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userRole', role);
};

export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const hasRole = (requiredRole) => {
  const userRole = getUserRole();
  if (!userRole) return false;
  
  const roleHierarchy = {
    'employee': 1,
    'admin': 2,
    'super_admin': 3
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const canAccessAdminFeatures = () => {
  return hasRole('admin');
};

export const canAccessSuperAdminFeatures = () => {
  return hasRole('super_admin');
};