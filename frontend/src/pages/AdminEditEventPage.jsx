import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/layout/AdminLayout';
import EventFormShell from '../components/events/EventFormShell';
import {
  baseEventSchema,
  getApprovalStageMeta,
  getOrganizerTypeMeta,
  NON_URGENT_EVENT_TYPE_OPTIONS,
} from '../components/events/eventFormShared';
import { getEventById, updateEvent as updateEventRequest } from '../api/eventApi';

export default function AdminEditEventPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      try {
        const response = await getEventById(id);
        if (!cancelled) {
          setEvent(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || 'Failed to load event details.');
          console.error(error);
        }
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-slate-500">Loading event details...</div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Event not found</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            We could not find the event you were trying to edit.
          </p>
        </section>
      </AdminLayout>
    );
  }

  const organizerMeta = getOrganizerTypeMeta(event);
  const approvalMeta = getApprovalStageMeta(event);
  const allowedEventTypes =
    event.organizerType === 'DEPARTMENTAL' ? NON_URGENT_EVENT_TYPE_OPTIONS : undefined;

  return (
    <AdminLayout>
      <EventFormShell
        allowedEventTypes={allowedEventTypes}
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
                  {event.departmentName && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                      Department: {event.departmentName}
                    </span>
                  )}
                  {event.clubName && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                      Club: {event.clubName}
                    </span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${approvalMeta.pillClass}`}
                >
                  <span className="material-symbols-outlined text-base">{approvalMeta.icon}</span>
                  {approvalMeta.label}
                </span>
              </div>
              <button
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                onClick={() => navigate('/manage-events')}
                type="button"
              >
                Back to Manage Events
              </button>
            </div>
          </section>
        }
        initialEvent={event}
        onCancel={() => navigate('/manage-events')}
        onSuccess={() => {
          toast.success('Event updated successfully!');
          navigate('/manage-events');
        }}
        pageDescription="Admins can edit pending or approved events without changing their organizer type."
        pageTitle="Edit Event"
        schema={baseEventSchema}
        departmentHelperText={
          event.organizerType === 'DEPARTMENTAL'
            ? 'Department stays read-only when an admin updates a departmental event.'
            : ''
        }
        departmentReadOnly={event.organizerType === 'DEPARTMENTAL'}
        showDepartmentField={event.organizerType === 'DEPARTMENTAL'}
        submitLabel="Save Changes"
        submitRequest={(payload) =>
          updateEventRequest(id, {
            title: payload.title,
            description: payload.description,
            categoryId: payload.categoryId,
            subCategoryId: payload.subCategoryId || null,
            eventType: payload.eventType,
            venue: payload.venue,
            startTime: payload.startTime,
            endTime: payload.endTime,
            departmentName: payload.departmentName,
            isMultiDay: payload.isMultiDay,
            isPublic: payload.isPublic,
            imageId: payload.imageId || null,
          })
        }
        submittingLabel="Saving..."
      />
    </AdminLayout>
  );
}
