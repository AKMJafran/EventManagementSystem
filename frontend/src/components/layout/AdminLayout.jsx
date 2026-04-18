import React from 'react';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <AdminSidebar />
      <main className="ml-72 min-h-screen p-12">
        {children}
      </main>
    </div>
  );
}