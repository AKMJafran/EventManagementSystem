import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import EventImage from '../components/EventImage';

function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function conflictTone(conflictStatus) {
  switch (conflictStatus) {
    case 'HARD_CONFLICT':
      return 'bg-error-container text-on-error-container';
    case 'POTENTIAL_CONFLICT':
      return 'bg-amber-100 text-amber-900';
    default:
      return 'bg-secondary-container text-on-secondary-container';
  }
}

export default function ManageEvents() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(new Date());

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectId, setRejectId] = useState(null);

  const [approvalCheck, setApprovalCheck] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [resolutionForm, setResolutionForm] = useState({
    venue: '',
    startTime: '',
    endTime: '',
    adminMessage: '',
  });

  function clearDateFilters() {
    setStartDate('');
    setEndDate('');
  }

  useEffect(() => {
    async function loadEventsForFilters() {
      setLoading(true);

      try {
        if (startDate && endDate && endDate < startDate) {
          toast.error('End date must be on or after start date');
          return;
        }

        const params = {};
        if (status !== 'ALL') params.status = status;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await axiosInstance.get('/events', { params });

        setEvents(response.data.content || response.data || []);
        setLastSynced(new Date());
      } catch (error) {
        toast.error('Failed to load events');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadEventsForFilters();
  }, [status, startDate, endDate]);

  async function loadEvents(nextStatus = status) {
    setLoading(true);

    try {
      if (startDate && endDate && endDate < startDate) {
        toast.error('End date must be on or after start date');
        return;
      }

      const params = {};
      if (nextStatus !== 'ALL') params.status = nextStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axiosInstance.get('/events', { params });

      setEvents(response.data.content || response.data || []);
      setLastSynced(new Date());
    } catch (error) {
      toast.error('Failed to load events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      if (!query) return true;

      return (
        event.title?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query) ||
        event.createdByName?.toLowerCase().includes(query)
      );
    });
  }, [events, search]);

  async function finalizeApprove(eventId) {
    try {
      setApprovalLoading(true);

      await axiosInstance.patch(`/events/${eventId}/approve`);

      toast.success('Event approved');

      setApprovalCheck(null);

      await loadEvents();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to approve event'
      );
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function openApprovalCheck(event) {
    try {
      setApprovalLoading(true);

      const response = await axiosInstance.get(
        `/events/${event.id}/approval-check`
      );

      const analysis = response.data;

      setResolutionForm({
        venue: analysis.venue || event.venue || '',
        startTime: toDateTimeLocalValue(
          analysis.startTime || event.startTime
        ),
        endTime: toDateTimeLocalValue(
          analysis.endTime || event.endTime
        ),
        adminMessage: '',
      });

      if (analysis.conflictStatus === 'NO_CONFLICT') {
        await finalizeApprove(event.id);
        return;
      }

      setApprovalCheck(analysis);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to review event conflicts'
      );
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function submitRejection() {
    const normalizedReason = rejectReason.trim();

    if (!normalizedReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await axiosInstance.patch(
        `/events/${rejectId}/reject`,
        { reason: normalizedReason }
      );

      toast.success('Event rejected');

      setShowRejectModal(false);
      setRejectId(null);
      setRejectReason('');
      setApprovalCheck(null);

      await loadEvents();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to reject event'
      );
      console.error(error);
    }
  }

  async function submitAlternativeSchedule() {
    if (!approvalCheck) return;

    try {
      setApprovalLoading(true);

      await axiosInstance.patch(
        `/events/${approvalCheck.eventId}/resolve-conflict`,
        {
          venue: resolutionForm.venue,
          startTime: resolutionForm.startTime,
          endTime: resolutionForm.endTime,
          adminMessage: resolutionForm.adminMessage,
        }
      );

      toast.success('Alternative schedule sent to the student');

      setApprovalCheck(null);

      await loadEvents();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to assign an alternative schedule'
      );
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  function openRejectModal(id) {
    setRejectId(id);
    setRejectReason('');
    setShowRejectModal(true);
  }

  return (
    <AdminLayout>
      <div className="pt-8">
        <header className="mx-auto mb-10 max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-serif font-bold text-teal-900">
              Event Approval Workflow
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-on-surface-variant">
              Review requests, inspect scheduling conflicts before approval,
              and either reject or propose a conflict-free slot.
            </p>
          </div>

          <div className="bg-surface-container-low px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">
              history
            </span>
            <span className="text-xs font-semibold text-teal-800">
              Last Synced:{' '}
              {lastSynced.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </header>

        <section className="mx-auto mb-8 flex max-w-7xl flex-wrap items-center gap-4 rounded-3xl bg-white p-6 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, venue, or organizer"
            className="min-w-[260px] flex-1 rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />

          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  status === value
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {value.replace('_', ' ')}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />

          <button
            type="button"
            onClick={clearDateFilters}
            className="px-4 py-3 rounded-2xl text-xs font-bold text-teal-700 hover:bg-teal-50"
          >
            Clear Dates
          </button>
        </section>

        <section className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4">Conflict Status</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-container">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      Loading events...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      No events found.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-20 overflow-hidden rounded-xl">
                            <EventImage
                              src={event.imageUrl}
                              alt={event.title}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div>
                            <h3 className="font-serif text-lg font-bold text-teal-900">
                              {event.title}
                            </h3>

                            <p className="mt-1 text-xs text-on-surface-variant">
                              Organizer: {event.createdByName || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm">
                        <div>{event.venue}</div>
                        <div>{formatDateTime(event.startTime)}</div>
                        <div>{formatDateTime(event.endTime)}</div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${conflictTone(
                            event.conflictStatus
                          )}`}
                        >
                          {(event.conflictStatus || 'NO_CONFLICT').replace(
                            '_',
                            ' '
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-bold uppercase">
                          {event.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={
                              event.status !== 'PENDING' ||
                              approvalLoading
                            }
                            onClick={() =>
                              openApprovalCheck(event)
                            }
                            className="rounded-2xl bg-secondary px-4 py-2 text-xs font-bold text-white"
                          >
                            Review Approval
                          </button>

                          <button
                            type="button"
                            disabled={event.status !== 'PENDING'}
                            onClick={() =>
                              openRejectModal(event.id)
                            }
                            className="rounded-2xl bg-error px-4 py-2 text-xs font-bold text-white"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            disabled={event.status !== 'PENDING'}
                            onClick={() =>
                              navigate(
                                `/admin/edit-event/${event.id}`
                              )
                            }
                            className="rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-white"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/events/${event.id}`)
                            }
                            className="rounded-2xl bg-surface-container-low px-4 py-2 text-xs font-bold"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {approvalCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-serif font-bold text-teal-900">
                  {approvalCheck.eventTitle}
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {approvalCheck.recommendation}
                </p>
              </div>

              <button
                onClick={() => setApprovalCheck(null)}
                className="rounded-full p-2"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
              <div className="rounded-3xl bg-surface-container-low p-6">
                {(approvalCheck.conflicts || []).map((conflict) => (
                  <article
                    key={`${approvalCheck.eventId}-${conflict.conflictingEventId}`}
                    className="rounded-2xl bg-white p-4 shadow-sm mb-4"
                  >
                    <h3 className="font-bold text-teal-900">
                      {conflict.conflictingEventTitle}
                    </h3>

                    <p className="mt-2 text-sm">
                      {conflict.summary}
                    </p>
                  </article>
                ))}
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl bg-surface-container-low p-6">
                  <h3 className="text-xl font-serif font-bold text-teal-900">
                    Assign Alternative Slot
                  </h3>

                  <div className="mt-5 grid gap-4">
                    <input
                      value={resolutionForm.venue}
                      onChange={(e) =>
                        setResolutionForm((c) => ({
                          ...c,
                          venue: e.target.value,
                        }))
                      }
                      className="rounded-2xl bg-white px-4 py-3"
                      placeholder="Venue"
                    />

                    <input
                      type="datetime-local"
                      value={resolutionForm.startTime}
                      onChange={(e) =>
                        setResolutionForm((c) => ({
                          ...c,
                          startTime: e.target.value,
                        }))
                      }
                      className="rounded-2xl bg-white px-4 py-3"
                    />

                    <input
                      type="datetime-local"
                      value={resolutionForm.endTime}
                      onChange={(e) =>
                        setResolutionForm((c) => ({
                          ...c,
                          endTime: e.target.value,
                        }))
                      }
                      className="rounded-2xl bg-white px-4 py-3"
                    />

                    <textarea
                      value={resolutionForm.adminMessage}
                      onChange={(e) =>
                        setResolutionForm((c) => ({
                          ...c,
                          adminMessage: e.target.value,
                        }))
                      }
                      className="rounded-2xl bg-white px-4 py-3"
                      placeholder="Optional note"
                    />

                    <button
                      onClick={submitAlternativeSchedule}
                      className="rounded-2xl bg-primary px-4 py-3 text-white font-bold"
                    >
                      Send Alternative Schedule
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl bg-surface-container-low p-6">
                  <button
                    disabled={
                      !approvalCheck.canApprove ||
                      approvalLoading
                    }
                    onClick={() =>
                      finalizeApprove(
                        approvalCheck.eventId
                      )
                    }
                    className="w-full rounded-2xl bg-secondary px-4 py-3 text-white font-bold"
                  >
                    {approvalCheck.canApprove
                      ? 'Approve Request'
                      : 'Approval Blocked by Hard Conflict'}
                  </button>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-error">
              Reject Event
            </h2>

            <textarea
              value={rejectReason}
              onChange={(e) =>
                setRejectReason(e.target.value)
              }
              className="mt-5 h-32 w-full rounded-2xl bg-surface-container-low px-4 py-3"
              placeholder="Reason for rejection"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setRejectId(null);
                }}
              >
                Cancel
              </button>

              <button
                onClick={submitRejection}
                disabled={!rejectReason.trim()}
                className="rounded-2xl bg-error px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-10 right-10 z-50">
        <button
          onClick={() => navigate('/admin/create-event')}
          className="h-16 w-16 rounded-full bg-primary text-white shadow-2xl"
        >
          +
        </button>
      </div>
    </AdminLayout>
  );
}
