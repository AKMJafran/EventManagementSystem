import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import DashboardEventCard from '../components/events/DashboardEventCard';
import LecturerLayout from '../components/layout/LecturerLayout';
import EmptyStatePanel from '../components/ui/EmptyStatePanel';
import { normalizeEventCollection } from '../utils/eventData';

export default function LecturerEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await axiosInstance.get('/events', { params: { status: 'APPROVED' } });
        setEvents(normalizeEventCollection(response.data));
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
          Back to Dashboard
        </Link>
        <h1 className="mt-3 text-5xl font-bold text-primary serif-heading">Approved Events</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Browse all approved events across the Faculty of Technology with consistent image, date, and venue details.
        </p>
      </section>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant">Loading events...</div>
      ) : events.length === 0 ? (
        <EmptyStatePanel
          icon="event_busy"
          title="No approved events found"
          message="Approved faculty events will appear here once new schedules have been published."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
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
    </LecturerLayout>
  );
}
