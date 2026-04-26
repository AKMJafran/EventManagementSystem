import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../context/AuthContext';

export default function LecturerSidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const links = [
    { to: '/lecturer/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/lecturer/my-clubs', icon: 'groups', label: 'My Clubs' },
    { to: '/lecturer/pending-approvals', icon: 'pending_actions', label: 'Pending Approvals' },
    { to: '/lecturer/calendar', icon: 'calendar_month', label: 'Calendar & Venues' },
    { to: '/lecturer/profile', icon: 'person', label: 'My Profile' },
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
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-outline-variant/25 bg-[linear-gradient(180deg,#edf1f1_0%,#e3e9e8_100%)] p-6 shadow-2xl transition-transform duration-300 lg:z-20 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Lecturer navigation"
      >
        <div className="mb-8 flex items-center justify-between gap-4 px-2 lg:mb-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container shadow-sm">
              <span className="material-symbols-outlined text-on-primary-container">school</span>
            </div>
            <div>
              <h1 className="font-serif text-lg leading-tight text-teal-900">Faculty Review</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-70">
                Lecturer Portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-on-surface-variant lg:hidden"
            aria-label="Close lecturer navigation"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold ${
                  isActive
                    ? 'bg-white text-teal-900 shadow-md shadow-primary/10 ring-1 ring-primary/10'
                    : 'text-on-surface-variant hover:bg-white/80 hover:text-teal-800'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'
                  }`}
                >
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-auto flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-on-surface-variant hover:bg-white/80 hover:text-teal-800"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="text-xs tracking-wide">Sign Out</span>
        </button>
      </aside>
    </>
  );
}
