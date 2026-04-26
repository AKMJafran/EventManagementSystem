import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import StudentLayout from '../components/layout/StudentLayout';
import AdminLayout from '../components/layout/AdminLayout';
import LecturerLayout from '../components/layout/LecturerLayout';
import EventImage from '../components/EventImage';

function EventDetailsContent({ event, loading, role }) {
  const backLink =
    role === 'ADMIN'
      ? '/manage-events'
      : role === 'LECTURER'
        ? '/lecturer/dashboard'
        : event?.status === 'PENDING'
          ? '/student/my-events'
          : '/student/dashboard';

  if (loading) {
    return <div className="py-16 text-center text-on-surface-variant">Loading event details...</div>;
  }

  if (!event) {
    return <div className="py-16 text-center text-on-surface-variant">Event details could not be found.</div>;
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Event Details</p>
          <h1 className="mt-3 text-4xl font-bold text-on-surface serif-heading">{event.title}</h1>
          <p className="mt-3 max-w-3xl text-on-surface-variant">{event.description || 'No event description was provided.'}</p>
        </div>
        <Link
          to={backLink}
          className="rounded-xl border border-outline-variant/30 px-4 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          Back
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-sm">
        <div className="relative h-72 md:h-[28rem]">
          <EventImage
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-8 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">{event.eventType || 'Event'}</p>
              <h2 className="mt-2 text-3xl font-bold serif-heading">{event.title}</h2>
            </div>
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur">
              {event.status}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-on-surface serif-heading">Overview</h3>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Venue</p>
              <p className="mt-2 text-base font-semibold text-on-surface">{event.venue}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Category</p>
              <p className="mt-2 text-base font-semibold text-on-surface">{event.categoryName || 'General'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Starts</p>
              <p className="mt-2 text-base font-semibold text-on-surface">{new Date(event.startTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Ends</p>
              <p className="mt-2 text-base font-semibold text-on-surface">{new Date(event.endTime).toLocaleString()}</p>
            </div>
          </div>
        </article>

        <aside className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="text-lg font-bold text-on-surface serif-heading">Image File</h3>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="font-bold uppercase tracking-[0.15em] text-on-surface-variant">File ID</dt>
              <dd className="mt-1 break-all text-on-surface">{event.imageId || 'No image attached'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.15em] text-on-surface-variant">Original Name</dt>
              <dd className="mt-1 text-on-surface">{event.imageOriginalFilename || 'Not available'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.15em] text-on-surface-variant">Type</dt>
              <dd className="mt-1 text-on-surface">{event.imageContentType || 'Not available'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.15em] text-on-surface-variant">Uploaded</dt>
              <dd className="mt-1 text-on-surface">
                {event.imageUploadedAt ? new Date(event.imageUploadedAt).toLocaleString() : 'Not available'}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="text-lg font-bold text-on-surface serif-heading">Status History</h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            A quick audit trail of the request lifecycle and any admin decision notes.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Submitted</p>
              <p className="mt-2 font-semibold text-on-surface">
                {event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Submission timestamp unavailable'}
              </p>
            </div>

            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Current Status</p>
              <p className="mt-2 font-semibold text-on-surface">{event.status}</p>
            </div>

            {event.rejectReason && (
              <div className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  {event.status === 'CANCELLED' ? 'Removal Reason' : 'Decision Reason'}
                </p>
                <p className="mt-2 text-sm leading-7 text-on-surface">
                  {event.rejectReason}
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="text-lg font-bold text-on-surface serif-heading">Admin Notes</h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            Context shown here reflects the latest review outcome recorded for this event.
          </p>

          <div className="mt-6 rounded-2xl bg-surface-container-low p-4">
            {event.status === 'APPROVED' && (
              <p className="text-sm leading-7 text-on-surface">
                This event is approved and active on the schedule.
              </p>
            )}

            {event.status === 'PENDING' && (
              <p className="text-sm leading-7 text-on-surface">
                This request is still waiting for admin review.
              </p>
            )}

            {event.status === 'REJECTED' && (
              <p className="text-sm leading-7 text-on-surface">
                The request was rejected. Review the decision reason for the most recent admin feedback.
              </p>
            )}

            {event.status === 'CANCELLED' && (
              <p className="text-sm leading-7 text-on-surface">
                This event was removed from the active schedule. If a removal reason is available, it appears in the status history.
              </p>
            )}
          </div>
        </article>
      </section>

      {event.conflictDetails?.length > 0 && (
        <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="text-lg font-bold text-on-surface serif-heading">Conflict Review</h3>
          <p className="mt-2 text-sm text-on-surface-variant">Current scheduling warnings tied to this event.</p>
          <div className="mt-5 space-y-3">
            {event.conflictDetails.map((conflict) => (
              <div key={`${event.id}-${conflict.conflictingEventId}-${conflict.conflictType}`} className="rounded-2xl bg-surface-container-low p-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  {conflict.severity?.replaceAll('_', ' ')}
                </div>
                <h4 className="mt-2 font-semibold text-on-surface">{conflict.conflictingEventTitle}</h4>
                <p className="mt-1 text-sm text-on-surface-variant">{conflict.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      try {
        const response = await axiosInstance.get(`/events/${id}`);
        if (!cancelled) {
          setEvent(response.data);
        }
      } catch (error) {
        toast.error('Failed to load event details');
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (user?.role === 'ADMIN') {
    return (
      <AdminLayout>
        <EventDetailsContent event={event} loading={loading} role={user?.role} />
      </AdminLayout>
    );
  }

  if (user?.role === 'LECTURER') {
    return (
      <LecturerLayout>
        <EventDetailsContent event={event} loading={loading} role={user?.role} />
      </LecturerLayout>
    );
  }

  return (
    <StudentLayout user={user}>
      <EventDetailsContent event={event} loading={loading} role={user?.role} />
    </StudentLayout>
  );
}
