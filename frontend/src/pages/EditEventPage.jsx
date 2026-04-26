import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import StudentLayout from '../components/layout/StudentLayout';
import EventFormShell from '../components/events/EventFormShell';
import {
  baseEventSchema,
  eventBelongsToCurrentUser,
  getApprovalStageMeta,
  getOrganizerTypeMeta,
} from '../components/events/eventFormShared';
import { getEventById, updateEvent as updateEventRequest } from '../api/eventApi';
import useAuthStore from '../context/AuthContext';

function LockedEventNotice({ message }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">This event can no longer be edited</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{message}</p>
    </section>
  );
}

export default function EditEventPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockedMessage, setBlockedMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      try {
        const response = await getEventById(id);
        const eventData = response.data;

        if (cancelled) return;

        if (!eventBelongsToCurrentUser(eventData, user)) {
          toast.error('You are not allowed to edit this event.');
          navigate('/student/my-events', { replace: true });
          return;
        }

        const canEdit =
          eventData.status === 'PENDING' &&
          (!eventData.approvalStage ||
            ['PENDING_DEAN', 'PENDING_TREASURER'].includes(eventData.approvalStage));

        if (!canEdit) {
          setBlockedMessage(
            eventData.status === 'REJECTED' || eventData.status === 'APPROVED'
              ? 'The review process is already complete, so the event details are now locked.'
              : 'This event is no longer in an editable approval stage.'
          );
          return;
        }

        setEvent(eventData);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load event details.');
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
  }, [id, navigate, user]);

  if (loading) {
    return (
      <StudentLayout user={user}>
        <div className="py-20 text-center text-slate-500">Loading event details...</div>
      </StudentLayout>
    );
  }

  if (!event) {
    return (
      <StudentLayout user={user}>
        <div className="space-y-6">
          <LockedEventNotice
            message={blockedMessage || 'We could not find an editable event for this request.'}
          />
          <button
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => navigate('/student/my-events')}
            type="button"
          >
            Back to My Events
          </button>
        </div>
      </StudentLayout>
    );
  }

  const organizerMeta = getOrganizerTypeMeta(event);
  const approvalMeta = getApprovalStageMeta(event);

  return (
    <StudentLayout user={user}>
      <EventFormShell
        approvalContent={null}
        cancelLabel="Discard Changes"
        conflictMessage="Venue conflict detected. Please choose a different venue or time."
        generalErrorMessage="Failed to update event."
        headerContent={
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${organizerMeta.badgeClass}`}
                  >
                    <span className="material-symbols-outlined text-base">{organizerMeta.icon}</span>
                    {organizerMeta.label}
                  </span>
                  {event.clubName && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                      Under: {event.clubName}
                    </span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${approvalMeta.pillClass}`}
                >
                  <span className="material-symbols-outlined text-base">{approvalMeta.icon}</span>
                  ⏳ {approvalMeta.detail}
                </span>
              </div>
              <button
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                onClick={() => navigate('/student/my-events')}
                type="button"
              >
                Back to My Events
              </button>
            </div>
          </section>
        }
        initialEvent={event}
        onCancel={() => navigate('/student/my-events')}
        onSuccess={() => {
          toast.success('Event updated successfully!');
          navigate('/student/my-events');
        }}
        pageDescription="Update the event details while the request is still waiting for review."
        pageTitle="Edit Event Request"
        schema={baseEventSchema}
        submitLabel="Save Changes"
        submitRequest={(payload) =>
          updateEventRequest(id, {
            title: payload.title,
            description: payload.description,
            categoryId: payload.categoryId,
            subCategoryId: payload.subCategoryId || null,
            venue: payload.venue,
            startTime: payload.startTime,
            endTime: payload.endTime,
            isMultiDay: payload.isMultiDay,
            isPublic: payload.isPublic,
            imageId: payload.imageId || null,
          })
        }
        submittingLabel="Saving..."
      />
    </StudentLayout>
  );
}
