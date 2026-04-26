import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../context/AuthContext';

export default function AdminSidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const logout = useAuthStore(s => s.logout);

  const navLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Manage Events', path: '/manage-events', icon: 'event_note' },
    { name: 'Manage Clubs', path: '/admin/manage-clubs', icon: 'account_balance' },
    { name: 'Manage Categories', path: '/manage-categories', icon: 'category' },
    { name: 'Manage Students', path: '/manage-students', icon: 'people' },
    { name: 'Manage Lecturers', path: '/manage-lecturers', icon: 'supervisor_account' },
    { name: 'Manage Venues', path: '/manage-venues', icon: 'location_on' },
    { name: 'Notifications', path: '/admin/notifications', icon: 'notifications' },
    { name: 'Reports', path: '/admin/reports/monthly', icon: 'analytics' },
    { name: 'Analytics Hub', path: '/admin/reports/analytics', icon: 'query_stats' },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-outline-variant/25 bg-[linear-gradient(180deg,#edf1f1_0%,#e3e9e8_100%)] p-6 font-sans text-sm tracking-wide shadow-2xl transition-transform duration-300 lg:z-20 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Admin navigation"
      >
        <div className="mb-8 flex items-center justify-between gap-4 px-2 lg:mb-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container shadow-sm">
              <span className="material-symbols-outlined text-on-primary-container">school</span>
            </div>
            <div>
              <h1 className="font-serif text-lg leading-tight text-teal-900">Dean's Office</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-70">
                Administrative Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-on-surface-variant lg:hidden"
            aria-label="Close admin navigation"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold ${
                  isActive
                    ? 'bg-white text-teal-900 shadow-md shadow-primary/10 ring-1 ring-primary/10'
                    : 'text-on-surface-variant hover:bg-white/80 hover:text-teal-800'
                }`}
              >
                <span
                  className={`material-symbols-outlined transition-transform ${
                    isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'
                  }`}
                >
                  {link.icon}
                </span>
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          <Link
            to="/admin/create-event"
            onClick={onClose}
            className="btn-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-on-primary shadow-xl shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">event</span>
            Create Event
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-on-surface-variant hover:bg-white/80 hover:text-teal-800"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className="font-sans text-xs tracking-wide">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
