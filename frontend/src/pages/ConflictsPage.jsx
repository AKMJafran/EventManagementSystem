import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';

function toDateTimeLocalValue(dateString) {
  if (!dateString) return '';
  const normalized = dateString.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({
    venue: '',
    startTime: '',
    endTime: '',
  });

  async function fetchConflicts() {
    try {
      const res = await axiosInstance.get('/events/admin/conflicts');
      setConflicts(res.data || []);
    } catch (e) {
      toast.error('Failed to load conflicts');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConflicts();
  }, []);

  function openResolveModal(conflict) {
    const primary = conflict.event || {};
    setSelectedConflict(conflict);
    setResolutionForm({
      venue: primary.venue || '',
      startTime: toDateTimeLocalValue(primary.startTime),
      endTime: toDateTimeLocalValue(primary.endTime),
    });
  }

  function closeResolveModal() {
    setSelectedConflict(null);
    setResolutionForm({
      venue: '',
      startTime: '',
      endTime: '',
    });
  }

  async function approveEvent(id) {
    try {
      setActionLoading(true);
      await axiosInstance.patch(`/events/${id}/approve`);
      toast.success('Event approved');
      await fetchConflicts();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to approve event');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectEvent(id) {
    const reason = window.prompt('Enter rejection reason for this event:');
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      await axiosInstance.patch(`/events/${id}/reject`, { reason });
      toast.success('Event rejected');
      await fetchConflicts();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to reject event');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function resolveConflict() {
    if (!selectedConflict) {
      return;
    }

    if (!resolutionForm.venue.trim()) {
      toast.error('Venue is required');
      return;
    }

    if (!resolutionForm.startTime || !resolutionForm.endTime) {
      toast.error('Start and end time are required');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        venue: resolutionForm.venue.trim(),
        startTime: resolutionForm.startTime,
        endTime: resolutionForm.endTime,
      };

      const res = await axiosInstance.patch(
        `/events/${selectedConflict.eventId}/resolve-conflict`,
        payload
      );

      if (res.data?.hasConflict) {
        toast.error('Conflict still exists. Try another venue or date.');
        return;
      }

      toast.success('Conflict resolved. This event can now be approved.');
      closeResolveModal();
      await fetchConflicts();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to resolve conflict');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="pt-8">
        <header className="max-w-6xl mx-auto mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-5xl font-serif font-bold text-teal-900 tracking-tight">Conflict Resolution Desk</h1>
            <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
              Review event clashes, reject invalid requests, or reassign a better venue/date before approval.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Open Conflicts</div>
            <div className="mt-2 text-3xl font-bold text-error">{conflicts.length}</div>
          </div>
        </header>

        <section className="max-w-6xl mx-auto">
          {loading ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center text-on-surface-variant shadow-sm">Loading conflicts...</div>
          ) : conflicts.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-teal-900">No active conflicts</h2>
              <p className="mt-2 text-sm text-on-surface-variant">All current event requests are conflict-free.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {conflicts.map((conflict) => {
                const primary = conflict.event || {};
                const secondary = conflict.conflictingEvent || {};

                return (
                  <article
                    key={conflict.id}
                    className="grid gap-6 rounded-3xl bg-white p-6 shadow-sm lg:grid-cols-[1fr_1fr_auto]"
                  >
                    <div className="rounded-2xl bg-surface-container-low p-5">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-error-container px-3 py-1 text-[10px] font-bold uppercase text-on-error-container">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Event To Resolve
                      </div>
                      <h2 className="text-xl font-serif font-bold text-teal-900">{primary.title || `Event ${conflict.eventId}`}</h2>
                      <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                        <div>Venue: {primary.venue || 'Unknown'}</div>
                        <div>Start: {formatDateTime(primary.startTime)}</div>
                        <div>End: {formatDateTime(primary.endTime)}</div>
                        <div>Status: {primary.status || 'Unknown'}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-surface-container-low p-5">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-3 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">compare_arrows</span>
                        Conflicts With
                      </div>
                      <h2 className="text-xl font-serif font-bold text-teal-900">{secondary.title || `Event ${conflict.conflictWith}`}</h2>
                      <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                        <div>Venue: {secondary.venue || 'Unknown'}</div>
                        <div>Start: {formatDateTime(secondary.startTime)}</div>
                        <div>End: {formatDateTime(secondary.endTime)}</div>
                        <div>Status: {secondary.status || 'Unknown'}</div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-3">
                      <button
                        className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => openResolveModal(conflict)}
                        disabled={actionLoading}
                      >
                        Reassign Date / Place
                      </button>
                      <button
                        className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => approveEvent(conflict.eventId)}
                        disabled={actionLoading}
                      >
                        Approve Event
                      </button>
                      <button
                        className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => rejectEvent(conflict.eventId)}
                        disabled={actionLoading}
                      >
                        Reject Event
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {selectedConflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-teal-900">Resolve Event Conflict</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Update the venue or move the event to a new time slot that does not conflict.
                  </p>
                </div>
                <button
                  onClick={closeResolveModal}
                  className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Venue</span>
                  <input
                    type="text"
                    value={resolutionForm.venue}
                    onChange={(e) => setResolutionForm((current) => ({ ...current, venue: e.target.value }))}
                    className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter a new venue"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Start Time</span>
                  <input
                    type="datetime-local"
                    value={resolutionForm.startTime}
                    onChange={(e) => setResolutionForm((current) => ({ ...current, startTime: e.target.value }))}
                    className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">End Time</span>
                  <input
                    type="datetime-local"
                    value={resolutionForm.endTime}
                    onChange={(e) => setResolutionForm((current) => ({ ...current, endTime: e.target.value }))}
                    className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={closeResolveModal}
                  className="rounded-2xl px-5 py-3 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  onClick={resolveConflict}
                  disabled={actionLoading}
                  className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save Resolution
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
