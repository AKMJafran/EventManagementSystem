import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LecturerLayout from '../components/layout/LecturerLayout';
import EventFormShell from '../components/events/EventFormShell';
import {
  canEditLecturerEvent,
  departmentalEditSchema,
  eventBelongsToCurrentUser,
  getApprovalStageMeta,
} from '../components/events/eventFormShared';
import { getEventById, updateEvent as updateEventRequest } from '../api/eventApi';
import useAuthStore from '../context/AuthContext';

export default function LecturerEditEventPage() {
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
          navigate('/lecturer/events', { replace: true });
          return;
        }

        if (!canEditLecturerEvent(eventData) && eventData.approvalStage) {
          setBlockedMessage('This event can no longer be edited because it is no longer waiting for Dean approval.');
          return;
        }

        if (eventData.status !== 'PENDING') {
          setBlockedMessage('This event can no longer be edited because the review process is complete.');
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
      <LecturerLayout>
        <div className="py-20 text-center text-slate-500">Loading event details...</div>
      </LecturerLayout>
    );
  }

  if (!event) {
    return (
      <LecturerLayout>
        <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">This event can no longer be edited</h1>
          <p className="text-base leading-7 text-slate-600">
            {blockedMessage || 'We could not find an editable departmental event for this request.'}
          </p>
          <button
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => navigate('/lecturer/events')}
            type="button"
          >
            Back to Events
          </button>
        </section>
      </LecturerLayout>
    );
  }

  const approvalMeta = getApprovalStageMeta(event);

  return (
    <LecturerLayout>
      <EventFormShell
        conflictMessage="Venue conflict detected. Please choose a different venue or time."
        generalErrorMessage="Failed to update departmental event."
        headerContent={
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
                  <span>🏫</span>
                  Departmental Event
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${approvalMeta.pillClass}`}
                >
                  <span className="material-symbols-outlined text-base">{approvalMeta.icon}</span>
                  ⏳ {approvalMeta.detail}
                </span>
              </div>
              <button
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                onClick={() => navigate('/lecturer/events')}
                type="button"
              >
                Back to Events
              </button>
            </div>
          </section>
        }
        initialEvent={event}
        onCancel={() => navigate('/lecturer/events')}
        onSuccess={() => {
          toast.success('Event updated successfully!');
          navigate('/lecturer/events');
        }}
        pageDescription="Update the departmental event details while the request is still pending Dean review."
        pageTitle="Edit Departmental Event"
        schema={departmentalEditSchema}
        showDepartmentField
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
            departmentName: payload.departmentName,
            isMultiDay: payload.isMultiDay,
            isPublic: payload.isPublic,
            imageId: payload.imageId || null,
          })
        }
        submittingLabel="Saving..."
      />
    </LecturerLayout>
  );
}
