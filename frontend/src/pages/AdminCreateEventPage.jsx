import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/layout/AdminLayout';
import EventFormShell from '../components/events/EventFormShell';
import { facultyOfficialEventSchema } from '../components/events/eventFormShared';
import { createEvent as createEventRequest } from '../api/eventApi';

export default function AdminCreateEventPage() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <EventFormShell
        approvalContent={null}
        conflictMessage="Venue conflict detected. Please choose a different venue or time."
        defaultValues={{
          isMultiDay: false,
          isPublic: false,
        }}
        generalErrorMessage="Failed to publish faculty event."
        headerContent={
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-800">
              <span>⭐</span>
              Official Faculty Event
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              This event will be published immediately without requiring approval. All students will be notified automatically.
            </p>
          </section>
        }
        hiddenFields={{ organizerType: 'FACULTY_OFFICIAL' }}
        onCancel={() => navigate('/manage-events')}
        onSuccess={() => {
          toast.success('Official faculty event published successfully! All students have been notified.');
          navigate('/manage-events');
        }}
        pageDescription="Create and publish an official faculty-wide event right away."
        pageTitle="Publish Official Event"
        schema={facultyOfficialEventSchema}
        submitLabel="Publish Event Now"
        submitRequest={(payload) =>
          createEventRequest({
            title: payload.title,
            description: payload.description,
            categoryId: payload.categoryId,
            subCategoryId: payload.subCategoryId || null,
            eventType: payload.eventType,
            venue: payload.venue,
            startTime: payload.startTime,
            endTime: payload.endTime,
            organizerType: 'FACULTY_OFFICIAL',
            isMultiDay: payload.isMultiDay,
            isPublic: payload.isPublic,
            imageId: payload.imageId || null,
          })
        }
        submittingLabel="Publishing..."
      />
    </AdminLayout>
  );
}
