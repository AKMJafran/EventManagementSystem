import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import DashboardEventCard from '../components/events/DashboardEventCard';
import StudentLayout from '../components/layout/StudentLayout';
import EmptyStatePanel from '../components/ui/EmptyStatePanel';
import { normalizeEventCollection } from '../utils/eventData';

function buildMonthGrid(baseDate) {
  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function sameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDateRange(event) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : null;
  const startLabel = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (!end || Number.isNaN(end.getTime())) {
    return startLabel;
  }
  return `${startLabel} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function statusTone(status) {
  switch (status) {
    case 'APPROVED':
      return 'bg-secondary-container text-on-secondary-container';
    case 'PENDING':
      return 'bg-amber-100 text-amber-900';
    case 'REJECTED':
      return 'bg-error-container text-on-error-container';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
}

function calendarTone(event) {
  if (event.ownedByCurrentUser && event.status === 'PENDING') return 'bg-amber-500';
  if (event.ownedByCurrentUser) return 'bg-primary';
  if (event.attending) return 'bg-secondary';
  return 'bg-tertiary';
}

export default function StudentDashboard() {
  const { user, isAuthenticated, authLoaded } = useAuthStore();
  const [dashboardMonth] = useState(() => new Date());
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [calendarFeed, setCalendarFeed] = useState({ events: [], reminders: [], overlapAlerts: [] });
  const [loading, setLoading] = useState(true);

  const monthGrid = useMemo(() => buildMonthGrid(dashboardMonth), [dashboardMonth]);

  useEffect(() => {
    if (!authLoaded || !isAuthenticated) {
      return;
    }

    async function fetchData() {
      try {
        const firstDay = new Date(dashboardMonth.getFullYear(), dashboardMonth.getMonth(), 1).toISOString().slice(0, 10);
        const lastDay = new Date(dashboardMonth.getFullYear(), dashboardMonth.getMonth() + 1, 0).toISOString().slice(0, 10);

        const [approvedRes, myRes, calendarRes] = await Promise.all([
          axiosInstance.get('/events', { params: { status: 'APPROVED', startDate: firstDay, endDate: lastDay } }),
          axiosInstance.get('/events/user/my-events').catch(() => ({ data: [] })),
          axiosInstance.get('/events/student/calendar-feed', { params: { start: firstDay, end: lastDay } }),
        ]);

        const approvedData = normalizeEventCollection(approvedRes.data);
        const myData = normalizeEventCollection(myRes.data);
        setApprovedEvents(approvedData.slice(0, 3));
        setMyEvents(myData.slice(0, 4));
        setCalendarFeed(calendarRes.data || { events: [], reminders: [], overlapAlerts: [] });
      } catch (error) {
        toast.error('Failed to load dashboard data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [authLoaded, dashboardMonth, isAuthenticated, user]);

  if (loading) {
    return (
      <StudentLayout user={user}>
        <div className="py-16 text-center text-on-surface-variant">Loading dashboard...</div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout user={user}>
      <section className="mb-10">
        <h1 className="text-5xl font-bold text-primary serif-heading">Student Event Dashboard</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Track approved events, pending requests, and scheduling alerts in one place.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold text-teal-900">This Month</h2>
              <p className="text-sm text-on-surface-variant">Approved events, your requests, and registered sessions.</p>
            </div>
            <Link to="/student/calendar" className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface">
              Open Calendar
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label} className="py-2">{label}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthGrid.map((date) => {
              const events = calendarFeed.events.filter((event) => sameDay(new Date(event.startTime), date));
              const isCurrentMonth = date.getMonth() === dashboardMonth.getMonth();
              const isToday = sameDay(date, new Date());

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[104px] rounded-2xl border p-3 ${isCurrentMonth ? 'border-outline-variant/30 bg-surface-container-lowest' : 'border-transparent bg-surface-container-low opacity-50'}`}
                >
                  <div className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-on-surface'}`}>{date.getDate()}</div>
                  <div className="mt-2 space-y-1">
                    {events.slice(0, 3).map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="block rounded-xl bg-surface-container-high px-2 py-1 text-left text-[11px] text-on-surface"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${calendarTone(event)}`} />
                          <span className="truncate font-semibold">{event.title}</span>
                        </div>
                      </Link>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-teal-900">Upcoming Reminders</h2>
            <div className="mt-5 space-y-3">
              {calendarFeed.reminders.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No reminders for the next seven days.</p>
              ) : (
                calendarFeed.reminders.slice(0, 4).map((reminder) => (
                  <div key={`${reminder.eventId}-${reminder.reminderType}`} className="rounded-2xl bg-surface-container-low p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-on-surface">{reminder.eventTitle}</h3>
                        <p className="mt-1 text-xs text-on-surface-variant">{reminder.message}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusTone(reminder.status)}`}>
                        {reminder.status}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-on-surface-variant">{formatDateRange(reminder)}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-teal-900">Overlap Alerts</h2>
            <div className="mt-5 space-y-3">
              {calendarFeed.overlapAlerts.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No overlapping events involving you.</p>
              ) : (
                calendarFeed.overlapAlerts.slice(0, 3).map((alert) => (
                  <div key={`${alert.primaryEventId}-${alert.relatedEventId}`} className="rounded-2xl bg-error-container/60 p-4 text-on-error-container">
                    <div className="text-xs font-bold uppercase tracking-[0.2em]">{alert.severity.replaceAll('_', ' ')}</div>
                    <p className="mt-2 text-sm font-semibold">{alert.summary}</p>
                    <p className="mt-2 text-xs">{new Date(alert.startTime).toLocaleString()} - {new Date(alert.endTime).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold text-teal-900">Approved Events</h2>
            <Link to="/student/calendar" className="text-sm font-semibold text-primary">See all</Link>
          </div>
          <div className="space-y-4">
            {approvedEvents.length === 0 ? (
              <EmptyStatePanel
                icon="event_busy"
                title="No approved events yet"
                message="Approved events for this month will appear here once the schedule is finalized."
              />
            ) : (
              approvedEvents.map((event) => (
                <DashboardEventCard
                  key={event.id}
                  event={event}
                  to={`/events/${event.id}`}
                  badgeLabel={event.calendarLabel || 'APPROVED'}
                  supportingText={event.categoryName || 'Faculty event'}
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold text-teal-900">My Requests</h2>
            <Link to="/student/my-events" className="text-sm font-semibold text-primary">See history</Link>
          </div>
          <div className="space-y-4">
            {myEvents.length === 0 ? (
              <EmptyStatePanel
                icon="note_add"
                title="No requests yet"
                message="Create your first event request to start tracking reviews, conflicts, and approvals here."
              />
            ) : (
              myEvents.map((event) => (
                <DashboardEventCard
                  key={event.id}
                  event={event}
                  to={`/events/${event.id}`}
                  badgeLabel={event.status}
                  badgeClassName={statusTone(event.status)}
                  supportingText={event.conflictDetails?.[0]?.summary || event.categoryName || 'Event request'}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}
