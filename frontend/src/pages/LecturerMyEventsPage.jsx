import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LecturerLayout from '../components/layout/LecturerLayout';
import ModalPortal from '../components/ui/ModalPortal';
import { cancelEvent, getMyEvents } from '../api/eventApi';
import {
  canEditLecturerEvent,
  formatEventDate,
  getApprovalStageMeta,
} from '../components/events/eventFormShared';

function CancelDialog({ open, onClose, onConfirm, title }) {
  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Cancel Event</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Are you sure you want to cancel <span className="font-semibold text-slate-900">{title}</span>?
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

export default function LecturerMyEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);

  async function loadEvents() {
    try {
      const response = await getMyEvents();
      setEvents(response.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load your events.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

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
    <LecturerLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-teal-950 md:text-5xl">My Events</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Review the departmental events you have submitted and track each request through Dean approval.
            </p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-2xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-800/15 transition hover:bg-teal-700"
            to="/lecturer/create-event"
          >
            Create Event
          </Link>
        </section>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading your events...</div>
        ) : events.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">You haven't created any departmental events yet.</h2>
            <p className="mt-3 text-base text-slate-600">
              Start your first departmental event request and send it to the Dean for review.
            </p>
            <Link
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              to="/lecturer/create-event"
            >
              Create Your First Event
            </Link>
          </section>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => {
              const approvalMeta = getApprovalStageMeta(event);
              const canCancel = event.status === 'PENDING' || event.status === 'APPROVED';

              return (
                <article
                  key={event.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">{event.title}</h2>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${approvalMeta.pillClass}`}
                        >
                          <span className="material-symbols-outlined text-base">{approvalMeta.icon}</span>
                          {approvalMeta.label}
                        </span>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <p>
                          <span className="font-semibold text-slate-800">Department:</span>{' '}
                          {event.departmentName || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Category:</span>{' '}
                          {event.categoryName || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Venue:</span> {event.venue || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Date:</span>{' '}
                          {formatEventDate(event.startTime)}
                        </p>
                      </div>

                      {event.status === 'REJECTED' && event.rejectReason && (
                        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                          Rejected: {event.rejectReason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {canEditLecturerEvent(event) && (
                        <button
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => navigate(`/lecturer/edit-event/${event.id}`)}
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
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <CancelDialog
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelEvent}
        open={Boolean(cancelTarget)}
        title={cancelTarget?.title}
      />
    </LecturerLayout>
  );
}
