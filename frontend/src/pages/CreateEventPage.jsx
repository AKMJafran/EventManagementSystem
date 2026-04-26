import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import StudentLayout from '../components/layout/StudentLayout';
import EventFormShell from '../components/events/EventFormShell';
import {
  clubEventSchema,
  individualEventSchema,
} from '../components/events/eventFormShared';
import { createEvent as createEventRequest } from '../api/eventApi';
import { getMyClub } from '../api/clubApi';
import useAuthStore from '../context/AuthContext';

function OrganizerTypeCard({
  icon,
  title,
  description,
  steps,
  buttonLabel,
  accentClass,
  accentSoftClass,
  onClick,
  loading = false,
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-[2rem] border bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${accentClass}`}
    >
      <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${accentSoftClass}`}>
        <span>{icon}</span>
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-6 flex-1 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Approval</p>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <button
        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={onClick}
        type="button"
      >
        {loading ? 'Checking club status...' : buttonLabel}
      </button>
    </article>
  );
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [organizerType, setOrganizerType] = useState('');
  const [checkingClub, setCheckingClub] = useState(false);
  const [clubData, setClubData] = useState(null);
  const [clubWarning, setClubWarning] = useState(null);

  async function handleClubSelection() {
    setCheckingClub(true);
    setClubWarning(null);

    try {
      const response = await getMyClub();
      const club = response.data;

      if (club?.status !== 'ACTIVE') {
        setOrganizerType('');
        setClubData(null);
        setClubWarning({
          status: club?.status || 'NOT_REGISTERED',
          clubName: club?.name || '',
        });
        return;
      }

      setClubData(club);
      setOrganizerType('CLUB_EVENT');
    } catch (error) {
      if (error?.response?.status === 404) {
        setClubWarning({ status: 'NOT_REGISTERED', clubName: '' });
      } else {
        toast.error(error?.response?.data?.message || 'Failed to load your club details.');
        console.error(error);
      }
    } finally {
      setCheckingClub(false);
    }
  }

  async function submitStudentEvent(payload) {
    return createEventRequest({
      title: payload.title,
      description: payload.description,
      categoryId: payload.categoryId,
      subCategoryId: payload.subCategoryId || null,
      eventType: payload.eventType,
      venue: payload.venue,
      startTime: payload.startTime,
      endTime: payload.endTime,
      organizerType,
      clubId: organizerType === 'CLUB_EVENT' ? clubData?.id || null : null,
      isMultiDay: payload.isMultiDay,
      isPublic: payload.isPublic,
      imageId: payload.imageId || null,
    });
  }

  async function handleSuccess() {
    toast.success(
      organizerType === 'CLUB_EVENT'
        ? 'Event submitted successfully! Your event is pending Senior Treasurer approval.'
        : 'Event submitted successfully! Your event is pending Dean approval.'
    );
    navigate('/student/my-events');
  }

  const organizerHeader =
    organizerType === 'CLUB_EVENT' ? (
      <section className="rounded-[2rem] border border-purple-200 bg-purple-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-800">
              <span>🏛️</span>
              Club Event
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-purple-100">
              <span className="text-slate-500">Under:</span>
              <span>{clubData?.name || 'Active Club'}</span>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              This event requires Treasurer then Dean approval.
            </p>
          </div>
          <button
            className="text-sm font-semibold text-purple-700 transition hover:text-purple-900"
            onClick={() => {
              setOrganizerType('');
              setClubData(null);
              setClubWarning(null);
            }}
            type="button"
          >
            ← Change Type
          </button>
        </div>
      </section>
    ) : (
      <section className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800">
              <span>👤</span>
              Personal Event
            </div>
            <p className="mt-4 text-sm text-slate-600">This event will go to the Dean for approval.</p>
          </div>
          <button
            className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
            onClick={() => {
              setOrganizerType('');
              setClubWarning(null);
            }}
            type="button"
          >
            ← Change Type
          </button>
        </div>
      </section>
    );

  const approvalContent =
    organizerType === 'CLUB_EVENT' ? (
      <section className="rounded-[1.75rem] bg-purple-50 p-5 ring-1 ring-purple-100">
        <h3 className="text-base font-semibold text-purple-900">📋 After you submit</h3>
        <ol className="mt-3 space-y-2 text-sm text-purple-950/80">
          <li>1. Your event is submitted for review</li>
          <li>2. {clubData?.seniorTreasurerLecturerName || 'Senior Treasurer'} reviews and approves</li>
          <li>3. Dean gives final approval</li>
          <li>4. You get notified at each step</li>
          <li>5. If approved, all students are notified</li>
        </ol>
      </section>
    ) : (
      <section className="rounded-[1.75rem] bg-sky-50 p-5 ring-1 ring-sky-100">
        <h3 className="text-base font-semibold text-sky-900">📋 After you submit</h3>
        <ol className="mt-3 space-y-2 text-sm text-sky-950/80">
          <li>1. Your event is submitted for review</li>
          <li>2. Dean reviews and approves or rejects</li>
          <li>3. You get notified by email and notification</li>
          <li>4. If approved, all students are notified</li>
        </ol>
      </section>
    );

  return (
    <StudentLayout user={user}>
      {!organizerType && !clubWarning && (
        <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
          <section className="w-full max-w-5xl rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">Create Event</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                What type of event are you organizing?
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Choose the organizer type first so we can prepare the correct approval flow and event form.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <OrganizerTypeCard
                accentClass="border-sky-200 hover:border-sky-300"
                accentSoftClass="bg-sky-100 text-sky-800"
                buttonLabel="Select This"
                description="An event you are organizing on your own behalf."
                icon="👤"
                onClick={() => {
                  setClubWarning(null);
                  setClubData(null);
                  setOrganizerType('INDIVIDUAL_STUDENT');
                }}
                steps={[
                  '1. Submit',
                  '2. Dean approves',
                  '3. Published',
                ]}
                title="Personal Event"
              />

              <OrganizerTypeCard
                accentClass="border-purple-200 hover:border-purple-300"
                accentSoftClass="bg-purple-100 text-purple-800"
                buttonLabel="Select This"
                description="An official event under your registered club."
                icon="🏛️"
                loading={checkingClub}
                onClick={handleClubSelection}
                steps={[
                  '1. Submit',
                  '2. Treasurer approves',
                  '3. Dean approves',
                  '4. Published',
                ]}
                title="Club Event"
              />
            </div>
          </section>
        </div>
      )}

      {!organizerType && clubWarning && (
        <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
          <section className="w-full max-w-3xl rounded-[2.5rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold text-amber-950">You need an active club to create club events.</h1>
            <p className="mt-3 text-base leading-7 text-amber-900/80">
              Your club is currently{' '}
              <span className="font-semibold">
                {clubWarning.status === 'NOT_REGISTERED' ? 'not registered' : clubWarning.status}
              </span>
              {clubWarning.clubName ? ` (${clubWarning.clubName})` : ''}. Register or activate your club first, then try again.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800"
                to="/student/clubs"
              >
                Go to Clubs Page
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-2xl border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-white"
                onClick={() => setClubWarning(null)}
                type="button"
              >
                ← Back
              </button>
            </div>
          </section>
        </div>
      )}

      {organizerType && (
        <EventFormShell
          allowedEventTypes={undefined}
          approvalContent={approvalContent}
          cancelLabel="Cancel"
          conflictMessage={
            organizerType === 'CLUB_EVENT'
              ? `Venue conflict! ${clubData?.name ? `Please update the request for ${clubData.name}.` : 'Please choose a different venue or time.'}`
              : 'Venue conflict! This venue is already booked for an approved event at this time.'
          }
          defaultValues={{
            isMultiDay: false,
            isPublic: false,
          }}
          generalErrorMessage="Failed to submit event."
          headerContent={organizerHeader}
          hiddenFields={
            organizerType === 'CLUB_EVENT'
              ? { organizerType: 'CLUB_EVENT', clubId: clubData?.id || '' }
              : { organizerType: 'INDIVIDUAL_STUDENT' }
          }
          onCancel={() => navigate('/student/my-events')}
          onSuccess={handleSuccess}
          pageDescription="Fill in the event details below. Required fields help the reviewers approve your request faster."
          pageTitle="Create Event Request"
          schema={organizerType === 'CLUB_EVENT' ? clubEventSchema : individualEventSchema}
          submitLabel={
            organizerType === 'CLUB_EVENT' ? 'Submit for Treasurer Review' : 'Submit for Dean Approval'
          }
          submitRequest={submitStudentEvent}
          submittingLabel="Submitting..."
        />
      )}
    </StudentLayout>
  );
}
