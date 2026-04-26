import React from 'react';
import NotificationBell from '../NotificationBell';
import ProfileAvatarUploader from '../ProfileAvatarUploader';

export default function StudentHeader({ user, onOpenSidebar }) {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/95 backdrop-blur">
      <div className="flex h-20 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/40 bg-white text-primary shadow-sm lg:hidden"
          aria-label="Open student navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="hidden rounded-2xl border border-outline-variant/30 bg-white/80 px-4 py-2 text-left shadow-sm sm:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
            Student Workspace
          </p>
          <p className="text-sm font-semibold text-on-surface">Event Management System</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="rounded-2xl border border-outline-variant/30 bg-white/80 p-2 shadow-sm">
            <NotificationBell />
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-white/80 px-3 py-2 shadow-sm">
            <div className="text-right">
              <p className="text-xs font-bold leading-none text-on-surface">{user?.name || 'Student'}</p>
              <p className="text-[10px] text-on-surface-variant">Student Portal</p>
            </div>
            <ProfileAvatarUploader user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
