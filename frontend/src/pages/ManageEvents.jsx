import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import EventImage from '../components/EventImage';
import ModalPortal from '../components/ui/ModalPortal';

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const APPROVED_ACTION_TOOLTIP = 'Action unavailable for approved events';

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
      return 'bg-tertiary-fixed/35 text-on-tertiary-fixed-variant';
    default:
      return 'bg-secondary-container text-on-secondary-container';
  }
}

function statusTone(status) {
  switch (status) {
    case 'APPROVED':
      return 'bg-secondary-container text-on-secondary-container';
    case 'REJECTED':
      return 'bg-error-container text-on-error-container';
    case 'CANCELLED':
      return 'bg-surface-container-high text-on-surface-variant';
    default:
      return 'bg-tertiary-fixed/35 text-on-tertiary-fixed-variant';
  }
}

function validateRemovalReason(reason) {
  return reason.trim().length > 0;
}

function EventTableSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-[1.75rem] border border-outline-variant/20 bg-white p-6 shadow-sm">
            <div className="h-4 w-24 rounded-full bg-surface-container-high" />
            <div className="mt-5 h-10 w-20 rounded-full bg-surface-container-high" />
            <div className="mt-3 h-3 w-40 rounded-full bg-surface-container-high" />
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-outline-variant/20 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-outline-variant/15 p-6 lg:grid-cols-[1.3fr_220px_220px_180px_180px]">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="h-12 rounded-2xl bg-surface-container-high" />
          ))}
        </div>
        <div className="p-6">
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="grid gap-4 border-b border-outline-variant/10 py-5 last:border-b-0 lg:grid-cols-[1.35fr_1fr_0.8fr_0.8fr_0.9fr_1.35fr]"
            >
              {[0, 1, 2, 3, 4, 5].map((cell) => (
                <div key={cell} className="h-5 rounded-full bg-surface-container-high" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  tooltip,
  tone = 'neutral',
}) {
  const tones = {
    primary: 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10',
    success: 'bg-secondary text-white shadow-sm hover:bg-secondary/90 hover:shadow-lg hover:shadow-secondary/15',
    danger: 'bg-error text-white shadow-sm hover:bg-error/90 hover:shadow-lg hover:shadow-error/10',
    neutral: 'border-outline-variant/30 bg-white text-on-surface-variant hover:bg-surface-container-low',
    dark: 'bg-on-surface text-white shadow-sm hover:bg-on-surface/90',
  };

  const button = (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed border-outline-variant/20 bg-surface-container-low text-on-surface-variant opacity-45 shadow-none'
          : tones[tone]
      }`}
    >
      {children}
    </button>
  );

  if (disabled && tooltip) {
    return (
      <span className="inline-flex" title={tooltip} aria-label={tooltip}>
        {button}
      </span>
    );
  }

  return button;
}

function BaseModal({ children }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
        {children}
      </div>
    </ModalPortal>
  );
}

function ReviewModal({
  approvalCheck,
  resolutionForm,
  onChange,
  onClose,
  onApprove,
  onSubmitAlternative,
  loading,
}) {
  if (!approvalCheck) return null;

  return (
    <BaseModal>
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl" role="dialog" aria-modal="true">
        <div className="border-b border-outline-variant/20 bg-surface-container-low px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Approval Review</p>
              <h2 className="mt-2 text-3xl font-serif font-bold text-on-surface">{approvalCheck.eventTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">{approvalCheck.recommendation}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-on-surface-variant hover:bg-white"
              aria-label="Close approval review"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="grid max-h-[calc(92vh-92px)] gap-0 overflow-y-auto lg:grid-cols-[1.15fr_0.95fr]">
          <div className="border-b border-outline-variant/15 p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-on-surface">Conflict Findings</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Review all related scheduling concerns before confirming the decision.
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${conflictTone(
                  approvalCheck.conflictStatus
                )}`}
              >
                {approvalCheck.conflictStatus.replaceAll('_', ' ')}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {(approvalCheck.conflicts || []).length === 0 ? (
                <div className="rounded-[1.5rem] border border-secondary/15 bg-secondary-container/40 p-5 text-sm text-on-secondary-container">
                  No blocking conflicts were found. This request is ready for approval.
                </div>
              ) : (
                (approvalCheck.conflicts || []).map((conflict) => (
                  <article
                    key={`${approvalCheck.eventId}-${conflict.conflictingEventId}`}
                    className="rounded-[1.5rem] border border-outline-variant/20 bg-surface-container-low p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${conflictTone(
                          conflict.severity
                        )}`}
                      >
                        {conflict.severity?.replaceAll('_', ' ')}
                      </span>
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                        {conflict.conflictType?.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <h4 className="mt-4 text-lg font-semibold text-on-surface">{conflict.conflictingEventTitle}</h4>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{conflict.summary}</p>
                    <div className="mt-4 grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
                      <p>Venue: {conflict.conflictingVenue}</p>
                      <p>Status: {conflict.conflictingEventStatus}</p>
                      <p>Start: {formatDateTime(conflict.conflictingStartTime)}</p>
                      <p>End: {formatDateTime(conflict.conflictingEndTime)}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6 p-6 lg:p-8">
            <section className="rounded-[1.75rem] border border-outline-variant/20 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-serif font-bold text-on-surface">Assign Alternative Slot</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Keep the request in motion by proposing a conflict-free venue or schedule.
              </p>

              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-on-surface">Venue</span>
                  <input
                    value={resolutionForm.venue}
                    onChange={(event) => onChange('venue', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm"
                    placeholder="Venue"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-on-surface">Start Time</span>
                  <input
                    type="datetime-local"
                    value={resolutionForm.startTime}
                    onChange={(event) => onChange('startTime', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-on-surface">End Time</span>
                  <input
                    type="datetime-local"
                    value={resolutionForm.endTime}
                    onChange={(event) => onChange('endTime', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-on-surface">Message to Student</span>
                  <textarea
                    value={resolutionForm.adminMessage}
                    onChange={(event) => onChange('adminMessage', event.target.value)}
                    className="mt-2 h-28 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm"
                    placeholder="Optional note explaining the schedule change."
                  />
                </label>

                <button
                  type="button"
                  onClick={onSubmitAlternative}
                  disabled={loading}
                  className="btn-gradient inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 disabled:opacity-60"
                >
                  {loading ? 'Sending...' : 'Send Alternative Schedule'}
                </button>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-low p-6">
              <h3 className="text-lg font-serif font-bold text-on-surface">Approve Decision</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Approval is only available when the request is operationally safe to proceed.
              </p>

              <button
                type="button"
                disabled={!approvalCheck.canApprove || loading}
                onClick={onApprove}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-secondary/10 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {approvalCheck.canApprove ? 'Approve Event' : 'Approval Blocked by Hard Conflict'}
              </button>
            </section>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

function ReasonModal({
  title,
  description,
  reason,
  onChange,
  onClose,
  onConfirm,
  confirmLabel,
  confirmTone = 'danger',
  loading = false,
  warning,
}) {
  const confirmClasses =
    confirmTone === 'danger'
      ? 'bg-error text-white shadow-lg shadow-error/10 hover:bg-error/90'
      : 'btn-gradient text-white shadow-lg shadow-primary/15';

  return (
    <BaseModal>
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-error-container text-error">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-on-surface">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
          </div>
        </div>

        {warning && (
          <div className="mt-5 rounded-[1.5rem] border border-error/15 bg-error-container/55 px-4 py-4 text-sm leading-6 text-on-error-container">
            {warning}
          </div>
        )}

        <label className="mt-6 block">
          <span className="text-sm font-semibold text-on-surface">
            Reason <span className="text-error">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(event) => onChange(event.target.value)}
            className="mt-2 h-32 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm"
            placeholder="Explain the decision clearly for the organizer and audit trail."
          />
        </label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/35 px-5 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!validateRemovalReason(reason) || loading}
            className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${confirmClasses}`}
          >
            {loading ? 'Saving...' : confirmLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

export default function ManageEvents() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'startTime', direction: 'desc' });
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(new Date());

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [submittingReject, setSubmittingReject] = useState(false);

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const [submittingRemoval, setSubmittingRemoval] = useState(false);

  const [approvalCheck, setApprovalCheck] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    venue: '',
    startTime: '',
    endTime: '',
    adminMessage: '',
  });

  async function loadEvents(nextStatus = status) {
    if (startDate && endDate && endDate < startDate) {
      toast.error('End date must be on or after start date.');
      return;
    }

    setLoading(true);

    try {
      const params = {};
      if (nextStatus !== 'ALL') params.status = nextStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axiosInstance.get('/events', { params });
      setEvents(response.data || []);
      setLastSynced(new Date());
    } catch (error) {
      toast.error('Failed to load events.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents(status);
  }, [status, startDate, endDate]);

  const summary = useMemo(
    () => ({
      total: events.length,
      pending: events.filter((event) => event.status === 'PENDING').length,
      approved: events.filter((event) => event.status === 'APPROVED').length,
      conflicts: events.filter((event) => event.conflictStatus === 'HARD_CONFLICT').length,
    }),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const directionFactor = sortConfig.direction === 'asc' ? 1 : -1;

    const filtered = events.filter((event) => {
      if (!query) return true;

      return (
        event.title?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query) ||
        event.createdByName?.toLowerCase().includes(query)
      );
    });

    return filtered.sort((left, right) => {
      if (sortConfig.key === 'title' || sortConfig.key === 'venue' || sortConfig.key === 'status') {
        return String(left[sortConfig.key] || '').localeCompare(String(right[sortConfig.key] || '')) * directionFactor;
      }

      if (sortConfig.key === 'startTime') {
        return (new Date(left.startTime).getTime() - new Date(right.startTime).getTime()) * directionFactor;
      }

      return 0;
    });
  }, [events, search, sortConfig]);

  function updateResolutionField(field, value) {
    setResolutionForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function clearDateFilters() {
    setStartDate('');
    setEndDate('');
  }

  function toggleSort(key) {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }

      return { key, direction: key === 'startTime' ? 'desc' : 'asc' };
    });
  }

  async function finalizeApprove(eventId) {
    try {
      setApprovalLoading(true);
      await axiosInstance.patch(`/events/${eventId}/approve`);
      toast.success('Event approved successfully.');
      setApprovalCheck(null);
      await loadEvents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve event.');
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function openApprovalCheck(event) {
    if (event.status !== 'PENDING') {
      toast.error('Only pending events can be reviewed for approval.');
      return;
    }

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
      toast.error(error?.response?.data?.message || 'Failed to review event conflicts.');
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  function openRejectModal(event) {
    if (event.status !== 'PENDING') {
      toast.error('Only pending events can be rejected.');
      return;
    }

    setRejectTarget(event);
    setRejectReason('');
    setShowRejectModal(true);
  }

  async function submitRejection() {
    const normalizedReason = rejectReason.trim();

    if (!normalizedReason) {
      toast.error('Please provide a rejection reason.');
      return;
    }

    if (rejectTarget?.status !== 'PENDING') {
      toast.error('Only pending events can be rejected.');
      return;
    }

    try {
      setSubmittingReject(true);
      await axiosInstance.patch(`/events/${rejectTarget.id}/reject`, { reason: normalizedReason });
      toast.success('Event rejected successfully.');
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectReason('');
      setApprovalCheck(null);
      await loadEvents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject event.');
      console.error(error);
    } finally {
      setSubmittingReject(false);
    }
  }

  function openRemoveModal(event) {
    if (event.status !== 'APPROVED') {
      toast.error('Only approved events can be removed through this action.');
      return;
    }

    setRemoveTarget(event);
    setRemoveReason('');
    setShowRemoveModal(true);
  }

  async function submitApprovedRemoval() {
    const normalizedReason = removeReason.trim();

    if (!normalizedReason) {
      toast.error('Please provide a removal reason.');
      return;
    }

    if (removeTarget?.status !== 'APPROVED') {
      toast.error('This removal action is only available for approved events.');
      return;
    }

    try {
      setSubmittingRemoval(true);
      await axiosInstance.patch(`/events/${removeTarget.id}/remove-approved`, {
        reason: normalizedReason,
      });
      toast.success('Approved event removed successfully.');
      setShowRemoveModal(false);
      setRemoveTarget(null);
      setRemoveReason('');
      await loadEvents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to remove approved event.');
      console.error(error);
    } finally {
      setSubmittingRemoval(false);
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
      toast.success('Alternative schedule sent to the student.');
      setApprovalCheck(null);
      await loadEvents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign an alternative schedule.');
      console.error(error);
    } finally {
      setApprovalLoading(false);
    }
  }

  function renderActions(event) {
    const isApproved = event.status === 'APPROVED';
    const isPending = event.status === 'PENDING';
    const canApproveDirectly = isPending && event.conflictStatus !== 'HARD_CONFLICT';

    return (
      <div className="flex flex-wrap justify-end gap-2">
        {isPending && (
          <>
            <ActionButton
              tone="success"
              disabled={!canApproveDirectly || approvalLoading}
              onClick={() => openApprovalCheck(event)}
            >
              Approve
            </ActionButton>
            <ActionButton tone="primary" onClick={() => openApprovalCheck(event)} disabled={approvalLoading}>
              Review
            </ActionButton>
            <ActionButton tone="danger" onClick={() => openRejectModal(event)}>
              Reject
            </ActionButton>
            <ActionButton tone="neutral" onClick={() => navigate(`/admin/edit-event/${event.id}`)}>
              Edit
            </ActionButton>
          </>
        )}

        {isApproved && (
          <>
            <ActionButton tone="success" disabled tooltip={APPROVED_ACTION_TOOLTIP}>
              Approve
            </ActionButton>
            <ActionButton tone="primary" disabled tooltip={APPROVED_ACTION_TOOLTIP}>
              Review
            </ActionButton>
            <ActionButton tone="danger" disabled tooltip={APPROVED_ACTION_TOOLTIP}>
              Reject
            </ActionButton>
            <ActionButton tone="neutral" disabled tooltip={APPROVED_ACTION_TOOLTIP}>
              Delete
            </ActionButton>
            <ActionButton tone="danger" onClick={() => openRemoveModal(event)}>
              Remove Approved
            </ActionButton>
            <ActionButton tone="neutral" onClick={() => navigate(`/admin/edit-event/${event.id}`)}>
              Edit
            </ActionButton>
          </>
        )}

        {!isPending && !isApproved && (
          <ActionButton tone="neutral" onClick={() => navigate(`/admin/edit-event/${event.id}`)} disabled>
            Edit Locked
          </ActionButton>
        )}

        <ActionButton tone="dark" onClick={() => navigate(`/events/${event.id}`)}>
          View
        </ActionButton>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-primary">Approval Workflow</p>
            <h1 className="mt-3 text-4xl font-serif font-bold tracking-tight text-on-surface sm:text-5xl">
              Admin Event Management
            </h1>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">
              Review requests, prevent invalid actions after approval, and keep every decision traceable for organizers and admin staff.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-outline-variant/20 bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Last Synced</p>
            <p className="mt-2 text-lg font-semibold text-on-surface">
              {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </header>

        {loading ? (
          <EventTableSkeleton />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Total Events',
                  value: summary.total,
                  detail: 'All event records currently returned for the selected date window.',
                  icon: 'event',
                  tone: 'text-primary',
                },
                {
                  label: 'Pending Review',
                  value: summary.pending,
                  detail: 'Requests still waiting for an admin decision.',
                  icon: 'pending_actions',
                  tone: 'text-tertiary',
                },
                {
                  label: 'Approved Events',
                  value: summary.approved,
                  detail: 'Approved events now protected from conflicting approval actions.',
                  icon: 'task_alt',
                  tone: 'text-secondary',
                },
                {
                  label: 'Hard Conflicts',
                  value: summary.conflicts,
                  detail: 'Requests that still require conflict resolution before approval.',
                  icon: 'warning',
                  tone: 'text-error',
                },
              ].map((card) => (
                <article key={card.label} className="rounded-[1.75rem] border border-outline-variant/20 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">{card.label}</p>
                      <p className="mt-4 text-4xl font-bold text-on-surface">{card.value}</p>
                      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{card.detail}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-low ${card.tone}`}>
                      <span className="material-symbols-outlined">{card.icon}</span>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-outline-variant/20 bg-white shadow-sm">
              <div className="border-b border-outline-variant/15 bg-surface-container-low/60 p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-on-surface">Review Queue</h2>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Search, filter, and sort requests while keeping actions aligned to each event status.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/admin/create-event')}
                      className="btn-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      Create Event
                    </button>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr_180px_180px_150px]">
                    <label className="relative block">
                      <span className="sr-only">Search events</span>
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                        search
                      </span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search title, venue, or organizer"
                        className="w-full rounded-2xl border border-outline-variant/30 bg-white py-3 pl-12 pr-4 text-sm shadow-sm"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2 rounded-[1.5rem] border border-outline-variant/20 bg-white p-2">
                      {STATUS_FILTERS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStatus(value)}
                          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                            status === value
                              ? 'bg-primary text-white shadow-md shadow-primary/15'
                              : 'text-on-surface-variant hover:bg-surface-container-low'
                          }`}
                        >
                          {value.replaceAll('_', ' ')}
                        </button>
                      ))}
                    </div>

                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm shadow-sm"
                      aria-label="Start date"
                    />

                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm shadow-sm"
                      aria-label="End date"
                    />

                    <button
                      type="button"
                      onClick={clearDateFilters}
                      className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm font-semibold text-on-surface-variant shadow-sm hover:bg-surface-container-low"
                    >
                      Clear Dates
                    </button>
                  </div>
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-primary">
                    <span className="material-symbols-outlined text-3xl">event_busy</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-serif font-bold text-on-surface">No events found</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
                    Adjust the filters or search term to broaden the queue, or create a new event to populate the list.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto xl:block">
                    <table className="min-w-full border-collapse text-left">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
                          {[
                            ['title', 'Event'],
                            ['startTime', 'Schedule'],
                            ['venue', 'Conflict'],
                            ['status', 'Status'],
                            ['status', 'Decision Notes'],
                          ].map(([key, label], index) => (
                            <th key={`${key}-${index}`} className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => (label === 'Conflict' || label === 'Decision Notes' ? undefined : toggleSort(key))}
                                className={`inline-flex items-center gap-2 text-left text-[11px] font-bold uppercase tracking-[0.2em] ${
                                  label === 'Conflict' || label === 'Decision Notes' ? 'cursor-default' : ''
                                }`}
                              >
                                {label}
                                {label !== 'Conflict' && label !== 'Decision Notes' && (
                                  <span className="material-symbols-outlined text-sm">
                                    {sortConfig.key === key && sortConfig.direction === 'desc' ? 'south' : 'north'}
                                  </span>
                                )}
                              </button>
                            </th>
                          ))}
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-outline-variant/10">
                        {filteredEvents.map((event) => (
                          <tr key={event.id} className="align-top hover:bg-surface-container-low/40">
                            <td className="px-6 py-5">
                              <div className="flex items-start gap-4">
                                <div className="h-18 w-24 overflow-hidden rounded-[1.25rem] bg-surface-container-high">
                                  <EventImage
                                    src={event.imageUrl}
                                    alt={event.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                <div className="max-w-sm">
                                  <h3 className="text-lg font-serif font-bold text-on-surface">{event.title}</h3>
                                  <p className="mt-1 text-sm text-on-surface-variant">
                                    Organizer: {event.createdByName || 'Unknown'}
                                  </p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                                    {event.eventType || 'EVENT'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 text-sm text-on-surface-variant">
                              <p className="font-medium text-on-surface">{event.venue}</p>
                              <p className="mt-1">Start: {formatDateTime(event.startTime)}</p>
                              <p className="mt-1">End: {formatDateTime(event.endTime)}</p>
                            </td>

                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${conflictTone(
                                  event.conflictStatus || 'NO_CONFLICT'
                                )}`}
                              >
                                {(event.conflictStatus || 'NO_CONFLICT').replaceAll('_', ' ')}
                              </span>
                            </td>

                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusTone(
                                  event.status
                                )}`}
                              >
                                {event.status}
                              </span>
                            </td>

                            <td className="px-6 py-5 text-sm text-on-surface-variant">
                              {event.rejectReason ? (
                                <div className="rounded-[1.25rem] border border-outline-variant/20 bg-surface-container-low px-4 py-3">
                                  <p className="font-semibold text-on-surface">
                                    {event.status === 'CANCELLED' ? 'Removal Reason' : 'Decision Reason'}
                                  </p>
                                  <p className="mt-1 leading-6">{event.rejectReason}</p>
                                </div>
                              ) : (
                                'No decision note recorded.'
                              )}
                            </td>

                            <td className="px-6 py-5">{renderActions(event)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 p-4 xl:hidden">
                    {filteredEvents.map((event) => (
                      <article key={event.id} className="rounded-[1.75rem] border border-outline-variant/20 bg-white p-5 shadow-sm">
                        <div className="flex gap-4">
                          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-[1.25rem] bg-surface-container-high">
                            <EventImage src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusTone(
                                  event.status
                                )}`}
                              >
                                {event.status}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${conflictTone(
                                  event.conflictStatus || 'NO_CONFLICT'
                                )}`}
                              >
                                {(event.conflictStatus || 'NO_CONFLICT').replaceAll('_', ' ')}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-serif font-bold text-on-surface">{event.title}</h3>
                            <p className="mt-1 text-sm text-on-surface-variant">{event.createdByName || 'Unknown'}</p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm text-on-surface-variant">
                          <p><span className="font-semibold text-on-surface">Venue:</span> {event.venue}</p>
                          <p><span className="font-semibold text-on-surface">Start:</span> {formatDateTime(event.startTime)}</p>
                          <p><span className="font-semibold text-on-surface">End:</span> {formatDateTime(event.endTime)}</p>
                          {event.rejectReason && (
                            <div className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                              <p className="font-semibold text-on-surface">
                                {event.status === 'CANCELLED' ? 'Removal Reason' : 'Decision Reason'}
                              </p>
                              <p className="mt-1 leading-6">{event.rejectReason}</p>
                            </div>
                          )}
                        </div>

                        <div className="mt-5">{renderActions(event)}</div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <ReviewModal
        approvalCheck={approvalCheck}
        resolutionForm={resolutionForm}
        onChange={updateResolutionField}
        onClose={() => setApprovalCheck(null)}
        onApprove={() => finalizeApprove(approvalCheck.eventId)}
        onSubmitAlternative={submitAlternativeSchedule}
        loading={approvalLoading}
      />

      {showRejectModal && (
        <ReasonModal
          title="Reject Event Request"
          description={`Reject "${rejectTarget?.title || 'this event'}" and provide a clear reason for the organizer.`}
          warning="This action cannot be applied to approved events. Rejection is reserved for requests that are still pending review."
          reason={rejectReason}
          onChange={setRejectReason}
          onClose={() => {
            setShowRejectModal(false);
            setRejectReason('');
            setRejectTarget(null);
          }}
          onConfirm={submitRejection}
          confirmLabel="Confirm Rejection"
          loading={submittingReject}
        />
      )}

      {showRemoveModal && (
        <ReasonModal
          title="Remove Approved Event"
          description={`Remove "${removeTarget?.title || 'this event'}" from the approved schedule.`}
          warning="This action will cancel an already approved event, notify the organizer, and record your reason in the event history. Approval, rejection, review, and delete actions stay unavailable for approved events."
          reason={removeReason}
          onChange={setRemoveReason}
          onClose={() => {
            setShowRemoveModal(false);
            setRemoveReason('');
            setRemoveTarget(null);
          }}
          onConfirm={submitApprovedRemoval}
          confirmLabel="Remove Approved Event"
          loading={submittingRemoval}
        />
      )}
    </AdminLayout>
  );
}
