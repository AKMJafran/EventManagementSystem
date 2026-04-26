import React, { useState } from 'react';
import useAuthStore from '../../context/AuthContext';
import StudentHeader from './StudentHeader';
import StudentSidebar from './StudentSidebar';

export default function StudentLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const storedUser = useAuthStore((state) => state.user);
  const resolvedUser = user || storedUser;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen lg:ml-72">
        <StudentHeader user={resolvedUser} onOpenSidebar={() => setSidebarOpen(true)} />
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
