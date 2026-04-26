import React from 'react';
import LecturerSidebar from './LecturerSidebar';
import NotificationBell from '../NotificationBell';
import useAuthStore from '../../context/AuthContext';

export default function LecturerLayout({ children }) {
  const { user } = useAuthStore();

  return (
    <div className="bg-background font-body text-on-surface antialiased min-h-screen">
      <LecturerSidebar />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,101,101,0.05)] pl-72">
        <div className="flex justify-between items-center px-12 h-20 w-full">
          <div className="flex items-center gap-12">
            <span className="text-2xl font-serif italic text-teal-800 dark:text-teal-200">Scholastic Ledger</span>
          </div>
          
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface leading-none">{user?.name || 'Lecturer'}</p>
                <p className="text-[10px] text-on-surface-variant">
                  {user?.department ? `${user.department} Department` : 'Lecturer'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-teal-100 overflow-hidden flex items-center justify-center text-teal-800 font-bold">
                {user?.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'L'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pl-72 pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-12 py-12">
          {children}
        </div>
        
        <footer className="mt-12 px-12 pb-12">
          <div className="border-t border-outline-variant/10 pt-8 flex flex-col md:flex-row justify-between items-center text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
            <p>© 2024 Scholastic Ledger University System</p>
            <div className="flex gap-8 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary">Terms of Use</a>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
              <a href="#" className="hover:text-primary">System Status</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
