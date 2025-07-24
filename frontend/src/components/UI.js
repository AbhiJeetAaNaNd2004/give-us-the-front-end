import React from 'react';

// Button Component
export const Button = ({ 
  onClick, 
  disabled = false, 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  type = 'button',
  className = ''
}) => {
  const baseClasses = "font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-500 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// Input Field Component
export const InputField = ({ 
  id, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  required = false,
  error,
  disabled = false,
  className = ''
}) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
    )}
    <input
      id={id}
      name={id}
      type={type}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-600'} text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
    />
    {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
  </div>
);

// Select Field Component
export const SelectField = ({ 
  id, 
  label, 
  value, 
  onChange, 
  options = [],
  required = false,
  error,
  disabled = false,
  className = ''
}) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
    )}
    <select
      id={id}
      name={id}
      required={required}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-600'} text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
  </div>
);

// File Input Component
export const FileInput = ({ 
  id, 
  label, 
  onChange, 
  accept,
  required = false,
  error,
  disabled = false,
  className = ''
}) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
    )}
    <input
      id={id}
      name={id}
      type="file"
      required={required}
      onChange={onChange}
      accept={accept}
      disabled={disabled}
      className={`w-full bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-600'} text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500`}
    />
    {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
  </div>
);

// Card Component
export const Card = ({ children, className = '', title }) => (
  <div className={`bg-gray-800 rounded-lg shadow-2xl border border-gray-700 ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

// Modal Component
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose}></div>
        
        <div className={`inline-block w-full ${sizes[size]} p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg border border-gray-700`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

// Loading Spinner Component
export const LoadingSpinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex justify-center">
      <div className={`${sizes[size]} animate-spin rounded-full border-b-2 border-indigo-600`}></div>
    </div>
  );
};

// Alert Component
export const Alert = ({ type = 'info', message, onClose }) => {
  const types = {
    success: 'bg-green-800 border-green-600 text-green-200',
    error: 'bg-red-800 border-red-600 text-red-200',
    warning: 'bg-yellow-800 border-yellow-600 text-yellow-200',
    info: 'bg-blue-800 border-blue-600 text-blue-200',
  };

  return (
    <div className={`border-l-4 p-4 mb-4 ${types[type]}`}>
      <div className="flex justify-between">
        <p>{message}</p>
        {onClose && (
          <button onClick={onClose} className="ml-4 font-bold">
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Table Component
export const Table = ({ headers, children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="min-w-full bg-gray-800 border border-gray-700">
      <thead className="bg-gray-700">
        <tr>
          {headers.map((header, index) => (
            <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700">
        {children}
      </tbody>
    </table>
  </div>
);

// Table Row Component
export const TableRow = ({ children, className = '' }) => (
  <tr className={`hover:bg-gray-700 transition-colors duration-150 ${className}`}>
    {children}
  </tr>
);

// Table Cell Component
export const TableCell = ({ children, className = '' }) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-300 ${className}`}>
    {children}
  </td>
);

// Badge Component
export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-600 text-gray-200',
    success: 'bg-green-600 text-green-200',
    danger: 'bg-red-600 text-red-200',
    warning: 'bg-yellow-600 text-yellow-200',
    info: 'bg-blue-600 text-blue-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};