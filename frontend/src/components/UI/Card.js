import React from 'react';

const Card = ({ children, title, className = '' }) => {
  return (
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
};

export default Card;