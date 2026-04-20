import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import StudentLayout from '../components/layout/StudentLayout';

export default function MyEventsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    async function fetchEvents() {
      try {
        const res = await axiosInstance.get('/events/user/my-events');
        setEvents(res.data);
      } catch (e) {
        toast.error('Failed to load events');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [user]);

  const searchLower = search.toLowerCase();

  const filteredEvents = events
    .filter((e) => {
      const now = Date.now();
      const eventTime = new Date(e.startTime).getTime();

      if (filter === 'Upcoming') return eventTime > now;
      if (filter === 'Past') return eventTime <= now;
      return true;
    })
    .filter((e) => {
      const title = e.title?.toLowerCase() || '';
      const venue =
        typeof e.venue === 'string'
          ? e.venue.toLowerCase()
          : e.venue?.name?.toLowerCase() || '';

      return title.includes(searchLower) || venue.includes(searchLower);
    })
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  const getStatusStyles = (status) => {
    switch (status) {
      case 'APPROVED':
        return { badge: 'bg-green-100 text-green-800', bar: 'bg-primary' };
      case 'PENDING':
        return {
          badge: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
          bar: 'bg-tertiary',
        };
      case 'REJECTED':
        return {
          badge: 'bg-error-container text-on-error-container',
          bar: 'bg-error',
        };
      default:
        return {
          badge: 'bg-surface-dim text-on-surface',
          bar: 'bg-outline',
        };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'event_available';
      case 'PENDING':
        return 'history';
      case 'REJECTED':
        return 'cancel';
      default:
        return 'event';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <StudentLayout user={user}>
      {/* Header */}
      <div className="mb-12">
        <h1 className="serif-authoritative text-4xl md:text-5xl font-bold text-on-background mb-4">
          My Events
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">
          Manage your academic engagements, workshops, and symposium registrations in one curated ledger.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
        <div className="flex items-center space-x-6">
          {['All', 'Upcoming', 'Past'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`font-semibold pb-1 transition-colors ${
                filter === type
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {type} Events
            </button>
          ))}
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-lg focus:ring-2 focus:ring-primary text-sm w-64"
            placeholder="Search events..."
            type="text"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">
            progress_activity
          </span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-on-surface-variant">No events found.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredEvents.map((event) => {
            const styles = getStatusStyles(event.status);

            return (
              <div
                key={event.id}
                className="group bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,101,101,0.08)]"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bar}`} />

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-4 ${styles.badge}`}>
                      {event.status}
                    </span>

                    <h3 className="text-2xl font-bold mb-2">{event.title}</h3>

                    {event.category && (
                      <p className="text-sm uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">category</span>
                        {event.category?.name || 'General'}
                      </p>
                    )}
                  </div>

                  <span className="material-symbols-outlined text-primary">
                    {getStatusIcon(event.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-6 text-sm">
                  <div>
                    📅 {formatDate(event.startTime)} — {formatDate(event.endTime)}
                  </div>
                  <div>
                    📍 {typeof event.venue === 'object'
                      ? event.venue?.name || 'Unknown Venue'
                      : event.venue || 'Unknown Venue'}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t">
                  {event.status === 'REJECTED' && event.rejectReason ? (
                    <p className="text-red-500 text-sm">
                      Reason: {event.rejectReason}
                    </p>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-xs italic">
                        {event.status === 'PENDING' && 'Awaiting Approval'}
                      </span>

                      {event.status === 'PENDING' ? (
                        <button
                          onClick={() => navigate(`/student/edit-event/${event.id}`)}
                          className="text-blue-600 text-sm font-semibold"
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="text-blue-600 text-sm font-semibold"
                        >
                          View
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
}