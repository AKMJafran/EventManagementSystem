import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import ModalPortal from '../components/ui/ModalPortal';

const emptyForm = {
  name: '',
  capacity: '',
  location: '',
};

const FILTER_OPTIONS = ['ALL', 'AVAILABLE', 'OCCUPIED'];

function formatDateTime(value) {
  if (!value) return 'No schedule';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getVenueStatusMeta(venueName, approvedEvents) {
  const now = new Date();
  const normalizedVenueName = String(venueName || '').trim().toLowerCase();

  const relatedEvents = approvedEvents.filter(
    (event) => String(event.venue || '').trim().toLowerCase() === normalizedVenueName
  );

  const activeEvents = relatedEvents.filter((event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return start <= now && end >= now;
  });

  const upcomingEvents = relatedEvents
    .filter((event) => new Date(event.startTime) > now)
    .sort((left, right) => new Date(left.startTime) - new Date(right.startTime));

  return {
    status: activeEvents.length > 0 ? 'OCCUPIED' : 'AVAILABLE',
    activeEvents,
    upcomingEvents,
    nextEvent: upcomingEvents[0] || activeEvents[0] || null,
  };
}

function validateVenueForm(formData) {
  const errors = {};

  if (!formData.name.trim()) {
    errors.name = 'Venue name is required.';
  }

  if (!String(formData.capacity).trim()) {
    errors.capacity = 'Capacity is required.';
  } else if (!Number.isInteger(Number(formData.capacity)) || Number(formData.capacity) <= 0) {
    errors.capacity = 'Capacity must be a whole number greater than zero.';
  }

  if (!formData.location.trim()) {
    errors.location = 'Location is required.';
  }

  return errors;
}

function VenueSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-[1.75rem] border border-outline-variant/20 bg-white p-6 shadow-sm"
          >
            <div className="h-4 w-24 rounded-full bg-surface-container-high" />
            <div className="mt-5 h-10 w-20 rounded-full bg-surface-container-high" />
            <div className="mt-4 h-3 w-32 rounded-full bg-surface-container-high" />
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-outline-variant/20 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-outline-variant/15 p-6 lg:grid-cols-[1.2fr_220px_220px]">
          <div className="h-12 rounded-2xl bg-surface-container-high" />
          <div className="h-12 rounded-2xl bg-surface-container-high" />
          <div className="h-12 rounded-2xl bg-surface-container-high" />
        </div>

        <div className="p-6">
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="grid gap-4 border-b border-outline-variant/10 py-5 last:border-b-0 lg:grid-cols-[1.3fr_0.7fr_1fr_0.8fr_1fr_1fr]"
            >
              <div className="h-4 w-2/3 rounded-full bg-surface-container-high" />
              <div className="h-4 w-20 rounded-full bg-surface-container-high" />
              <div className="h-4 w-3/4 rounded-full bg-surface-container-high" />
              <div className="h-4 w-24 rounded-full bg-surface-container-high" />
              <div className="h-4 w-28 rounded-full bg-surface-container-high" />
              <div className="h-10 w-full rounded-2xl bg-surface-container-high" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VenueDrawer({
  mode,
  formData,
  formErrors,
  saving,
  selectedVenue,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!mode) return null;

  const isView = mode === 'view';
  const title = mode === 'create' ? 'Add Venue' : mode === 'edit' ? 'Edit Venue' : 'Venue Overview';

  const drawerContent = (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/35 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="hidden flex-1 lg:block"
        aria-label="Close venue panel"
      />

      <aside
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-drawer-title"
      >
        <div className="border-b border-outline-variant/20 bg-surface-container-low px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Venue Management
              </p>
              <h2 id="venue-drawer-title" className="mt-2 text-3xl font-serif font-bold text-on-surface">
                {title}
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                {isView
                  ? 'Inspect venue details, capacity, and scheduling readiness.'
                  : 'Keep venue details accurate so scheduling and capacity planning stay reliable.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-on-surface-variant hover:bg-white"
              aria-label="Close venue panel"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {isView ? (
            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-low p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  Venue Name
                </p>
                <p className="mt-3 text-3xl font-serif font-bold text-on-surface">
                  {selectedVenue?.name}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-outline-variant/20 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    Capacity
                  </p>
                  <p className="mt-3 text-2xl font-bold text-on-surface">
                    {selectedVenue?.capacity} attendees
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-outline-variant/20 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    Location
                  </p>
                  <p className="mt-3 text-lg font-semibold text-on-surface">
                    {selectedVenue?.location}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <label className="block">
                <span className="text-sm font-semibold text-on-surface">
                  Venue Name <span className="text-error">*</span>
                </span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => onChange('name', event.target.value)}
                  className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm ${
                    formErrors.name
                      ? 'border-error/60 bg-error-container/30'
                      : 'border-outline-variant/35 focus:border-primary'
                  }`}
                  placeholder="Main Auditorium"
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? 'venue-name-error' : undefined}
                />
                {formErrors.name && (
                  <p id="venue-name-error" className="mt-2 text-sm font-medium text-error">
                    {formErrors.name}
                  </p>
                )}
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-on-surface">
                    Capacity <span className="text-error">*</span>
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(event) => onChange('capacity', event.target.value)}
                    className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm ${
                      formErrors.capacity
                        ? 'border-error/60 bg-error-container/30'
                        : 'border-outline-variant/35 focus:border-primary'
                    }`}
                    placeholder="250"
                    aria-invalid={Boolean(formErrors.capacity)}
                    aria-describedby={formErrors.capacity ? 'venue-capacity-error' : 'venue-capacity-help'}
                  />
                  <p id="venue-capacity-help" className="mt-2 text-xs text-on-surface-variant">
                    Use the maximum safe attendee count for this venue.
                  </p>
                  {formErrors.capacity && (
                    <p id="venue-capacity-error" className="mt-2 text-sm font-medium text-error">
                      {formErrors.capacity}
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-on-surface">
                    Location <span className="text-error">*</span>
                  </span>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(event) => onChange('location', event.target.value)}
                    className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm ${
                      formErrors.location
                        ? 'border-error/60 bg-error-container/30'
                        : 'border-outline-variant/35 focus:border-primary'
                    }`}
                    placeholder="Engineering Building, Level 2"
                    aria-invalid={Boolean(formErrors.location)}
                    aria-describedby={formErrors.location ? 'venue-location-error' : undefined}
                  />
                  {formErrors.location && (
                    <p id="venue-location-error" className="mt-2 text-sm font-medium text-error">
                      {formErrors.location}
                    </p>
                  )}
                </label>
              </div>
            </form>
          )}
        </div>

        <div className="border-t border-outline-variant/20 bg-white px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/35 px-5 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
            >
              {isView ? 'Close' : 'Cancel'}
            </button>

            {!isView && (
              <button
                type="submit"
                onClick={onSubmit}
                disabled={saving}
                className="btn-gradient inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 disabled:opacity-60"
              >
                {saving ? 'Saving...' : mode === 'edit' ? 'Save Venue' : 'Create Venue'}
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );

  return <ModalPortal>{drawerContent}</ModalPortal>;
}

function DeleteVenueDialog({ venue, deleting, onClose, onConfirm }) {
  if (!venue) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-error-container text-error">
              <span className="material-symbols-outlined">delete</span>
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-on-surface">Delete Venue</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                This will permanently remove <span className="font-semibold text-on-surface">{venue.name}</span> from
                the venue directory.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/35 px-5 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
            >
              Keep Venue
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex items-center justify-center rounded-2xl bg-error px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-error/10 disabled:opacity-60"
            >
              {deleting ? 'Deleting...' : 'Delete Venue'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function ManageVenues() {
  const [venues, setVenues] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [drawerMode, setDrawerMode] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  async function fetchVenueWorkspace() {
    setLoading(true);

    try {
      const [venueResponse, approvedEventsResponse] = await Promise.all([
        axiosInstance.get('/venues'),
        axiosInstance.get('/events', { params: { status: 'APPROVED' } }),
      ]);

      setVenues(venueResponse.data || []);
      setApprovedEvents(approvedEventsResponse.data || []);
    } catch (error) {
      toast.error('Failed to load venue workspace.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVenueWorkspace();
  }, []);

  const venueRows = useMemo(
    () =>
      venues.map((venue) => {
        const meta = getVenueStatusMeta(venue.name, approvedEvents);

        return {
          ...venue,
          status: meta.status,
          activeEvents: meta.activeEvents,
          upcomingEvents: meta.upcomingEvents,
          nextEvent: meta.nextEvent,
        };
      }),
    [venues, approvedEvents]
  );

  const summary = useMemo(() => {
    const occupied = venueRows.filter((venue) => venue.status === 'OCCUPIED').length;
    return {
      total: venueRows.length,
      occupied,
      available: venueRows.length - occupied,
    };
  }, [venueRows]);

  const filteredVenues = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = venueRows.filter((venue) => {
      const matchesSearch =
        !normalizedSearch ||
        venue.name?.toLowerCase().includes(normalizedSearch) ||
        venue.location?.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'ALL' || venue.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const directionFactor = sortConfig.direction === 'asc' ? 1 : -1;
    return filtered.sort((left, right) => {
      const key = sortConfig.key;

      if (key === 'capacity') {
        return (Number(left.capacity) - Number(right.capacity)) * directionFactor;
      }

      if (key === 'status') {
        return left.status.localeCompare(right.status) * directionFactor;
      }

      if (key === 'nextEvent') {
        const leftTime = left.nextEvent?.startTime ? new Date(left.nextEvent.startTime).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.nextEvent?.startTime ? new Date(right.nextEvent.startTime).getTime() : Number.MAX_SAFE_INTEGER;
        return (leftTime - rightTime) * directionFactor;
      }

      return String(left[key] || '').localeCompare(String(right[key] || '')) * directionFactor;
    });
  }, [venueRows, search, statusFilter, sortConfig]);

  function toggleSort(key) {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return { key, direction: 'asc' };
    });
  }

  function openDrawer(mode, venue = null) {
    setDrawerMode(mode);
    setSelectedVenue(venue);
    setFormErrors({});
    setFormData(
      venue
        ? {
            name: venue.name || '',
            capacity: String(venue.capacity || ''),
            location: venue.location || '',
          }
        : emptyForm
    );
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedVenue(null);
    setFormData(emptyForm);
    setFormErrors({});
  }

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event?.preventDefault();

    const validationErrors = validateVenueForm(formData);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the highlighted venue fields.');
      return;
    }

    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      capacity: Number(formData.capacity),
      location: formData.location.trim(),
    };

    try {
      if (drawerMode === 'edit' && selectedVenue) {
        await axiosInstance.put(`/venues/${selectedVenue.id}`, payload);
        toast.success('Venue updated successfully.');
      } else {
        await axiosInstance.post('/venues', payload);
        toast.success('Venue created successfully.');
      }

      closeDrawer();
      await fetchVenueWorkspace();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save venue.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVenue() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await axiosInstance.delete(`/venues/${deleteTarget.id}`);
      toast.success('Venue deleted successfully.');
      setDeleteTarget(null);
      await fetchVenueWorkspace();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete venue.');
      console.error(error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-primary">Venue Operations</p>
            <h1 className="mt-3 text-4xl font-serif font-bold tracking-tight text-on-surface sm:text-5xl">
              Admin Venue Management
            </h1>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">
              Maintain the venue inventory, review current occupancy, and keep space details ready for dependable event scheduling.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openDrawer('create')}
            className="btn-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold text-white shadow-xl shadow-primary/15"
          >
            <span className="material-symbols-outlined text-base">add_business</span>
            Add Venue
          </button>
        </header>

        {loading ? (
          <VenueSkeleton />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {[
                {
                  label: 'Total Venues',
                  value: summary.total,
                  detail: 'All registered spaces in the booking directory.',
                  icon: 'domain',
                  accent: 'text-primary',
                },
                {
                  label: 'Available Now',
                  value: summary.available,
                  detail: 'Venues with no active approved event occupying them.',
                  icon: 'event_available',
                  accent: 'text-secondary',
                },
                {
                  label: 'Occupied Now',
                  value: summary.occupied,
                  detail: 'Venues currently in use by approved events.',
                  icon: 'meeting_room',
                  accent: 'text-tertiary',
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="rounded-[1.75rem] border border-outline-variant/20 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                        {card.label}
                      </p>
                      <p className="mt-4 text-4xl font-bold text-on-surface">{card.value}</p>
                      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{card.detail}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-low ${card.accent}`}>
                      <span className="material-symbols-outlined">{card.icon}</span>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-outline-variant/20 bg-white shadow-sm">
              <div className="border-b border-outline-variant/15 bg-surface-container-low/60 p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-on-surface">Venue Directory</h2>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Search, filter, and sort the venue inventory without leaving the page.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3 xl:min-w-[720px]">
                    <label className="relative block">
                      <span className="sr-only">Search venues</span>
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                        search
                      </span>
                      <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by venue or location"
                        className="w-full rounded-2xl border border-outline-variant/30 bg-white py-3 pl-12 pr-4 text-sm shadow-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="sr-only">Filter by status</span>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm shadow-sm"
                      >
                        {FILTER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option === 'ALL' ? 'All statuses' : option.charAt(0) + option.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('ALL');
                        setSortConfig({ key: 'name', direction: 'asc' });
                      }}
                      className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm font-semibold text-on-surface-variant shadow-sm hover:bg-surface-container-low"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>

              {filteredVenues.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-primary">
                    <span className="material-symbols-outlined text-3xl">location_off</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-serif font-bold text-on-surface">No venues to show</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
                    No venue matches the current search or filter. Clear the filters or add a new venue to get started.
                  </p>
                  <button
                    type="button"
                    onClick={() => openDrawer('create')}
                    className="mt-6 inline-flex items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
                  >
                    Add Your First Venue
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.22em] text-on-surface-variant">
                          {[
                            ['name', 'Venue'],
                            ['capacity', 'Capacity'],
                            ['location', 'Location'],
                            ['status', 'Status'],
                            ['nextEvent', 'Next Booking'],
                          ].map(([key, label]) => (
                            <th key={key} className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => toggleSort(key)}
                                className="inline-flex items-center gap-2 text-left text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant"
                              >
                                {label}
                                <span className="material-symbols-outlined text-sm">
                                  {sortConfig.key === key && sortConfig.direction === 'desc' ? 'south' : 'north'}
                                </span>
                              </button>
                            </th>
                          ))}
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {filteredVenues.map((venue) => (
                          <tr key={venue.id} className="align-top hover:bg-surface-container-low/40">
                            <td className="px-6 py-5">
                              <p className="text-base font-semibold text-on-surface">{venue.name}</p>
                              <p className="mt-1 text-sm text-on-surface-variant">
                                {venue.activeEvents.length} active, {venue.upcomingEvents.length} upcoming approved events
                              </p>
                            </td>
                            <td className="px-6 py-5 text-sm font-medium text-on-surface">
                              {venue.capacity} attendees
                            </td>
                            <td className="px-6 py-5 text-sm text-on-surface-variant">{venue.location}</td>
                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                                  venue.status === 'OCCUPIED'
                                    ? 'bg-tertiary-container/30 text-on-tertiary-container'
                                    : 'bg-secondary-container text-on-secondary-container'
                                }`}
                              >
                                {venue.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-sm text-on-surface-variant">
                              {venue.nextEvent ? (
                                <>
                                  <p className="font-medium text-on-surface">{venue.nextEvent.title}</p>
                                  <p className="mt-1">{formatDateTime(venue.nextEvent.startTime)}</p>
                                </>
                              ) : (
                                'No approved booking scheduled'
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openDrawer('view', venue)}
                                  className="rounded-2xl border border-outline-variant/30 px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDrawer('edit', venue)}
                                  className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(venue)}
                                  className="rounded-2xl border border-error/20 bg-error/5 px-3 py-2 text-sm font-semibold text-error hover:bg-error/10"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 p-4 lg:hidden">
                    {filteredVenues.map((venue) => (
                      <article
                        key={venue.id}
                        className="rounded-[1.75rem] border border-outline-variant/20 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-serif font-bold text-on-surface">{venue.name}</h3>
                            <p className="mt-2 text-sm text-on-surface-variant">{venue.location}</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                              venue.status === 'OCCUPIED'
                                ? 'bg-tertiary-container/30 text-on-tertiary-container'
                                : 'bg-secondary-container text-on-secondary-container'
                            }`}
                          >
                            {venue.status}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
                          <p>
                            <span className="font-semibold text-on-surface">Capacity:</span> {venue.capacity}
                          </p>
                          <p>
                            <span className="font-semibold text-on-surface">Upcoming:</span>{' '}
                            {venue.nextEvent ? formatDateTime(venue.nextEvent.startTime) : 'No booking'}
                          </p>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openDrawer('view', venue)}
                            className="rounded-2xl border border-outline-variant/30 px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openDrawer('edit', venue)}
                            className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(venue)}
                            className="rounded-2xl border border-error/20 bg-error/5 px-3 py-2 text-sm font-semibold text-error hover:bg-error/10"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <VenueDrawer
        mode={drawerMode}
        formData={formData}
        formErrors={formErrors}
        saving={saving}
        selectedVenue={selectedVenue}
        onChange={updateField}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />

      <DeleteVenueDialog
        venue={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteVenue}
      />
    </AdminLayout>
  );
}
