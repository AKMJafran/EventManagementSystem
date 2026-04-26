import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LecturerLayout from '../components/layout/LecturerLayout';
import EventFormShell from '../components/events/EventFormShell';
import {
  departmentalEventSchema,
  NON_URGENT_EVENT_TYPE_OPTIONS,
} from '../components/events/eventFormShared';
import { createEvent as createEventRequest } from '../api/eventApi';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';

export default function LecturerCreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [departmentName, setDepartmentName] = useState(user?.department || '');

  useEffect(() => {
    let cancelled = false;

    async function loadDepartment() {
      if (user?.department) return;

      try {
        const response = await axiosInstance.get('/lecturer/profile');
        if (!cancelled) {
          setDepartmentName(response.data?.department || '');
        }
      } catch (error) {
        if (!cancelled) {
          toast.error('Failed to load lecturer department.');
          console.error(error);
        }
      }
    }

    loadDepartment();

    return () => {
      cancelled = true;
    };
  }, [user?.department]);

  return (
    <LecturerLayout>
      <EventFormShell
        allowedEventTypes={NON_URGENT_EVENT_TYPE_OPTIONS}
        approvalContent={
          <section className="rounded-[1.75rem] bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <h3 className="text-base font-semibold text-emerald-900">📋 After you submit</h3>
            <ol className="mt-3 space-y-2 text-sm text-emerald-950/80">
              <li>1. Event submitted with your department info</li>
              <li>2. Dean reviews and approves or rejects</li>
              <li>3. You are notified by email</li>
              <li>4. If approved, all students are notified</li>
            </ol>
          </section>
        }
        conflictMessage="Venue conflict detected. Please choose a different venue or time."
        defaultValues={{
          departmentName,
          isMultiDay: false,
          isPublic: false,
        }}
        generalErrorMessage="Failed to submit departmental event."
        headerContent={
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
              <span>🏫</span>
              Departmental Event
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              This event will be submitted to the Dean for approval before being published.
            </p>
          </section>
        }
        hiddenFields={{ organizerType: 'DEPARTMENTAL' }}
        key={departmentName || 'lecturer-create-event'}
        onCancel={() => navigate('/lecturer/my-events')}
        onSuccess={() => {
          toast.success('Departmental event submitted for Dean approval!');
          navigate('/lecturer/my-events');
        }}
        pageDescription="Create a departmental event request with your department details included."
        pageTitle="Create Departmental Event"
        schema={departmentalEventSchema}
        showDepartmentField
        submitLabel="Submit Departmental Event"
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
            organizerType: 'DEPARTMENTAL',
            departmentName: payload.departmentName,
            isMultiDay: payload.isMultiDay,
            isPublic: payload.isPublic,
            imageId: payload.imageId || null,
          })
        }
        submittingLabel="Submitting..."
      />
    </LecturerLayout>
  );
}
