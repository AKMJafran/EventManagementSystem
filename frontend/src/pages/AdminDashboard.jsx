import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import DashboardEventCard from '../components/events/DashboardEventCard';
import DashboardEventCardSkeleton from '../components/events/DashboardEventCardSkeleton';
import EmptyStatePanel from '../components/ui/EmptyStatePanel';
import { normalizeEventCollection } from '../utils/eventData';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, conflicts: 0 });
  const [reportStats, setReportStats] = useState({
    approvalRate: 0,
    upcoming: 0,
    completed: 0,
    registrations: 0,
  });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const eventsRes = await axiosInstance.get('/events');
        const allEvents = normalizeEventCollection(eventsRes.data);
        const pendingEvents = allEvents.filter((event) => event.status === 'PENDING');
        const conflictsRes = await axiosInstance.get('/events/admin/conflicts').catch(() => ({ data: [] }));

        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const to = today.toISOString().slice(0, 10);
        const analyticsRes = await axiosInstance.get('/events/reports/analytics', {
          params: { from, to },
        }).catch(() => ({ data: {} }));

        setStats({
          total: allEvents.length,
          pending: pendingEvents.length,
          conflicts: conflictsRes.data?.length || 0,
        });
        setReportStats({
          approvalRate: analyticsRes.data?.approvalRate || 0,
          upcoming: analyticsRes.data?.upcomingEvents || 0,
          completed: analyticsRes.data?.completedEvents || 0,
          registrations: analyticsRes.data?.totalRegistrations || 0,
        });
        setPendingApprovals(pendingEvents.slice(0, 3));
      } catch (error) {
        toast.error('Failed to load admin stats');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <AdminLayout>
      <div className="space-y-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Admin Overview</p>
            <h1 className="mt-3 text-5xl font-bold tracking-tight text-primary serif-heading">Institutional Overview</h1>
            <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
              Welcome back. You currently have <span className="font-semibold text-tertiary">{stats.pending}</span> event requests waiting for academic review.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-outline-variant/20 bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Today</p>
            <p className="mt-2 text-lg font-semibold text-on-surface">{today}</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Events',
              value: stats.total,
              detail: 'All event records currently in the system.',
              icon: 'hub',
              accent: 'text-primary',
            },
            {
              label: 'Pending Approvals',
              value: stats.pending,
              detail: 'Requests that still need an admin decision.',
              icon: 'pending_actions',
              accent: 'text-tertiary',
            },
            {
              label: 'Reported Conflicts',
              value: stats.conflicts,
              detail: 'Requests with unresolved venue or schedule issues.',
              icon: 'gavel',
              accent: 'text-primary',
            },
            {
              label: 'Approval Rate',
              value: `${reportStats.approvalRate}%`,
              detail: 'Current monthly approval rate.',
              icon: 'leaderboard',
              accent: 'text-secondary',
            },
          ].map((card) => (
            <article key={card.label} className="rounded-[1.75rem] border border-outline-variant/15 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">{card.label}</p>
                  <p className="mt-4 text-4xl font-bold text-on-surface">{card.value}</p>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">{card.detail}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-low ${card.accent}`}>
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Upcoming Events', value: reportStats.upcoming, detail: 'Approved events scheduled ahead.' },
            { label: 'Completed Events', value: reportStats.completed, detail: 'Approved events that already finished.' },
            { label: 'Registrations', value: reportStats.registrations, detail: 'Participation across this month.' },
          ].map((card) => (
            <article key={card.label} className="rounded-[1.75rem] border border-outline-variant/15 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-on-surface">{card.value}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{card.detail}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface serif-heading">Pending Approvals</h2>
                <p className="mt-2 text-sm text-on-surface-variant">Recent requests waiting for review with images, schedule, and venue details intact.</p>
              </div>
              <Link to="/manage-events" className="text-sm font-semibold text-primary hover:underline">
                View all requests
              </Link>
            </div>

            <div className="space-y-4">
              {loading ? (
                <>
                  <DashboardEventCardSkeleton />
                  <DashboardEventCardSkeleton />
                </>
              ) : pendingApprovals.length === 0 ? (
                <EmptyStatePanel
                  icon="task_alt"
                  title="No pending approvals"
                  message="New student requests will appear here as soon as they enter the review queue."
                />
              ) : (
                pendingApprovals.map((event) => (
                  <DashboardEventCard
                    key={event.id}
                    event={event}
                    to="/manage-events"
                    badgeLabel="PENDING"
                    badgeClassName="bg-amber-100 text-amber-800"
                    supportingText={`${event.createdByName || 'Organizer'} • ${event.categoryName || 'Event'}`}
                  />
                ))
              )}
            </div>

            <div className="pt-4">
              <h3 className="mb-5 text-xl font-bold text-on-surface serif-heading">Administrative Quick Actions</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Link to="/manage-categories" className="flex items-center gap-4 rounded-[1.5rem] border border-outline-variant/15 bg-white p-6 shadow-sm transition hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">category</span>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Edit Categories</p>
                    <p className="text-xs text-on-surface-variant">Maintain event classification.</p>
                  </div>
                </Link>
                <Link to="/admin/reports/monthly" className="flex items-center gap-4 rounded-[1.5rem] border border-outline-variant/15 bg-white p-6 shadow-sm transition hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined">file_download</span>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Generate Reports</p>
                    <p className="text-xs text-on-surface-variant">Monthly utilization and exports.</p>
                  </div>
                </Link>
                <Link to="/admin/reports/analytics" className="flex items-center gap-4 rounded-[1.5rem] border border-outline-variant/15 bg-white p-6 shadow-sm transition hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-primary">
                    <span className="material-symbols-outlined">query_stats</span>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Analytics Hub</p>
                    <p className="text-xs text-on-surface-variant">Dive into trends and performance.</p>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-outline-variant/15 bg-white shadow-sm">
              <div className="bg-teal-gradient px-6 py-8 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Calendar Snapshot</p>
                <h3 className="mt-3 text-2xl font-bold">This Month at a Glance</h3>
                <p className="mt-2 text-sm text-white/80">Use the full calendar to inspect venue usage and approved activity timing.</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                    <div key={label} className="rounded-xl bg-surface-container-low py-3">{label}</div>
                  ))}
                </div>
                <Link
                  to="/admin/calendar"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/20 px-5 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                >
                  Open Full Calendar
                </Link>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[2rem] border border-outline-variant/15 bg-white shadow-sm">
              <img
                alt="Main Auditorium"
                className="h-52 w-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQPupxUnyGvXxMtbSGsPk-6TixkAN5pQxdZBGGy1TsSeazi6G9BayZHEdydTq41ZZpJ0qDGLGNunabob74sPyi6FdoLfYw0f2GUFaH8fK8rdfMKpjuvS-7jypog1_Rjrc_cuSHXT1YD65G7Qim8x8wj9mAm7KFlaG6gHjSFAvLTnGsu6UCLfs_pHAZkFLeqLYnAuWNci5FvsprERp52XRhprGsZZe9wZjuA2lOdmf8j3ZH5rini0R3SsXWc58lOH9QauOhtk5us9UR"
              />
              <div className="space-y-2 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Venue Highlight</p>
                <h3 className="text-2xl font-bold text-on-surface serif-heading">Main Auditorium</h3>
                <p className="text-sm text-on-surface-variant">Keep the venue directory current so bookings, approvals, and dashboard venue states stay reliable.</p>
                <Link to="/manage-venues" className="inline-flex text-sm font-semibold text-primary hover:underline">
                  Manage venues
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
