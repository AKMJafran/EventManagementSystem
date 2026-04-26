import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function tone(status) {
  return status === 'HARD_CONFLICT'
    ? 'bg-error-container text-on-error-container'
    : 'bg-amber-100 text-amber-900';
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({
    venue: '',
    startTime: '',
    endTime: '',
    adminMessage: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchConflicts() {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/events/admin/conflicts');
      setConflicts(response.data || []);
    } catch (error) {
      toast.error('Failed to load conflicts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConflicts();
  }, []);

  function openResolveModal(conflict) {
    setSelectedConflict(conflict);
    setResolutionForm({
      venue: conflict.venue || '',
      startTime: toDateTimeLocalValue(conflict.startTime),
      endTime: toDateTimeLocalValue(conflict.endTime),
      adminMessage: '',
    });
  }

  async function approveEvent(conflict) {
    try {
      setActionLoading(true);
      if (!conflict.canApprove) {
        toast.error('This event has a hard conflict and cannot be approved yet');
        return;
      }
      await axiosInstance.patch(`/events/${conflict.eventId}/approve`);
      toast.success('Event approved');
      await fetchConflicts();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve event');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectEvent(conflict) {
    const reason = window.prompt('Enter a rejection reason');
    const normalizedReason = reason?.trim();

    if (!normalizedReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(true);
      await axiosInstance.patch(`/events/${conflict.eventId}/reject`, {
        reason: normalizedReason,
      });
      toast.success('Event rejected');
      await fetchConflicts();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject event');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  }

  async function resolveConflict() {
    if (!selectedConflict) return;

    try {
      setActionLoading(true);
      await axiosInstance.patch(`/events/${selectedConflict.eventId}/resolve-conflict`, resolutionForm);
      toast.success('Alternative schedule sent to the student');
      setSelectedConflict(null);
      await fetchConflicts();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to resolve conflict');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="pt-8">
        <header className="mx-auto mb-10 max-w-6xl">
          <h1 className="text-5xl font-serif font-bold text-teal-900">Conflict Resolution Desk</h1>
          <p className="mt-3 max-w-3xl text-sm text-on-surface-variant">
            Focus on requests that still need manual scheduling decisions before the approval queue can move cleanly.
          </p>
        </header>

        <section className="mx-auto max-w-6xl">
          {loading ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center text-on-surface-variant shadow-sm">Loading conflicts...</div>
          ) : conflicts.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-teal-900">No active conflicts</h2>
              <p className="mt-2 text-sm text-on-surface-variant">Pending requests are currently clear of scheduling warnings.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {conflicts.map((conflict) => (
                <article key={conflict.eventId} className="rounded-3xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${tone(conflict.conflictStatus)}`}>
                        {conflict.conflictStatus.replaceAll('_', ' ')}
                      </div>
                      <h2 className="mt-3 text-2xl font-serif font-bold text-teal-900">{conflict.eventTitle}</h2>
                      <div className="mt-3 grid gap-2 text-sm text-on-surface-variant md:grid-cols-3">
                        <div>Venue: {conflict.venue}</div>
                        <div>Start: {formatDateTime(conflict.startTime)}</div>
                        <div>End: {formatDateTime(conflict.endTime)}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openResolveModal(conflict)}
                        className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white"
                      >
                        Propose Alternative
                      </button>
                      <button
                        type="button"
                        disabled={!conflict.canApprove || actionLoading}
                        onClick={() => approveEvent(conflict)}
                        className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => rejectEvent(conflict)}
                        className="rounded-2xl bg-error px-4 py-3 text-sm font-bold text-white"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {conflict.conflicts.map((detail) => (
                      <div key={`${conflict.eventId}-${detail.conflictingEventId}-${detail.conflictType}`} className="rounded-2xl bg-surface-container-low p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${tone(detail.severity)}`}>
                            {detail.severity.replaceAll('_', ' ')}
                          </span>
                          <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
                            {detail.conflictType.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-teal-900">{detail.conflictingEventTitle}</h3>
                        <p className="mt-2 text-sm text-on-surface-variant">{detail.summary}</p>
                        <div className="mt-3 grid gap-2 text-xs text-on-surface-variant md:grid-cols-2">
                          <div>Status: {detail.conflictingEventStatus}</div>
                          <div>Venue: {detail.conflictingVenue}</div>
                          <div>Start: {formatDateTime(detail.conflictingStartTime)}</div>
                          <div>End: {formatDateTime(detail.conflictingEndTime)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedConflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-teal-900">Alternative Schedule</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Assign a better slot and notify the student so they can review the update.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedConflict(null)}
                  className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                <input
                  type="text"
                  value={resolutionForm.venue}
                  onChange={(event) => setResolutionForm((current) => ({ ...current, venue: event.target.value }))}
                  placeholder="Venue"
                  className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="datetime-local"
                  value={resolutionForm.startTime}
                  onChange={(event) => setResolutionForm((current) => ({ ...current, startTime: event.target.value }))}
                  className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="datetime-local"
                  value={resolutionForm.endTime}
                  onChange={(event) => setResolutionForm((current) => ({ ...current, endTime: event.target.value }))}
                  className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={resolutionForm.adminMessage}
                  onChange={(event) => setResolutionForm((current) => ({ ...current, adminMessage: event.target.value }))}
                  placeholder="Optional message to the student"
                  className="h-28 rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedConflict(null)}
                  className="rounded-2xl px-4 py-2 text-sm font-bold text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={resolveConflict}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Save Alternative
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
