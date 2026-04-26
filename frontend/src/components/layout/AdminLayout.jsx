import React, { useState } from 'react';
import useAuthStore from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import AdminSidebar from './AdminSidebar';
import ProfileShortcut from './ProfileShortcut';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen lg:ml-72">
        <div className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/40 bg-white text-primary shadow-sm lg:hidden"
              aria-label="Open admin navigation"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden rounded-2xl border border-outline-variant/30 bg-white/80 px-4 py-2 text-right shadow-sm sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Admin Workspace
                </p>
                <p className="text-sm font-semibold text-on-surface">Event Management System</p>
              </div>
              <div className="rounded-2xl border border-outline-variant/30 bg-white/80 p-2 shadow-sm">
                <NotificationBell />
              </div>
              <ProfileShortcut user={user} />
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
