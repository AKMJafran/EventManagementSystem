import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import StudentLayout from '../components/layout/StudentLayout';
import AdminLayout from '../components/layout/AdminLayout';
import LecturerLayout from '../components/layout/LecturerLayout';

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildMonthGrid(date) {
  const first = startOfMonth(date);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function sameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function tone(event) {
  if (event.conflictStatus === 'HARD_CONFLICT') return 'bg-error';
  if (event.conflictStatus === 'POTENTIAL_CONFLICT') return 'bg-amber-500';
  if (event.ownedByCurrentUser && event.status === 'PENDING') return 'bg-amber-500';
  if (event.ownedByCurrentUser) return 'bg-primary';
  if (event.attending) return 'bg-secondary';
  return 'bg-tertiary';
}

function formatEventWindow(event) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return `${start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function CalendarPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isLecturer = user?.role === 'LECTURER';
  const dashboardLink = isAdmin ? '/admin/dashboard' : isLecturer ? '/lecturer/dashboard' : '/student/dashboard';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthGrid = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  useEffect(() => {
    async function fetchCalendar() {
      setLoading(true);
      try {
        const start = startOfMonth(currentMonth).toISOString().slice(0, 10);
        const end = endOfMonth(currentMonth).toISOString().slice(0, 10);

        if (isAdmin || isLecturer) {
          const response = await axiosInstance.get('/events/calendar', { params: { start, end } });
          setEvents(response.data || []);
          setReminders([]);
          setAlerts([]);
        } else {
          const response = await axiosInstance.get('/events/student/calendar-feed', { params: { start, end } });
          setEvents(response.data?.events || []);
          setReminders(response.data?.reminders || []);
          setAlerts(response.data?.overlapAlerts || []);
        }
      } catch (error) {
        toast.error('Failed to load calendar');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendar();
    }, [currentMonth, isAdmin, isLecturer]);

  const content = (
    <div className="mx-auto w-full max-w-[1440px] p-8 md:p-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link to={dashboardLink} className="text-sm font-semibold text-on-surface-variant hover:text-primary">
            Back to Dashboard
          </Link>
          <h1 className="mt-3 text-5xl font-bold text-on-surface">Event Calendar</h1>
          <p className="mt-2 max-w-3xl text-on-surface-variant">
            {isAdmin ? 'Review the institution-wide schedule.' : 'Track approved events, your requests, and alerts for overlapping commitments.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.85fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold text-teal-900">
                {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-sm text-on-surface-variant">Click any event to inspect its details.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
              {!isAdmin && !isLecturer && <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> My event</span>}
              {!isAdmin && !isLecturer && <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-secondary" /> Registered</span>}
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-tertiary" /> Approved</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-error" /> Hard conflict</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthGrid.map((day) => {
              const dayEvents = events.filter((event) => sameDay(new Date(event.startTime), day));
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = sameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] rounded-2xl border p-3 ${isCurrentMonth ? 'border-outline-variant/30 bg-surface-container-lowest' : 'border-transparent bg-surface-container-low opacity-45'}`}
                >
                  <div className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-on-surface'}`}>{day.getDate()}</div>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="block w-full rounded-xl bg-surface-container-high px-2 py-1 text-left text-[11px] text-on-surface"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${tone(event)}`} />
                          <span className="truncate font-semibold">{event.title}</span>
                        </div>
                      </button>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[10px] text-on-surface-variant">+{dayEvents.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          {!isAdmin && !isLecturer && (
            <>
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-serif font-bold text-teal-900">Reminders</h2>
                <div className="mt-5 space-y-3">
                  {reminders.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No reminders this month.</p>
                  ) : (
                    reminders.slice(0, 5).map((reminder) => (
                      <div key={`${reminder.eventId}-${reminder.reminderType}`} className="rounded-2xl bg-surface-container-low p-4">
                        <h3 className="font-semibold text-on-surface">{reminder.eventTitle}</h3>
                        <p className="mt-1 text-xs text-on-surface-variant">{reminder.message}</p>
                        <p className="mt-2 text-xs text-on-surface-variant">{new Date(reminder.startTime).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-serif font-bold text-teal-900">Calendar Alerts</h2>
                <div className="mt-5 space-y-3">
                  {alerts.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No overlap alerts.</p>
                  ) : (
                    alerts.map((alert) => (
                      <div key={`${alert.primaryEventId}-${alert.relatedEventId}`} className="rounded-2xl bg-error-container/60 p-4 text-on-error-container">
                        <div className="text-xs font-bold uppercase tracking-[0.2em]">{alert.severity.replaceAll('_', ' ')}</div>
                        <p className="mt-2 text-sm font-semibold">{alert.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-teal-900">Month Snapshot</h2>
            {loading ? (
              <p className="mt-5 text-sm text-on-surface-variant">Loading calendar details...</p>
            ) : (
              <div className="mt-5 space-y-4 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between">
                  <span>Events in month</span>
                  <span className="font-semibold text-on-surface">{events.length}</span>
                </div>
              {!isAdmin && !isLecturer && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>My pending requests</span>
                      <span className="font-semibold text-on-surface">{events.filter((event) => event.ownedByCurrentUser && event.status === 'PENDING').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Conflict warnings</span>
                      <span className="font-semibold text-on-surface">{events.filter((event) => event.conflictStatus !== 'NO_CONFLICT').length}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif font-bold text-teal-900">{selectedEvent.title}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">{selectedEvent.description || 'No event description available.'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-3xl bg-surface-container-low p-6 text-sm text-on-surface md:grid-cols-2">
              <div><span className="font-semibold">Date & time:</span> {formatEventWindow(selectedEvent)}</div>
              <div><span className="font-semibold">Venue:</span> {selectedEvent.venue}</div>
              <div><span className="font-semibold">Status:</span> {selectedEvent.status}</div>
              <div><span className="font-semibold">Conflict state:</span> {selectedEvent.conflictStatus?.replaceAll('_', ' ')}</div>
              {selectedEvent.calendarLabel && <div><span className="font-semibold">Calendar label:</span> {selectedEvent.calendarLabel.replaceAll('_', ' ')}</div>}
              {selectedEvent.createdByName && <div><span className="font-semibold">Organizer:</span> {selectedEvent.createdByName}</div>}
            </div>

            {selectedEvent.conflictDetails?.length > 0 && (
              <div className="mt-6 space-y-3">
                {selectedEvent.conflictDetails.map((conflict) => (
                  <div key={`${selectedEvent.id}-${conflict.conflictingEventId}-${conflict.conflictType}`} className="rounded-2xl bg-surface-container-low p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">{conflict.severity.replaceAll('_', ' ')}</div>
                    <p className="mt-2 text-sm text-on-surface">{conflict.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isAdmin) {
    return <AdminLayout>{content}</AdminLayout>;
  }

  if (isLecturer) {
    return <LecturerLayout>{content}</LecturerLayout>;
  }

  return <StudentLayout user={user}>{content}</StudentLayout>;
}
