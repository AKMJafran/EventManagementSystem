import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-6">
          <div className="flex justify-center items-center gap-6">
            <div className="w-24 h-24 bg-teal-800 rounded-2xl shadow-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-5xl">school</span>
            </div>
            <div className="w-24 h-24 bg-yellow-600 rounded-2xl shadow-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-5xl">event</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-serif font-bold text-teal-950 dark:text-teal-50">
            Faculty Event Management
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-sans">
            A centralized platform for academic event scheduling, student coordination, and faculty oversight.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
          <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-stone-800">
            <span className="material-symbols-outlined text-teal-600 text-4xl mb-4">event_available</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Schedule Events</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Request and manage academic events with faculty approval workflows.</p>
          </div>
          <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-stone-800">
            <span className="material-symbols-outlined text-yellow-600 text-4xl mb-4">meeting_room</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Book Venues</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Avoid conflicts with a centralized calendar for all lecture halls and auditoriums.</p>
          </div>
          <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-stone-800">
            <span className="material-symbols-outlined text-teal-600 text-4xl mb-4">admin_panel_settings</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Admin Provisioning</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Student accounts are created and managed by administrators with first-login password reset enforcement.</p>
          </div>
        </div>

        <div className="flex justify-center items-center pt-8 border-t border-slate-200 dark:border-stone-800">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 bg-teal-800 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-900/20 transition-all hover:-translate-y-1"
          >
            Sign In to Portal
          </Link>
        </div>

        <div className="text-xs text-slate-400 dark:text-slate-500 pt-12">
          &copy; {new Date().getFullYear()} University Faculty System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
