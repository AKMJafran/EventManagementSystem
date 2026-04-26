import React from 'react';
import useAuthStore from '../context/AuthContext';
import LecturerLayout from '../components/layout/LecturerLayout';

export default function LecturerDashboard() {
  const { user } = useAuthStore();

  return (
    <LecturerLayout user={user}>
      <section className="mb-10">
        <h1 className="text-5xl font-bold text-primary serif-heading">Lecturer Dashboard</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Welcome to the Lecturer Portal. Manage departmental events and club oversight from here.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Welcome Card */}
        <div className="col-span-full rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 academic-gradient rounded-2xl flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-3xl">person</span>
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-teal-900">
                Welcome back, {user?.name || 'Lecturer'}
              </h2>
              {user?.department && (
                <p className="mt-2 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">apartment</span>
                    {user.department} Department
                  </span>
                </p>
              )}
              <p className="mt-4 text-on-surface-variant leading-relaxed">
                As a Senior Treasurer, you can oversee student club activities and propose
                departmental events. Use the sidebar to navigate through available features.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-teal-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary">event</span>
              <span className="text-sm font-medium text-on-surface">View Upcoming Events</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary">groups</span>
              <span className="text-sm font-medium text-on-surface">Club Oversight</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              <span className="text-sm font-medium text-on-surface">Propose Department Event</span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-teal-900 mb-4">Your Role</h3>
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-container-low p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-sm text-primary">verified</span>
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Senior Treasurer</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Oversee financial and operational aspects of assigned student clubs.
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-sm text-primary">campaign</span>
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Event Proposer</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Submit and manage departmental event proposals for faculty review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LecturerLayout>
  );
}
