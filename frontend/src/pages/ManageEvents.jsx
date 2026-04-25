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
      toast.error(error?.response?.data?.message || 'Failed to approve event');
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function openApprovalCheck(event) {
    try {
      setApprovalLoading(true);
      const response = await axiosInstance.get(`/events/${event.id}/approval-check`);
      const analysis = response.data;

      setResolutionForm({
        venue: analysis.venue || event.venue || '',
        startTime: toDateTimeLocalValue(analysis.startTime || event.startTime),
        endTime: toDateTimeLocalValue(analysis.endTime || event.endTime),
        adminMessage: '',
      });

      if (analysis.conflictStatus === 'NO_CONFLICT') {
        await finalizeApprove(event.id);
        return;
      }

      setApprovalCheck(analysis);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to review event conflicts');
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function submitRejection() {
    try {
      await axiosInstance.patch(`/events/${rejectId}/reject`, { reason: rejectReason });
      toast.success('Event rejected');
      setShowRejectModal(false);
      setRejectId(null);
      setRejectReason('');
      setApprovalCheck(null);
      await loadEvents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject event');
      console.error(error);
    }
  }

  async function submitAlternativeSchedule() {
    if (!approvalCheck) return;

    try {
      setApprovalLoading(true);
      await axiosInstance.patch(`/events/${approvalCheck.eventId}/resolve-conflict`, {
        venue: resolutionForm.venue,
        startTime: resolutionForm.startTime,
        endTime: resolutionForm.endTime,
        adminMessage: resolutionForm.adminMessage,
      });
      toast.success('Alternative schedule sent to the student');
      setApprovalCheck(null);
      await loadEvents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign an alternative schedule');
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  function openRejectModal(id) {
    setRejectId(id);
    setShowRejectModal(true);
  }

  return (
    <AdminLayout>
      <div className="pt-8">
        <header className="mx-auto mb-10 max-w-7xl">
          <h1 className="text-5xl font-serif font-bold text-teal-900">Event Approval Workflow</h1>
          <p className="mt-3 max-w-3xl text-sm text-on-surface-variant">
            Review requests, inspect scheduling conflicts before approval, and either reject or propose a conflict-free slot.
          </p>
        </header>

        <section className="mx-auto mb-8 flex max-w-7xl flex-wrap items-center gap-4 rounded-3xl bg-white p-6 shadow-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
                  status === value ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {value.replace('_', ' ')}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
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
                    <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">Loading events...</td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">No events found.</td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-surface-container-lowest">
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-20 overflow-hidden rounded-xl bg-surface-container-high">
                            <EventImage src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <h3 className="font-serif text-lg font-bold text-teal-900">{event.title}</h3>
                            <p className="mt-1 text-xs text-on-surface-variant">Organizer: {event.createdByName || 'Unknown'}</p>
                            <p className="mt-1 text-xs text-on-surface-variant">{event.categoryName || 'General'} • {event.eventType || 'EVENT'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">
                        <div>{event.venue}</div>
                        <div className="mt-1">{formatDateTime(event.startTime)}</div>
                        <div className="mt-1">{formatDateTime(event.endTime)}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${conflictTone(event.conflictStatus)}`}>
                          {(event.conflictStatus || 'NO_CONFLICT').replace('_', ' ')}
                        </span>
                        {event.conflictDetails?.[0] && (
                          <p className="mt-2 max-w-xs text-xs text-on-surface-variant">{event.conflictDetails[0].summary}</p>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-bold uppercase text-on-surface">
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={event.status !== 'PENDING' || approvalLoading}
                            onClick={() => openApprovalCheck(event)}
                            className="rounded-2xl bg-secondary px-4 py-2 text-xs font-bold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Review Approval
                          </button>
                          <button
                            type="button"
                            disabled={event.status !== 'PENDING'}
                            onClick={() => openRejectModal(event.id)}
                            className="rounded-2xl bg-error px-4 py-2 text-xs font-bold text-white transition hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/events/${event.id}`)}
                            className="rounded-2xl bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface"
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Approval Review</p>
                <h2 className="mt-2 text-3xl font-serif font-bold text-teal-900">{approvalCheck.eventTitle}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">{approvalCheck.recommendation}</p>
              </div>
              <button
                type="button"
                onClick={() => setApprovalCheck(null)}
                className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
              <div className="rounded-3xl bg-surface-container-low p-6">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${conflictTone(approvalCheck.conflictStatus)}`}>
                    {approvalCheck.conflictStatus.replaceAll('_', ' ')}
                  </span>
                  <span className="text-sm text-on-surface-variant">
                    {approvalCheck.hardConflictCount} hard / {approvalCheck.softConflictCount} warning
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="text-sm text-on-surface"><span className="font-semibold">Venue:</span> {approvalCheck.venue}</div>
                  <div className="text-sm text-on-surface"><span className="font-semibold">Start:</span> {formatDateTime(approvalCheck.startTime)}</div>
                  <div className="text-sm text-on-surface"><span className="font-semibold">End:</span> {formatDateTime(approvalCheck.endTime)}</div>
                </div>

                <div className="mt-6 space-y-4">
                  {(approvalCheck.conflicts || []).map((conflict) => (
                    <article key={`${approvalCheck.eventId}-${conflict.conflictingEventId}-${conflict.conflictType}`} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${conflictTone(conflict.severity)}`}>
                          {conflict.severity.replaceAll('_', ' ')}
                        </span>
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
                          {conflict.conflictType.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-teal-900">{conflict.conflictingEventTitle}</h3>
                      <p className="mt-2 text-sm text-on-surface-variant">{conflict.summary}</p>
                      <div className="mt-3 grid gap-2 text-xs text-on-surface-variant md:grid-cols-2">
                        <div>Status: {conflict.conflictingEventStatus}</div>
                        <div>Venue: {conflict.conflictingVenue}</div>
                        <div>Start: {formatDateTime(conflict.conflictingStartTime)}</div>
                        <div>End: {formatDateTime(conflict.conflictingEndTime)}</div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl bg-surface-container-low p-6">
                  <h3 className="text-xl font-serif font-bold text-teal-900">Assign Alternative Slot</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Update the request with a safer date, time, or venue and notify the student to review it.
                  </p>
                  <div className="mt-5 grid gap-4">
                    <input
                      type="text"
                      value={resolutionForm.venue}
                      onChange={(event) => setResolutionForm((current) => ({ ...current, venue: event.target.value }))}
                      placeholder="Venue"
                      className="rounded-2xl bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="datetime-local"
                      value={resolutionForm.startTime}
                      onChange={(event) => setResolutionForm((current) => ({ ...current, startTime: event.target.value }))}
                      className="rounded-2xl bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="datetime-local"
                      value={resolutionForm.endTime}
                      onChange={(event) => setResolutionForm((current) => ({ ...current, endTime: event.target.value }))}
                      className="rounded-2xl bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <textarea
                      value={resolutionForm.adminMessage}
                      onChange={(event) => setResolutionForm((current) => ({ ...current, adminMessage: event.target.value }))}
                      placeholder="Optional note to the student"
                      className="h-28 rounded-2xl bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      disabled={approvalLoading}
                      onClick={submitAlternativeSchedule}
                      className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      Send Alternative Schedule
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl bg-surface-container-low p-6">
                  <h3 className="text-xl font-serif font-bold text-teal-900">Approval Decision</h3>
                  <div className="mt-4 flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={!approvalCheck.canApprove || approvalLoading}
                      onClick={() => finalizeApprove(approvalCheck.eventId)}
                      className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {approvalCheck.canApprove ? 'Approve Request' : 'Approval Blocked by Hard Conflict'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openRejectModal(approvalCheck.eventId)}
                      className="rounded-2xl bg-error px-4 py-3 text-sm font-bold text-white transition hover:bg-error/90"
                    >
                      Reject Request
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-error">Reject Event</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Add a clear reason so the student understands what needs to change.</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason for rejection"
              className="mt-5 h-32 w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-error/20"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-2xl px-4 py-2 text-sm font-bold text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRejection}
                className="rounded-2xl bg-error px-4 py-2 text-sm font-bold text-white"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
