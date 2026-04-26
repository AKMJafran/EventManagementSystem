import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import DashboardEventCard from '../components/events/DashboardEventCard';
import LecturerLayout from '../components/layout/LecturerLayout';
import EmptyStatePanel from '../components/ui/EmptyStatePanel';
import { normalizeEventCollection } from '../utils/eventData';

function formatDateRange(event) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : null;
  const startLabel = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (!end || Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function LecturerDashboard() {
  const { user } = useAuthStore();
  const [clubs, setClubs] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const startDate = today.toISOString().slice(0, 10);
        const endDate = nextWeek.toISOString().slice(0, 10);

        const [clubsRes, pendingRes, eventsRes] = await Promise.all([
          axiosInstance.get('/lecturer/clubs').catch(() => ({ data: [] })),
          axiosInstance.get('/lecturer/events/pending-approval').catch(() => ({ data: [] })),
          axiosInstance.get('/events', { params: { status: 'APPROVED', startDate, endDate } }).catch(() => ({ data: [] })),
        ]);

        setClubs(clubsRes.data || []);
        setPendingApprovals(pendingRes.data || []);
        const eventsData = normalizeEventCollection(eventsRes.data);
        setUpcomingEvents(eventsData.slice(0, 5));
      } catch (error) {
        toast.error('Failed to load dashboard data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <LecturerLayout>
        <div className="py-16 text-center text-on-surface-variant">Loading dashboard...</div>
      </LecturerLayout>
    );
  }

  return (
    <LecturerLayout>
      <section className="mb-10">
        <h1 className="text-5xl font-bold text-primary serif-heading">Lecturer Dashboard</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Welcome back, {user?.name || 'Lecturer'}. Manage your clubs and review pending event approvals.
        </p>
      </section>

      {/* Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-3 mb-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-700">groups</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Clubs I Oversee</p>
              <p className="text-3xl font-bold text-on-surface">{clubs.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-700">pending_actions</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Pending Approvals</p>
              <p className="text-3xl font-bold text-on-surface">{pendingApprovals.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-700">event_upcoming</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Upcoming Events</p>
              <p className="text-3xl font-bold text-on-surface">{upcomingEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-serif font-bold text-teal-900">Pending My Approval</h2>
            <Link to="/lecturer/pending-approvals" className="text-sm font-semibold text-primary">View all</Link>
          </div>
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <EmptyStatePanel
                icon="task_alt"
                title="Nothing pending right now"
                message="Club event approvals assigned to you will appear here when they need review."
              />
            ) : (
              pendingApprovals.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-2xl bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-on-surface">{event.title}</h3>
                      <p className="mt-1 text-xs text-on-surface-variant">{event.clubName || 'Club event'}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{formatDateRange(event)}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase text-amber-700">Pending</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* My Clubs */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-serif font-bold text-teal-900">My Clubs</h2>
            <Link to="/lecturer/my-clubs" className="text-sm font-semibold text-primary">View all</Link>
          </div>
          <div className="space-y-3">
            {clubs.length === 0 ? (
              <EmptyStatePanel
                icon="group_off"
                title="No club assignments yet"
                message="Once you are assigned as a Senior Treasurer, your clubs will be listed here."
              />
            ) : (
              clubs.slice(0, 4).map((club) => (
                <div key={club.id} className="rounded-2xl bg-surface-container-low p-4">
                  <h3 className="font-semibold text-on-surface">{club.name}</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">{club.type || 'Student Club'}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Upcoming Events */}
      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-teal-900">Upcoming Events (Next 7 Days)</h2>
          <Link to="/lecturer/calendar" className="text-sm font-semibold text-primary">Open calendar</Link>
        </div>
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <EmptyStatePanel
              icon="event_available"
              title="No approved events in the next 7 days"
              message="Upcoming faculty events will appear here once new approved schedules are available."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {upcomingEvents.map((event) => (
                <DashboardEventCard
                  key={event.id}
                  event={event}
                  to={`/events/${event.id}`}
                  badgeLabel="APPROVED"
                  supportingText={event.createdByName || event.categoryName || 'Faculty event'}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </LecturerLayout>
  );
}
