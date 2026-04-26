import { format } from 'date-fns';
import { z } from 'zod';

const requiredNumberField = (message) =>
  z.preprocess(
    (value) => {
      if (value === '' || value == null) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z.number({ required_error: message, invalid_type_error: message })
  );

const optionalNumberField = z.preprocess((value) => {
  if (value === '' || value == null) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().optional());

export const EVENT_TYPE_OPTIONS = [
  { value: 'CULTURAL', label: 'Cultural' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'URGENT', label: 'Urgent' },
];

export const NON_URGENT_EVENT_TYPE_OPTIONS = EVENT_TYPE_OPTIONS.filter(
  (option) => option.value !== 'URGENT'
);

const baseEventFields = {
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  categoryId: requiredNumberField('Please select a category'),
  subCategoryId: optionalNumberField,
  venue: z.string().min(1, 'Please select a venue'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isMultiDay: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  departmentName: z.string().optional(),
  imageId: z.string().optional(),
};

function withDateValidation(schema) {
  return schema.refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
}

const baseEventObject = z.object(baseEventFields);

export const baseEventSchema = withDateValidation(baseEventObject);

export const individualEventSchema = withDateValidation(baseEventObject.extend({
  organizerType: z.literal('INDIVIDUAL_STUDENT'),
}));

export const clubEventSchema = withDateValidation(baseEventObject.extend({
  organizerType: z.literal('CLUB_EVENT'),
  clubId: requiredNumberField('Club is required'),
}));

export const departmentalEventSchema = withDateValidation(baseEventObject.extend({
  organizerType: z.literal('DEPARTMENTAL'),
  departmentName: z.string().min(2, 'Department name required'),
}));

export const facultyOfficialEventSchema = withDateValidation(baseEventObject.extend({
  organizerType: z.literal('FACULTY_OFFICIAL'),
}));

export const departmentalEditSchema = withDateValidation(baseEventObject.extend({
  departmentName: z.string().min(2, 'Department name required'),
}));

export function normalizeCategories(items = []) {
  return items.map((item) => ({
    ...item,
    name: item.name || item.categoryName || item.label || `Category ${item.id}`,
  }));
}

export function normalizeVenues(items = []) {
  return items.map((venue) => ({
    ...venue,
    label:
      venue.label ||
      `${venue.name || venue.venueName || 'Venue'}${
        venue.capacity ? ` (Capacity: ${venue.capacity})` : ''
      }`,
    value: venue.name || venue.venueName || venue.label || '',
  }));
}

export function toDateTimeLocalValue(dateString) {
  if (!dateString) return '';
  const normalized = String(dateString).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function formatEventDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(String(dateString).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return format(date, 'MMM d, yyyy h:mm a');
}

export function getOrganizerTypeMeta(event = {}) {
  const organizerType = event.organizerType || null;
  if (organizerType === 'CLUB_EVENT') {
    return {
      icon: 'account_balance',
      label: event.clubName ? event.clubName : 'Club Event',
      shortLabel: event.clubName ? `Club: ${event.clubName}` : 'Club',
      badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
    };
  }

  if (organizerType === 'DEPARTMENTAL') {
    return {
      icon: 'school',
      label: event.departmentName ? `${event.departmentName} Event` : 'Departmental Event',
      shortLabel: event.departmentName || 'Departmental',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
  }

  if (organizerType === 'FACULTY_OFFICIAL') {
    return {
      icon: 'star',
      label: 'Official Faculty Event',
      shortLabel: 'Official',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    };
  }

  return {
    icon: 'person',
    label: 'Event Request',
    shortLabel: 'Event',
    badgeClass: 'bg-sky-100 text-sky-800 border border-sky-200',
  };
}

export function getApprovalStageMeta(event = {}) {
  const stage = event.approvalStage;
  const status = event.status;

  if (status === 'APPROVED') {
    return {
      label: 'Approved',
      detail: 'Approved',
      pillClass: 'bg-green-100 text-green-800 border border-green-200',
      icon: 'task_alt',
    };
  }

  if (status === 'REJECTED') {
    return {
      label: 'Rejected',
      detail: event.rejectReason ? `Rejected: ${event.rejectReason}` : 'Rejected',
      pillClass: 'bg-red-100 text-red-800 border border-red-200',
      icon: 'cancel',
    };
  }

  if (stage === 'PENDING_TREASURER') {
    return {
      label: 'Awaiting Treasurer Review',
      detail: 'Waiting for Treasurer Approval',
      pillClass: 'bg-orange-100 text-orange-800 border border-orange-200',
      icon: 'hourglass_top',
    };
  }

  if (stage === 'PENDING_DEAN') {
    return {
      label: 'Awaiting Dean Review',
      detail: 'Waiting for Dean Approval',
      pillClass: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      icon: 'schedule',
    };
  }

  if (status === 'PENDING') {
    return {
      label: 'Pending Review',
      detail: 'Pending Review',
      pillClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      icon: 'pending_actions',
    };
  }

  if (status === 'CANCELLED') {
    return {
      label: 'Cancelled',
      detail: event.rejectReason ? `Cancelled: ${event.rejectReason}` : 'Cancelled',
      pillClass: 'bg-slate-200 text-slate-700 border border-slate-300',
      icon: 'event_busy',
    };
  }

  return {
    label: stage ? stage.replaceAll('_', ' ') : 'Unknown',
    detail: stage ? stage.replaceAll('_', ' ') : 'Unknown',
    pillClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    icon: 'info',
  };
}

export function canEditStudentEvent(event = {}) {
  return event.status === 'PENDING';
}

export function canEditLecturerEvent(event = {}) {
  return event.status === 'PENDING';
}

export function extractReadableErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.details ||
    fallbackMessage
  );
}

export function isVenueConflictError(error) {
  const rawMessage = [
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return error?.response?.status === 409 || rawMessage.includes('conflict');
}

export function eventBelongsToCurrentUser(event, user) {
  if (event?.ownedByCurrentUser === true) return true;
  if (event?.ownedByCurrentUser === false) return false;
  const currentUserId = Number(user?.id);
  if (Number.isNaN(currentUserId) || event?.userId == null) {
    return false;
  }
  return currentUserId === Number(event.userId);
}
