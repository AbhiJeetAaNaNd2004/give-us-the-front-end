import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, InputField, Alert, LoadingSpinner } from '../components/UI';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        // Redirect will be handled by the main App component
        setAlert({
          type: 'success',
          message: 'Login successful! Redirecting...'
        });
      } else {
        setAlert({
          type: 'error',
          message: result.error || 'Login failed. Please check your credentials.'
        });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="mb-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-indigo-400">Face Recognition System</h1>
          <p className="text-lg text-gray-400 mt-2">Enter your credentials to access the system</p>
        </header>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          {alert && (
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <InputField
              id="username"
              name="username"
              label="Username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              required
              error={errors.username}
              disabled={isLoading}
            />

            <InputField
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              error={errors.password}
              disabled={isLoading}
            />

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                fullWidth
                className="relative"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Demo Credentials:</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Employee:</span>
                <span>employee / password</span>
              </div>
              <div className="flex justify-between">
                <span>Admin:</span>
                <span>admin / password</span>
              </div>
              <div className="flex justify-between">
                <span>Super Admin:</span>
                <span>superadmin / password</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 Face Recognition System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;