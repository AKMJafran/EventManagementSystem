import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../context/AuthContext';

export default function AdminSidebar() {
  const location = useLocation();
  const logout = useAuthStore(s => s.logout);

  const navLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Manage Events', path: '/manage-events', icon: 'event_note' },
    { name: 'Manage Categories', path: '/manage-categories', icon: 'category' },
    { name: 'Manage Students', path: '/manage-students', icon: 'people' },
    { name: 'Manage Venues', path: '/manage-venues', icon: 'location_on' },
    { name: 'Reports', path: '/admin/reports/monthly', icon: 'analytics' },
  ];

  return (
    <aside className="h-screen w-72 flex flex-col fixed left-0 top-0 bg-slate-50 dark:bg-slate-950 p-6 border-r-0 font-sans text-sm tracking-wide">
      <div className="mb-10 flex items-center gap-4 px-2">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary-container">school</span>
        </div>
        <div>
          <h1 className="font-serif text-lg text-teal-900 dark:text-teal-50 leading-tight">Dean's Office</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold opacity-70">Administrative Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-100 active:translate-x-1'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-6">
        <Link
          to="/create-event"
          className="w-full btn-gradient text-on-primary py-3 px-4 rounded-lg font-semibold mb-6 shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Create New Event
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all rounded-lg">
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="font-sans text-xs tracking-wide">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}