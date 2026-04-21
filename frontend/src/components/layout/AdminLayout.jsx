import React from 'react';
import AdminSidebar from './AdminSidebar';
import NotificationBell from '../NotificationBell';

export default function AdminLayout({ children }) {
  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <AdminSidebar />
      <main className="ml-72 min-h-screen p-12">
        <div className="flex justify-end mb-6">
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}