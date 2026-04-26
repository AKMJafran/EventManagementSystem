import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import StudentLayout from '../components/layout/StudentLayout';
import EventImage from '../components/EventImage';
import ModalPortal from '../components/ui/ModalPortal';
import { cancelEvent, getMyEvents } from '../api/eventApi';
import useAuthStore from '../context/AuthContext';
import {
  canEditStudentEvent,
  formatEventDate,
  getApprovalStageMeta,
  getOrganizerTypeMeta,
} from '../components/events/eventFormShared';

function CancelDialog({ event, onClose, onConfirm }) {
  if (!event) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Cancel Event</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Are you sure you want to cancel <span className="font-semibold text-slate-900">{event.title}</span>?
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              No, Keep It
            </button>
            <button
              className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              onClick={onConfirm}
              type="button"
            >
              Yes, Cancel Event
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function MyEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  async function loadEvents() {
    try {
      const response = await getMyEvents();
      setEvents(response.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load events.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events
    .filter((event) => {
      if (statusFilter === 'ALL') return true;
      return event.status === statusFilter;
    })
    .filter((event) => {
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      const venueLabel =
        typeof event.venue === 'string' ? event.venue : event.venue?.name || event.venue?.label || '';
      return (
        event.title?.toLowerCase().includes(query) ||
        venueLabel.toLowerCase().includes(query) ||
        event.categoryName?.toLowerCase().includes(query)
      );
    })
    .sort((left, right) => new Date(right.startTime) - new Date(left.startTime));

  async function handleCancelEvent() {
    if (!cancelTarget) return;

    try {
      await cancelEvent(cancelTarget.id);
      toast.success('Event cancelled');
      setCancelTarget(null);
      setLoading(true);
      await loadEvents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to cancel event.');
      console.error(error);
    }
  }

  return (
    <StudentLayout user={user}>
      <div className="space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">My Events</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Track each personal and club event request from submission through approval, rejection, or cancellation.
            </p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-2xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-800/15 transition hover:bg-teal-700"
            to="/student/create-event"
          >
            Create Event
          </Link>
        </section>

        <section className="flex flex-col gap-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  statusFilter === status
                    ? 'bg-teal-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-sm">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, venue, or category"
              type="text"
              value={search}
            />
          </div>
        </section>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading your events...</div>
        ) : filteredEvents.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">No matching events found.</h2>
            <p className="mt-3 text-base text-slate-600">
              Create a new request or adjust your filters to see more events.
            </p>
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {filteredEvents.map((event) => {
              const organizerMeta = getOrganizerTypeMeta(event);
              const approvalMeta = getApprovalStageMeta(event);
              const canCancel = event.status === 'PENDING' || event.status === 'APPROVED';

              return (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative h-52">
                    <EventImage alt={event.title} className="h-full w-full object-cover" src={event.imageUrl} />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/65 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${organizerMeta.badgeClass}`}
                      >
                        <span className="material-symbols-outlined text-sm">{organizerMeta.icon}</span>
                        {event.organizerType === 'CLUB_EVENT' && event.clubName
                          ? event.clubName
                          : organizerMeta.shortLabel}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${approvalMeta.pillClass}`}
                      >
                        <span className="material-symbols-outlined text-sm">{approvalMeta.icon}</span>
                        {approvalMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-5 p-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{event.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {event.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-800">Category:</span> {event.categoryName || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Venue:</span> {event.venue || '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Start:</span> {formatEventDate(event.startTime)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">End:</span> {formatEventDate(event.endTime)}
                      </p>
                    </div>

                    {event.status === 'REJECTED' && event.rejectReason && (
                      <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                        Reason: {event.rejectReason}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                      {canEditStudentEvent(event) && (
                        <button
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => navigate(`/student/edit-event/${event.id}`)}
                          type="button"
                        >
                          Edit
                        </button>
                      )}
                      {canCancel && (
                        <button
                          className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                          onClick={() => setCancelTarget(event)}
                          type="button"
                        >
                          Cancel Event
                        </button>
                      )}
                      <button
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        onClick={() => navigate(`/events/${event.id}`)}
                        type="button"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <CancelDialog event={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancelEvent} />
    </StudentLayout>
  );
}
