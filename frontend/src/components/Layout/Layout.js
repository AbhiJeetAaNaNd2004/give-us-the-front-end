import React from 'react';
import Header from './Header';
import Navigation from './Navigation';

const Layout = ({ children, title, subtitle }) => {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <Header title={title} subtitle={subtitle} />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;