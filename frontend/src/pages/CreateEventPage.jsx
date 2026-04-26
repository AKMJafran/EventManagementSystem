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

function formatClubStatus(status) {
  if (!status) {
    return 'not registered';
  }

  return status
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function OrganizerTypeCard({
  icon,
  title,
  description,
  steps,
  buttonLabel,
  accentClass,
  iconClass,
  onClick,
  loading = false,
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-3xl border bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${accentClass}`}
    >
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconClass}`}>
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>

      <h2 className="mt-6 serif-heading text-3xl font-bold text-on-surface">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{description}</p>

      <div className="mt-6 flex-1 rounded-3xl bg-surface-container-low px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">
          Approval Flow
        </p>
        <ol className="mt-4 space-y-2 text-sm text-on-surface">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <button
        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={onClick}
        type="button"
      >
        {loading ? 'Checking club status...' : buttonLabel}
      </button>
    </article>
  );
}

function SummaryBanner({
  badgeLabel,
  badgeClass,
  title,
  description,
  detailLabel,
  detailValue,
  onReset,
}) {
  return (
    <section className="rounded-3xl border border-outline-variant/10 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] ${badgeClass}`}>
            {badgeLabel}
          </span>
          <h2 className="mt-4 serif-heading text-3xl font-bold text-on-surface">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>
          {detailValue && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm text-on-surface">
              <span className="font-semibold text-on-surface-variant">{detailLabel}</span>
              <span className="font-semibold">{detailValue}</span>
            </div>
          )}
        </div>

        <button
          className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
          onClick={onReset}
          type="button"
        >
          Change Type
        </button>
      </div>
    </section>
  );
}

function ApprovalCard({ title, toneClass, items }) {
  return (
    <section className={`rounded-3xl border px-5 py-5 ${toneClass}`}>
      <h3 className="text-base font-semibold">{title}</h3>
      <ol className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
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
        ? 'Event submitted successfully. It is now pending Senior Treasurer approval.'
        : 'Event submitted successfully. It is now pending Dean approval.'
    );
    navigate('/student/my-events');
  }

  const organizerHeader =
    organizerType === 'CLUB_EVENT' ? (
      <SummaryBanner
        badgeClass="bg-secondary-container text-on-secondary-fixed"
        badgeLabel="Club Event"
        description="This request will move through Senior Treasurer review before it reaches the Dean."
        detailLabel="Club"
        detailValue={clubData?.name || 'Active Club'}
        onReset={() => {
          setOrganizerType('');
          setClubData(null);
          setClubWarning(null);
        }}
        title="Create an event under your club"
      />
    ) : (
      <SummaryBanner
        badgeClass="bg-primary/10 text-primary"
        badgeLabel="Personal Event"
        description="This request is submitted in your own name and goes directly to the Dean for approval."
        detailLabel=""
        detailValue=""
        onReset={() => {
          setOrganizerType('');
          setClubWarning(null);
        }}
        title="Create a personal event request"
      />
    );

  const approvalContent =
    organizerType === 'CLUB_EVENT' ? (
      <ApprovalCard
        items={[
          '1. Your event request is submitted for review.',
          `2. ${clubData?.seniorTreasurerLecturerName || 'The Senior Treasurer'} reviews it first.`,
          '3. The Dean gives the final approval decision.',
          '4. You receive notifications at each stage.',
          '5. Once approved, the event becomes visible to students.',
        ]}
        title="What happens after submission"
        toneClass="border-secondary-container bg-secondary-container/35 text-on-surface"
      />
    ) : (
      <ApprovalCard
        items={[
          '1. Your event request is submitted for Dean review.',
          '2. The Dean approves or rejects the request.',
          '3. You receive updates through notifications.',
          '4. Once approved, the event becomes visible to students.',
        ]}
        title="What happens after submission"
        toneClass="border-primary/10 bg-primary/5 text-on-surface"
      />
    );

  return (
    <StudentLayout user={user}>
      {!organizerType && !clubWarning && (
        <section className="rounded-[2rem] border border-outline-variant/10 bg-gradient-to-br from-primary/8 via-white to-secondary-container/35 p-8 shadow-sm md:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Create Event</p>
            <h1 className="mt-4 serif-heading text-5xl font-bold tracking-tight text-on-surface">
              Choose how you want to organize this event
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
              We will prepare the correct approval path, club checks, and event form based on whether
              this request is personal or submitted under a club.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <OrganizerTypeCard
              accentClass="border-primary/15"
              buttonLabel="Continue as Personal"
              description="Use this when the event is being organized by you directly rather than by a registered club."
              icon="person"
              iconClass="bg-primary/10 text-primary"
              onClick={() => {
                setClubWarning(null);
                setClubData(null);
                setOrganizerType('INDIVIDUAL_STUDENT');
              }}
              steps={[
                '1. Submit request',
                '2. Dean reviews the request',
                '3. Approved events are published',
              ]}
              title="Personal Event"
            />

            <OrganizerTypeCard
              accentClass="border-secondary/20"
              buttonLabel="Continue as Club"
              description="Use this when the event is officially organized under one of your active student clubs."
              icon="groups"
              iconClass="bg-secondary-container text-on-secondary-fixed"
              loading={checkingClub}
              onClick={handleClubSelection}
              steps={[
                '1. Submit request',
                '2. Senior Treasurer reviews first',
                '3. Dean reviews next',
                '4. Approved events are published',
              ]}
              title="Club Event"
            />
          </div>
        </section>
      )}

      {!organizerType && clubWarning && (
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-tertiary-container/30 bg-white p-8 shadow-sm">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-tertiary-container/20 text-on-tertiary-container">
            <span className="material-symbols-outlined text-[28px]">warning</span>
          </div>
          <h1 className="mt-5 serif-heading text-4xl font-bold text-on-surface">
            You need an active club to create a club event
          </h1>
          <p className="mt-3 text-base leading-7 text-on-surface-variant">
            Your club status is{' '}
            <span className="font-semibold text-on-surface">
              {formatClubStatus(clubWarning.status)}
            </span>
            {clubWarning.clubName ? ` for ${clubWarning.clubName}` : ''}. Activate or register a club
            first, then return here to submit a club event.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              to="/student/clubs"
            >
              Go to Clubs Page
            </Link>
            <button
              className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
              onClick={() => setClubWarning(null)}
              type="button"
            >
              Back
            </button>
          </div>
        </section>
      )}

      {organizerType && (
        <EventFormShell
          approvalContent={approvalContent}
          cancelLabel="Cancel"
          conflictMessage={
            organizerType === 'CLUB_EVENT'
              ? `Venue conflict. ${
                  clubData?.name
                    ? `Please update the request for ${clubData.name} with a new venue or time.`
                    : 'Please choose a different venue or time.'
                }`
              : 'Venue conflict. This venue is already booked for an approved event at this time.'
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
          pageDescription="Add the key event details below. Clear schedules, venue choices, and descriptions help reviewers approve faster."
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
