import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function StudentSidebar() {
  const location = useLocation();

  const links = [
    { to: "/student", icon: "dashboard", label: "Dashboard" },
    { to: "/student/my-events", icon: "event_note", label: "Event Requests" },
    { to: "/student/calendar", icon: "meeting_room", label: "Venue Booking" },
  ];

  return (
    <aside className="h-screen w-72 fixed left-0 top-0 bg-stone-50 dark:bg-stone-950 flex flex-col p-6 space-y-2 z-40 border-r border-outline-variant/10">
      <div className="mb-10 px-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 editorial-gradient rounded-xl flex items-center justify-center text-white">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div>
            <h2 className="font-serif text-lg text-teal-900 dark:text-teal-50 leading-tight">Student Portal</h2>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/70 font-semibold">Academic Event Mgmt</p>
          </div>
        </div>
        
        <Link 
          to="/create-event" 
          className="w-full flex items-center justify-center gap-2 py-3 editorial-gradient text-white rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all font-medium text-sm"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          <span>Create New Request</span>
        </Link>
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          if (isActive) {
            return (
              <Link 
                key={link.to} 
                to={link.to} 
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-stone-900 text-teal-800 dark:text-teal-200 border-l-4 border-yellow-600 shadow-sm font-sans text-sm font-medium transition-transform duration-200"
              >
                <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          }
          return (
            <Link 
              key={link.to} 
              to={link.to} 
              className="flex items-center gap-3 px-4 py-3 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-sans text-sm font-medium hover:translate-x-1 transition-transform duration-200"
            >
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}

        <a href="#" className="flex items-center gap-3 px-4 py-3 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-sans text-sm font-medium hover:translate-x-1 transition-transform duration-200">
          <span className="material-symbols-outlined text-[20px]">school</span>
          <span>Faculty Liaison</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-sans text-sm font-medium hover:translate-x-1 transition-transform duration-200">
          <span className="material-symbols-outlined text-[20px]">menu_book</span>
          <span>Academic Guidelines</span>
        </a>
      </nav>

      <div className="mt-auto pt-6 px-4">
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter mb-2">University News</p>
          <p className="text-xs text-on-surface leading-relaxed">Annual research symposium registrations are now open for faculty members.</p>
        </div>
      </div>
    </aside>
  );
}