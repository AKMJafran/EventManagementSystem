import React, { useState } from 'react';
import useAuthStore from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import LecturerSidebar from './LecturerSidebar';
import ProfileShortcut from './ProfileShortcut';

export default function LecturerLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <LecturerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/40 bg-white text-primary shadow-sm lg:hidden"
              aria-label="Open lecturer navigation"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="hidden rounded-2xl border border-outline-variant/30 bg-white/80 px-4 py-2 text-left shadow-sm sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Lecturer Workspace
              </p>
              <p className="text-sm font-semibold text-on-surface">Event Management System</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="rounded-2xl border border-outline-variant/30 bg-white/80 p-2 shadow-sm">
                <NotificationBell />
              </div>
              <ProfileShortcut user={user} />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>

        <footer className="px-4 pb-8 pt-4 sm:px-6 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/10 pt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant md:flex-row">
            <p>© 2026 Event Management System</p>
            <div className="flex flex-wrap items-center gap-6">
              <a href="#" className="transition hover:text-primary">Terms of Use</a>
              <a href="#" className="transition hover:text-primary">Privacy Policy</a>
              <a href="#" className="transition hover:text-primary">System Status</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
