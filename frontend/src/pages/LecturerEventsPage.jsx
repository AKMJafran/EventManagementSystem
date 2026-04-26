import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import LecturerLayout from '../components/layout/LecturerLayout';

function formatDateRange(event) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : null;
  const startLabel = `${start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (!end || Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function LecturerEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await axiosInstance.get('/events', { params: { status: 'APPROVED' } });
        const data = response.data?.content || response.data || [];
        setEvents(data);
      } catch (error) {
        toast.error('Failed to load events');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <LecturerLayout>
      <section className="mb-8">
        <Link to="/lecturer/dashboard" className="text-sm font-semibold text-on-surface-variant hover:text-primary">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-3 text-5xl font-bold text-primary serif-heading">Approved Events</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Browse all approved events across the Faculty of Technology.
        </p>
      </section>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 shadow-sm text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">event_busy</span>
          <p className="text-lg font-semibold text-on-surface-variant">No approved events found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="rounded-3xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-on-surface">{event.title}</h3>
                <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase text-on-secondary-container shrink-0">
                  Approved
                </span>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-2 mb-3">
                {event.description || 'No description available.'}
              </p>
              <div className="space-y-1 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>{formatDateRange(event)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>{event.venue}</span>
                </div>
                {event.createdByName && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">person</span>
                    <span>{event.createdByName}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </LecturerLayout>
  );
}
