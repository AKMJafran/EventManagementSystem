import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, conflicts: 0 });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const eventsRes = await axiosInstance.get('/events');
        const allEvents = eventsRes.data.content || eventsRes.data || [];
        const total = allEvents.length;
        const pendingEvents = allEvents.filter(e => e.status === 'PENDING');
        
        const conflictsRes = await axiosInstance.get('/events/admin/conflicts').catch(() => ({ data: [] }));
        
        setStats({ total, pending: pendingEvents.length, conflicts: conflictsRes.data?.length || 0 });
        setPendingApprovals(pendingEvents);
      } catch (e) {
        toast.error('Failed to load admin stats');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <AdminLayout>
      {/* Editorial Header */}
      <header className="mb-16">
        <div className="flex justify-between items-end">
          <div className="max-w-2xl">
            <h2 className="text-5xl font-bold tracking-tight text-primary mb-4 serif-heading">Institutional Overview</h2>
            <p className="text-on-surface-variant text-lg leading-relaxed font-light">
              Welcome back, Dean. Here is the pulse of the faculty activities for the week. 
              You have <span className="font-semibold text-tertiary">{stats.pending} events</span> requiring immediate academic review.
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="bg-surface-container-low px-6 py-3 rounded-xl flex items-center gap-4">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Today's Date</p>
                <p className="text-sm font-bold">{today}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid Statistics */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between group hover:bg-primary transition-all duration-300 shadow-sm border border-outline-variant/10">
          <span className="material-symbols-outlined text-primary group-hover:text-white text-3xl mb-4">hub</span>
          <div>
            <p className="text-4xl font-bold group-hover:text-white">{stats.total}</p>
            <p className="text-sm font-medium text-on-surface-variant group-hover:text-primary-fixed-dim tracking-wide">Total Events</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between group hover:bg-tertiary transition-all duration-300 shadow-sm border border-outline-variant/10">
          <span className="material-symbols-outlined text-tertiary group-hover:text-white text-3xl mb-4">pending_actions</span>
          <div>
            <p className="text-4xl font-bold group-hover:text-white">{stats.pending}</p>
            <p className="text-sm font-medium text-on-surface-variant group-hover:text-tertiary-fixed tracking-wide">Pending Approvals</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between group hover:bg-primary transition-all duration-300 shadow-sm border border-outline-variant/10">
          <span className="material-symbols-outlined text-primary group-hover:text-white text-3xl mb-4">gavel</span>
          <div>
            <p className="text-4xl font-bold group-hover:text-white">{stats.conflicts}</p>
            <p className="text-sm font-medium text-on-surface-variant group-hover:text-primary-fixed-dim tracking-wide">Reported Conflicts</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between group hover:bg-secondary transition-all duration-300 shadow-sm border border-outline-variant/10">
          <span className="material-symbols-outlined text-secondary group-hover:text-white text-3xl mb-4">leaderboard</span>
          <div>
            <p className="text-4xl font-bold group-hover:text-white">82%</p>
            <p className="text-sm font-medium text-on-surface-variant group-hover:text-secondary-fixed tracking-wide">Venue Utilization</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Pending Approvals - Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold serif-heading">Pending Approvals</h3>
            <Link to="/manage-events" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
              View All Requests <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <p className="text-on-surface-variant italic">Loading...</p>
            ) : pendingApprovals.length === 0 ? (
              <p className="text-on-surface-variant italic">No pending approvals right now.</p>
            ) : (
              pendingApprovals.slice(0, 3).map(event => (
                <div key={event.id} className="bg-surface-container-low p-6 rounded-xl flex items-center justify-between transition-transform hover:-translate-y-1">
                  <div className="flex items-center gap-6">
                    <div className="w-1 bg-tertiary h-12 rounded-full"></div>
                    <div>
                      <h4 className="font-bold text-lg">{event.title}</h4>
                      <p className="text-sm text-on-surface-variant">by {event.creator?.name || 'User'} • {new Date(event.date || event.startTime).toLocaleDateString()}</p>
                      <div className="mt-2 flex gap-2">
                        <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-wider">{event.category?.name || 'Event'}</span>
                        <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-wider">{event.venue}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link to={`/manage-events`} className="px-4 py-2 text-primary font-bold text-sm hover:bg-primary-fixed-dim rounded-lg transition-colors">Review</Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions Layout */}
          <div className="pt-8">
            <h3 className="text-xl font-bold serif-heading mb-6">Administrative Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/manage-categories" className="flex items-center gap-4 p-6 bg-white border border-outline-variant/10 rounded-xl hover:shadow-xl hover:shadow-primary/5 transition-all text-left">
                <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">category</span>
                </div>
                <div>
                  <p className="font-bold">Edit Categories</p>
                  <p className="text-xs text-on-surface-variant">Update faculty event types</p>
                </div>
              </Link>
              <Link to="/admin/reports/monthly" className="flex items-center gap-4 p-6 bg-white border border-outline-variant/10 rounded-xl hover:shadow-xl hover:shadow-primary/5 transition-all text-left">
                <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">file_download</span>
                </div>
                <div>
                  <p className="font-bold">Generate Reports</p>
                  <p className="text-xs text-on-surface-variant">Monthly utilization & engagement</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Calendar Sidebar Widget */}
        <div className="space-y-8">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl shadow-primary/5 overflow-hidden border border-outline-variant/10">
            <div className="bg-teal-gradient p-8 text-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Academic Calendar</h3>
                <span className="material-symbols-outlined">more_vert</span>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold opacity-70 uppercase tracking-widest mb-4">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium">
                <span className="opacity-30">12</span>
                <span className="opacity-30">13</span>
                <span className="bg-white text-primary w-8 h-8 flex items-center justify-center rounded-full mx-auto font-bold shadow-lg">14</span>
                <span>15</span>
                <span>16</span>
                <span className="relative">17<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-tertiary-fixed rounded-full"></div></span>
                <span>18</span>
                <span>19</span>
                <span>20</span>
                <span className="relative">21<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-tertiary-fixed rounded-full"></div></span>
                <span>22</span>
                <span>23</span>
                <span>24</span>
                <span>25</span>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Today's Schedule</p>
              <div className="space-y-6 relative">
                <div className="flex gap-4">
                  <div className="text-right w-12 pt-1">
                    <p className="text-[10px] font-bold text-primary">09:00</p>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold">Board of Regents Meeting</p>
                    <p className="text-xs text-on-surface-variant">Executive Suite • Room 101</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right w-12 pt-1">
                    <p className="text-[10px] font-bold text-primary">12:30</p>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold">Lunch with Alumni Assoc.</p>
                    <p className="text-xs text-on-surface-variant">University Dining Hall</p>
                  </div>
                </div>
              </div>
              <Link to="/student/calendar" className="block text-center w-full py-3 border border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                Full Calendar View
              </Link>
            </div>
          </div>

          {/* Featured Venue Card */}
          <div className="relative h-48 rounded-2xl overflow-hidden group">
            <img 
              alt="University Hallway" 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQPupxUnyGvXxMtbSGsPk-6TixkAN5pQxdZBGGy1TsSeazi6G9BayZHEdydTq41ZZpJ0qDGLGNunabob74sPyi6FdoLfYw0f2GUFaH8fK8rdfMKpjuvS-7jypog1_Rjrc_cuSHXT1YD65G7Qim8x8wj9mAm7KFlaG6gHjSFAvLTnGsu6UCLfs_pHAZkFLeqLYnAuWNci5FvsprERp52XRhprGsZZe9wZjuA2lOdmf8j3ZH5rini0R3SsXWc58lOH9QauOhtk5us9UR"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-900/90 to-transparent p-6 flex flex-col justify-end">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Venue Highlight</p>
              <h4 className="text-white font-bold text-lg">Main Auditorium</h4>
              <p className="text-white/80 text-xs">Currently: Open for Bookings</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

