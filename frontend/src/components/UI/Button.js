import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  type = 'button',
  className = ''
}) => {
  const baseClasses = "font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500 disabled:bg-indigo-400",
    secondary: "bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500 disabled:bg-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 disabled:bg-red-400",
    success: "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500 disabled:bg-green-400",
    outline: "border border-gray-600 text-gray-300 hover:bg-gray-700 focus:ring-gray-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
};

export default Button;