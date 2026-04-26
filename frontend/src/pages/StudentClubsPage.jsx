import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import {
  getAllClubs,
  getAllLecturers,
  getAllStudents,
  getAvailableRoles,
  getClubMembers,
  getMyClub,
  joinClubWithRole,
  submitClubRegistration,
  updateClub,
} from '../api/clubApi';
import StudentLayout from '../components/layout/StudentLayout';
import ClubTypeTag from '../components/ui/ClubTypeTag';
import StatusBadge from '../components/ui/StatusBadge';
import ModalPortal from '../components/ui/ModalPortal';
import MemberRolePill from '../components/clubs/MemberRolePill';
import useAuthStore from '../context/AuthContext';
import {
  getExecutiveCommitteeEntries,
  getGeneralMembers,
  getOpenRoleCount,
  getRoleDescription,
  getRoleDisplayName,
  getRoleIcon,
} from '../utils/clubRoles';

const CLUB_TYPES = ['ACADEMIC', 'CULTURAL', 'SPORTS', 'TECHNICAL'];

function buildClubSchema(currentUserId) {
  return z
    .object({
      name: z.string().min(3, 'Min 3 characters').max(100, 'Max 100 characters'),
      type: z.enum(['ACADEMIC', 'CULTURAL', 'SPORTS', 'TECHNICAL'], {
        required_error: 'Please select a club type',
      }),
      description: z
        .string()
        .min(20, 'Description must be at least 20 characters')
        .max(500, 'Max 500 characters'),
      seniorTreasurerLecturerId: z.number({
        required_error: 'Please select a Senior Treasurer',
      }),
      secretaryUserId: z.number({
        required_error: 'Please select a Secretary',
      }),
      treasurerUserId: z.number({
        required_error: 'Please select a Student Treasurer',
      }),
    })
    .superRefine((value, context) => {
      if (value.secretaryUserId === value.treasurerUserId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Secretary and Treasurer must be different students',
          path: ['treasurerUserId'],
        });
      }

      if (currentUserId != null && value.secretaryUserId === currentUserId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'President and Secretary must be different students',
          path: ['secretaryUserId'],
        });
      }

      if (currentUserId != null && value.treasurerUserId === currentUserId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'President and Treasurer must be different students',
          path: ['treasurerUserId'],
        });
      }
    });
}

const registrationDefaults = {
  name: '',
  type: 'ACADEMIC',
  description: '',
  seniorTreasurerLecturerId: undefined,
  secretaryUserId: undefined,
  treasurerUserId: undefined,
};

function formatDate(value) {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ClubStatusStepper({ currentStatus }) {
  const steps = [
    {
      key: 'submitted',
      label: 'Submitted',
      description: 'Registration sent',
      state: 'complete',
    },
    {
      key: 'treasurer',
      label: 'Treasurer Review',
      description:
        currentStatus === 'PENDING_TREASURER'
          ? 'Awaiting review'
          : currentStatus === 'PENDING_DEAN' || currentStatus === 'ACTIVE'
            ? 'Approved'
            : currentStatus === 'REJECTED'
              ? 'Decision issued'
              : 'Pending',
      state:
        currentStatus === 'PENDING_TREASURER'
          ? 'active'
          : currentStatus === 'PENDING_DEAN' || currentStatus === 'ACTIVE'
            ? 'complete'
            : currentStatus === 'REJECTED'
              ? 'rejected'
              : 'upcoming',
    },
    {
      key: 'dean',
      label: 'Dean Review',
      description:
        currentStatus === 'PENDING_DEAN'
          ? 'Awaiting approval'
          : currentStatus === 'ACTIVE'
            ? 'Approved'
            : currentStatus === 'REJECTED'
              ? 'Decision issued'
              : 'Not started yet',
      state:
        currentStatus === 'PENDING_DEAN'
          ? 'active'
          : currentStatus === 'ACTIVE'
            ? 'complete'
            : currentStatus === 'REJECTED'
              ? 'rejected'
              : 'upcoming',
    },
    {
      key: 'active',
      label: 'Active',
      description: currentStatus === 'ACTIVE' ? 'Club is active' : 'Final stage',
      state: currentStatus === 'ACTIVE' ? 'complete' : 'upcoming',
    },
  ];

  const getCircleClasses = (state) => {
    switch (state) {
      case 'complete':
        return 'border-emerald-500 bg-emerald-500 text-white';
      case 'active':
        return 'border-blue-200 bg-blue-600 text-white ring-4 ring-blue-100';
      case 'rejected':
        return 'border-rose-500 bg-rose-500 text-white';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-400';
    }
  };

  const getLabelClasses = (state) => {
    switch (state) {
      case 'complete':
        return 'text-emerald-700';
      case 'active':
        return 'text-blue-700';
      case 'rejected':
        return 'text-rose-700';
      default:
        return 'text-slate-500';
    }
  };

  const getConnectorClasses = (state) => {
    switch (state) {
      case 'complete':
        return 'bg-emerald-400';
      case 'rejected':
        return 'bg-rose-200';
      default:
        return 'bg-slate-200';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.key} className="relative flex items-start gap-3">
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getCircleClasses(step.state)}`}>
              {step.state === 'complete' ? (
                <span className="material-symbols-outlined text-[18px]">check</span>
              ) : step.state === 'rejected' ? (
                <span className="material-symbols-outlined text-[18px]">close</span>
              ) : (
                index + 1
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${getLabelClasses(step.state)}`}>{step.label}</p>
              <p className="mt-1 text-xs text-slate-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`absolute left-5 top-10 hidden h-0.5 w-[calc(100%-1.25rem)] translate-x-6 md:block ${getConnectorClasses(step.state)}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistrationModal({
  open,
  onClose,
  onRetryLecturers,
  onRetryStudents,
  lecturers,
  students,
  lecturersLoading,
  studentsLoading,
  lecturersError,
  studentsError,
  onSubmit,
  submitting,
  currentUserId,
  editingClub,
}) {
  const isEditMode = !!editingClub;
  const schema = useMemo(() => buildClubSchema(currentUserId), [currentUserId]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: registrationDefaults,
  });

  const description = useWatch({ control, name: 'description' }) || '';

  useEffect(() => {
    if (!open) {
      reset(registrationDefaults);
    } else if (isEditMode && editingClub) {
      reset({
        name: editingClub.name || '',
        type: editingClub.type || 'ACADEMIC',
        description: editingClub.description || '',
        seniorTreasurerLecturerId: editingClub.seniorTreasurerLecturerId ?? undefined,
        secretaryUserId: editingClub.secretaryUserId ?? undefined,
        treasurerUserId: editingClub.studentTreasurerUserId ?? undefined,
      });
    }
  }, [open, reset, isEditMode, editingClub]);

  if (!open) {
    return null;
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-8 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Club Registration' : 'Register a New Club'}</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Your request will be reviewed by the Senior Treasurer and then approved by the Dean.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="overflow-y-auto px-8 py-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Club Name *</label>
                <input
                  type="text"
                  {...register('name')}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                    errors.name ? 'border-rose-400 ring-1 ring-rose-100' : 'border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                  placeholder="e.g. Innovation Circle"
                />
                {errors.name && <p className="mt-1 text-sm text-rose-600">{errors.name.message}</p>}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Club Type *</label>
                  <select
                    {...register('type')}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                      errors.type ? 'border-rose-400 ring-1 ring-rose-100' : 'border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary'
                    }`}
                  >
                    {CLUB_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0) + type.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-rose-600">{errors.type.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Senior Treasurer *</label>
                  <Controller
                    name="seniorTreasurerLecturerId"
                    control={control}
                    render={({ field }) => (
                      <select
                        name={field.name}
                        ref={field.ref}
                        value={field.value ?? ''}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(value ? Number(value) : undefined);
                        }}
                        disabled={lecturersLoading || !!lecturersError}
                        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                          errors.seniorTreasurerLecturerId
                            ? 'border-rose-400 ring-1 ring-rose-100'
                            : 'border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      >
                        <option value="">{lecturersLoading ? 'Loading lecturers...' : 'Select a lecturer'}</option>
                        {lecturers.map((lecturer) => (
                          <option key={lecturer.id} value={lecturer.id}>
                            {lecturer.name} - {lecturer.department || 'Department N/A'} ({lecturer.staffId || 'Staff ID N/A'})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.seniorTreasurerLecturerId && (
                    <p className="mt-1 text-sm text-rose-600">{errors.seniorTreasurerLecturerId.message}</p>
                  )}
                </div>
              </div>

              {lecturersError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p>Could not load lecturers. Please try again.</p>
                  <button
                    type="button"
                    onClick={onRetryLecturers}
                    className="mt-3 inline-flex items-center rounded-xl bg-white px-3 py-2 font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">Initial Executive Committee</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose the student members who will serve as Secretary and Student Treasurer for the registration.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Secretary *</label>
                    <Controller
                      name="secretaryUserId"
                      control={control}
                      render={({ field }) => (
                        <select
                          name={field.name}
                          ref={field.ref}
                          value={field.value ?? ''}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            const value = event.target.value;
                            field.onChange(value ? Number(value) : undefined);
                          }}
                          disabled={studentsLoading || !!studentsError}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                            errors.secretaryUserId
                              ? 'border-rose-400 ring-1 ring-rose-100'
                              : 'border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary'
                          }`}
                        >
                          <option value="">{studentsLoading ? 'Loading students...' : 'Select a student'}</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.fullName} - {student.studentNumber} ({student.department || 'Department N/A'})
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.secretaryUserId && <p className="mt-1 text-sm text-rose-600">{errors.secretaryUserId.message}</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Student Treasurer *</label>
                    <Controller
                      name="treasurerUserId"
                      control={control}
                      render={({ field }) => (
                        <select
                          name={field.name}
                          ref={field.ref}
                          value={field.value ?? ''}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            const value = event.target.value;
                            field.onChange(value ? Number(value) : undefined);
                          }}
                          disabled={studentsLoading || !!studentsError}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                            errors.treasurerUserId
                              ? 'border-rose-400 ring-1 ring-rose-100'
                              : 'border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary'
                          }`}
                        >
                          <option value="">{studentsLoading ? 'Loading students...' : 'Select a student'}</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.fullName} - {student.studentNumber} ({student.department || 'Department N/A'})
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.treasurerUserId && <p className="mt-1 text-sm text-rose-600">{errors.treasurerUserId.message}</p>}
                  </div>
                </div>

                {studentsError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <p>Could not load students. Please try again.</p>
                    <button
                      type="button"
                      onClick={onRetryStudents}
                      className="mt-3 inline-flex items-center rounded-xl bg-white px-3 py-2 font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-800">Description *</label>
                  <span className="text-xs font-medium text-slate-500">{description.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  {...register('description')}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                    errors.description
                      ? 'border-rose-400 ring-1 ring-rose-100'
                      : 'border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                  placeholder="Describe the purpose, activities, and value your club will bring to students."
                />
                {errors.description && <p className="mt-1 text-sm text-rose-600">{errors.description.message}</p>}
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
                <p className="text-sm font-semibold text-sky-900">Approval Process</p>
                <div className="mt-2 space-y-1 text-sm text-sky-800">
                  <p>1. Selected lecturer reviews and approves</p>
                  <p>2. Dean gives final approval</p>
                  <p>3. President role is activated automatically with the club</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit Club Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function RoleOptionCard({ roleOption, selected, onSelect }) {
  const icon = getRoleIcon(roleOption.role);
  const description = getRoleDescription(roleOption.role);
  const disabled = !roleOption.available;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(roleOption.role)}
      className={`rounded-2xl border p-4 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-100/80 text-slate-400'
          : selected
            ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
            : 'border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">
            {icon}
          </span>
          <div>
            <p className={`font-semibold ${disabled ? 'text-slate-500' : 'text-slate-900'}`}>{roleOption.displayName}</p>
            <p className={`mt-1 text-sm ${disabled ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
          </div>
        </div>
        {!disabled && selected && (
          <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">Selected</span>
        )}
      </div>

      <div className="mt-4 text-sm">
        {disabled ? (
          <span className="font-medium text-slate-500">Taken by {roleOption.takenBy || 'another member'}</span>
        ) : (
          <span className="font-medium text-primary">Select this role</span>
        )}
      </div>
    </button>
  );
}

function JoinClubModal({
  club,
  roleOptions,
  loading,
  error,
  selectedRole,
  joining,
  onClose,
  onRetry,
  onSelectRole,
  onJoin,
}) {
  if (!club) {
    return null;
  }

  const selectedRoleOption = roleOptions.find((role) => role.role === selectedRole);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-8 py-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">Join {club.name}</h2>
                <ClubTypeTag type={club.type} />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Select your role in the club. General Member is pre-selected and always open.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="overflow-y-auto px-8 py-8">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">Select Your Role</h3>
              <p className="mt-1 text-sm text-slate-500">Unavailable positions are shown with the student who already holds them.</p>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-slate-50 py-16 text-center text-slate-500">Loading roles...</div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700">
                <p>Could not load club roles right now.</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 rounded-xl bg-white px-4 py-2 font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {roleOptions.map((roleOption) => (
                    <RoleOptionCard
                      key={roleOption.role}
                      roleOption={roleOption}
                      selected={selectedRole === roleOption.role}
                      onSelect={onSelectRole}
                    />
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Selected role: {selectedRoleOption?.displayName || 'Choose a role'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRoleOption ? getRoleDescription(selectedRoleOption.role) : 'Pick an available role to continue.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedRoleOption || joining}
                    onClick={onJoin}
                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {joining
                      ? 'Joining...'
                      : `Join as ${selectedRoleOption?.displayName || 'Selected Role'}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ExecutiveCommitteeSection({ club }) {
  const executiveCommittee = getExecutiveCommitteeEntries(club);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-5">
        <h3 className="text-2xl font-bold text-slate-900">Executive Committee</h3>
        <p className="mt-1 text-sm text-slate-500">Leadership snapshot for your active club.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="divide-y divide-slate-100 bg-white">
          <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                {getRoleIcon('SENIOR_TREASURER')}
              </span>
              <div>
                <p className="font-semibold text-slate-900">Senior Treasurer</p>
                <p className="text-sm text-slate-500">Lecturer</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="font-semibold text-slate-900">{club.seniorTreasurerLecturerName || 'Not assigned'}</p>
              <p className="text-sm text-slate-500">{club.seniorTreasurerStaffId || '(Lecturer)'}</p>
            </div>
          </div>

          {executiveCommittee.map((member) => (
            <div key={`${member.role}-${member.memberName}`} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {getRoleIcon(member.role)}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{member.displayName || getRoleDisplayName(member.role)}</p>
                  <p className="text-sm text-slate-500">{member.role}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="font-semibold text-slate-900">{member.memberName || 'Not assigned'}</p>
                <p className="text-sm text-slate-500">{member.memberStudentNumber || 'N/A'}</p>
              </div>
            </div>
          ))}

          {executiveCommittee.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-500">No executive committee assignments available yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentClubsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [clubs, setClubs] = useState([]);
  const [myClub, setMyClub] = useState(null);
  const [myClubMembers, setMyClubMembers] = useState([]);
  const [joinedClubIds, setJoinedClubIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [joinModalClub, setJoinModalClub] = useState(null);
  const [joinRoleOptions, setJoinRoleOptions] = useState([]);
  const [joinRolesLoading, setJoinRolesLoading] = useState(false);
  const [joinRolesError, setJoinRolesError] = useState(false);
  const [selectedJoinRole, setSelectedJoinRole] = useState('GENERAL_MEMBER');
  const [joiningClubId, setJoiningClubId] = useState(null);
  const [lecturers, setLecturers] = useState([]);
  const [students, setStudents] = useState([]);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [lecturersError, setLecturersError] = useState(false);
  const [studentsError, setStudentsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const { user } = useAuthStore();

  const currentUserId = user?.id != null ? Number(user.id) : null;

  const availableStudents = useMemo(
    () => students.filter((student) => Number(student.id) !== currentUserId && student.isActive !== false),
    [students, currentUserId]
  );

  const canRegisterNewClub = !myClub || myClub.status === 'REJECTED' || myClub.status === 'INACTIVE';
  const hasRegistrationInProgress =
    myClub?.status === 'PENDING_TREASURER' || myClub?.status === 'PENDING_DEAN' || myClub?.status === 'ACTIVE';
  const isPresidentOfActiveClub = myClub?.status === 'ACTIVE';
  const isPendingClub = myClub?.status === 'PENDING_TREASURER' || myClub?.status === 'PENDING_DEAN';
  const generalMembers = useMemo(() => getGeneralMembers(myClubMembers), [myClubMembers]);
  const joinedClubSet = useMemo(() => new Set(joinedClubIds), [joinedClubIds]);
  const treasurerMeta = myClub?.seniorTreasurerStaffId || myClub?.seniorTreasurerLecturerEmail || 'Not available';

  useEffect(() => {
    if (isRegistrationModalOpen && lecturers.length === 0 && !lecturersLoading) {
      void fetchLecturers();
    }
  }, [isRegistrationModalOpen, lecturers.length, lecturersLoading]);

  useEffect(() => {
    if (isRegistrationModalOpen && students.length === 0 && !studentsLoading) {
      void fetchStudents();
    }
  }, [isRegistrationModalOpen, students.length, studentsLoading]);

  useEffect(() => {
    if (!joinModalClub) {
      setJoinRoleOptions([]);
      setJoinRolesError(false);
      setSelectedJoinRole('GENERAL_MEMBER');
      return;
    }

    void loadAvailableRoles(joinModalClub.id);
  }, [joinModalClub]);

  useEffect(() => {
    if (activeTab === 'my' && myClub?.status === 'ACTIVE') {
      void fetchMyClubMembers(myClub.id);
    }
  }, [activeTab, myClub]);

  const fetchJoinedClubIds = useCallback(async (clubList) => {
    if (!currentUserId || clubList.length === 0) {
      return [];
    }

    const memberIds = new Set();
    const membershipResponses = await Promise.allSettled(
      clubList.map((club) => getClubMembers(club.id))
    );

    membershipResponses.forEach((result, index) => {
      const club = clubList[index];
      if (club.presidentId === currentUserId) {
        memberIds.add(club.id);
        return;
      }

      if (result.status === 'fulfilled') {
        const members = result.value.data || [];
        if (members.some((member) => Number(member.userId) === currentUserId)) {
          memberIds.add(club.id);
        }
      }
    });

    return [...memberIds];
  }, [currentUserId]);

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [clubsResponse, myClubResponse] = await Promise.all([getAllClubs(), loadMyClub()]);
      const nextClubs = clubsResponse.data || [];
      setClubs(nextClubs);
      setMyClub(myClubResponse);

      const memberClubIds = await fetchJoinedClubIds(nextClubs);
      setJoinedClubIds(memberClubIds);

      if (myClubResponse?.status === 'ACTIVE') {
        await fetchMyClubMembers(myClubResponse.id);
      } else {
        setMyClubMembers([]);
      }
    } catch (error) {
      toast.error('Failed to load clubs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [fetchJoinedClubIds]);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  const loadMyClub = async () => {
    try {
      const response = await getMyClub();
      return response.data || null;
    } catch (error) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  };

  const fetchLecturers = async () => {
    setLecturersLoading(true);
    setLecturersError(false);
    try {
      const response = await getAllLecturers();
      setLecturers(response.data || []);
    } catch (error) {
      setLecturersError(true);
      console.error('Failed to load lecturers', error);
    } finally {
      setLecturersLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    setStudentsError(false);
    try {
      const response = await getAllStudents();
      setStudents(response.data || []);
    } catch (error) {
      setStudentsError(true);
      console.error('Failed to load students', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchMyClubMembers = async (clubId) => {
    setLoadingMembers(true);
    try {
      const response = await getClubMembers(clubId);
      setMyClubMembers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch club members', error);
      toast.error('Failed to load club members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadAvailableRoles = async (clubId) => {
    setJoinRolesLoading(true);
    setJoinRolesError(false);
    try {
      const response = await getAvailableRoles(clubId);
      const roles = response.data || [];
      setJoinRoleOptions(roles);
      const defaultRole =
        roles.find((role) => role.role === 'GENERAL_MEMBER' && role.available)?.role ||
        roles.find((role) => role.available)?.role ||
        'GENERAL_MEMBER';
      setSelectedJoinRole(defaultRole);
    } catch (error) {
      setJoinRolesError(true);
      console.error('Failed to load available roles', error);
    } finally {
      setJoinRolesLoading(false);
    }
  };

  const openRegistrationModal = () => {
    if (!canRegisterNewClub) {
      return;
    }
    setEditingClub(null);
    setIsRegistrationModalOpen(true);
  };

  const openEditModal = () => {
    if (!myClub || !isPendingClub) {
      return;
    }
    setEditingClub(myClub);
    setIsRegistrationModalOpen(true);
  };

  const openJoinClubModal = (club) => {
    const isOwnClub = myClub?.id === club.id && myClub?.presidentId === currentUserId;
    if (isOwnClub || joinedClubSet.has(club.id)) {
      return;
    }
    setJoinModalClub(club);
  };

  const handleJoinClub = async () => {
    if (!joinModalClub || !selectedJoinRole) {
      toast.error('Please select a role');
      return;
    }

    setJoiningClubId(joinModalClub.id);
    try {
      await joinClubWithRole(joinModalClub.id, selectedJoinRole);
      const selectedRoleOption = joinRoleOptions.find((role) => role.role === selectedJoinRole);
      toast.success(`You joined ${joinModalClub.name} as ${selectedRoleOption?.displayName || getRoleDisplayName(selectedJoinRole)}! 🎉`);
      setJoinModalClub(null);
      await fetchPageData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to join club');
      await loadAvailableRoles(joinModalClub.id);
    } finally {
      setJoiningClubId(null);
    }
  };

  const handleRegistrationSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingClub) {
        await updateClub(editingClub.id, values);
        setIsRegistrationModalOpen(false);
        setEditingClub(null);
        toast.success('Club updated successfully! Status reset to Treasurer review.');
      } else {
        await submitClubRegistration(values);
        setIsRegistrationModalOpen(false);
        toast.success('Club registration submitted successfully! Waiting for Senior Treasurer approval.');
      }
      await fetchPageData();
      setActiveTab('my');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save club');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout>
      <section className="mb-8">
        <h1 className="mb-3 text-5xl font-bold text-primary serif-heading">Clubs & Societies</h1>
        <p className="max-w-3xl text-lg text-on-surface-variant">
          Discover active clubs across campus, join communities that match your interests, or start one of your own.
        </p>
      </section>

      <section className="mb-8">
        {isPresidentOfActiveClub ? (
          <div className="flex flex-col gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-bold text-emerald-900">You are the President of {myClub.name}</p>
              <p className="mt-1 text-sm text-emerald-800">Your club is active and ready to welcome members.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              View My Club
            </button>
          </div>
        ) : canRegisterNewClub ? (
          <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">Want to start a club?</p>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Register your club and bring students together. You will choose the initial executive team before the request goes through Treasurer and Dean approval.
                </p>
              </div>
              <button
                type="button"
                onClick={openRegistrationModal}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
              >
                + Register a New Club
              </button>
            </div>
          </div>
        ) : hasRegistrationInProgress ? (
          <div className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-bold text-amber-900">You already have a club registration in progress</p>
              <p className="mt-1 text-sm text-amber-800">
                Your current registration must be approved or resolved before you can submit another club.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className="rounded-2xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              View My Club
            </button>
          </div>
        ) : null}
      </section>

      <div className="mb-6 flex space-x-4 border-b border-slate-200">
        <button
          className={`px-4 py-3 font-semibold transition ${activeTab === 'all' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('all')}
        >
          All Clubs
        </button>
        <button
          className={`px-4 py-3 font-semibold transition ${activeTab === 'my' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('my')}
        >
          My Club
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading clubs...</div>
      ) : activeTab === 'all' ? (
        clubs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center text-slate-500 shadow-sm">
            No active clubs yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {clubs.map((club) => {
              const isOwnClub = myClub?.id === club.id && myClub?.presidentId === currentUserId;
              const isJoined = joinedClubSet.has(club.id);
              const openRoles = getOpenRoleCount(club);

              return (
                <article key={club.id} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{club.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">President: {club.presidentName || 'Student President'}</p>
                    </div>
                    <ClubTypeTag type={club.type} />
                  </div>

                  <p className="mb-5 flex-1 text-sm leading-6 text-slate-600">{club.description || 'No description available.'}</p>

                  <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-700">Senior Treasurer</span>
                      <span>{club.seniorTreasurerLecturerName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-700">Members</span>
                      <span>{club.memberCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-700">Open leadership roles</span>
                      <span>{openRoles}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openJoinClubModal(club)}
                    disabled={isOwnClub || isJoined}
                    className="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isOwnClub ? 'You lead this club' : isJoined ? 'Joined ✓' : 'Join Club'}
                  </button>
                </article>
              );
            })}
          </div>
        )
      ) : myClub ? (
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold text-slate-900">{myClub.name}</h2>
                  <ClubTypeTag type={myClub.type} />
                  <StatusBadge status={myClub.status} />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{myClub.description || 'No description available.'}</p>
              </div>
              {isPendingClub && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/20"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit Club
                </button>
              )}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">President</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{myClub.presidentName || user?.name || 'N/A'}</p>
                <p className="mt-1 text-xs text-slate-500">{myClub.presidentStudentNumber || 'Student number N/A'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Senior Treasurer</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{myClub.seniorTreasurerLecturerName || 'Not assigned'}</p>
                <p className="mt-1 text-xs text-slate-500">{treasurerMeta}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Submitted</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(myClub.createdAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Secretary</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{myClub.secretaryName || 'Not assigned'}</p>
                <p className="mt-1 text-xs text-slate-500">{myClub.secretaryStudentNumber || 'Student number N/A'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Treasurer</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{myClub.studentTreasurerName || 'Not assigned'}</p>
                <p className="mt-1 text-xs text-slate-500">{myClub.studentTreasurerStudentNumber || 'Student number N/A'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Members</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{myClub.memberCount || 0}</p>
                <p className="mt-1 text-xs text-slate-500">{myClub.status === 'ACTIVE' ? `${generalMembers.length} general members` : 'Roster activates after approval'}</p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Registration Status</h3>
              <ClubStatusStepper currentStatus={myClub.status} />
            </div>

            {myClub.status === 'REJECTED' && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
                <p className="text-sm font-semibold text-rose-900">
                  Rejected: {myClub.rejectionReason || 'No reason was provided.'}
                </p>
                <button
                  type="button"
                  onClick={openRegistrationModal}
                  className="mt-4 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                >
                  Submit a New Club
                </button>
              </div>
            )}
          </div>

          {myClub.status === 'ACTIVE' && (
            <>
              <ExecutiveCommitteeSection club={myClub} />

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">All Members ({myClub.memberCount || 0})</h3>
                    <p className="mt-1 text-sm text-slate-500">Full roster including executive positions and general members.</p>
                  </div>
                </div>

                {loadingMembers ? (
                  <div className="py-12 text-center text-slate-500">Loading members...</div>
                ) : myClubMembers.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 py-12 text-center text-slate-500">No members yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Student Number</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {myClubMembers.map((member) => (
                          <tr key={member.id || member.userId} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-medium text-slate-900">{member.fullName || member.userName || 'Unknown Member'}</td>
                            <td className="px-4 py-3 text-slate-600">{member.studentNumber || member.userEmail || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <MemberRolePill role={member.memberRole} displayName={member.displayName} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(member.joinedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white px-8 py-14 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-4xl">apartment</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">You have not registered a club yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Start a club and bring your fellow students together. Your registration will go through Treasurer and Dean approval before becoming active.
          </p>
          <button
            type="button"
            onClick={openRegistrationModal}
            className="mt-8 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
          >
            + Register a New Club
          </button>
        </div>
      )}

      <RegistrationModal
        open={isRegistrationModalOpen}
        onClose={() => { setIsRegistrationModalOpen(false); setEditingClub(null); }}
        onRetryLecturers={() => void fetchLecturers()}
        onRetryStudents={() => void fetchStudents()}
        lecturers={lecturers}
        students={availableStudents}
        lecturersLoading={lecturersLoading}
        studentsLoading={studentsLoading}
        lecturersError={lecturersError}
        studentsError={studentsError}
        onSubmit={handleRegistrationSubmit}
        submitting={submitting}
        currentUserId={currentUserId}
        editingClub={editingClub}
      />

      <JoinClubModal
        club={joinModalClub}
        roleOptions={joinRoleOptions}
        loading={joinRolesLoading}
        error={joinRolesError}
        selectedRole={selectedJoinRole}
        joining={joiningClubId === joinModalClub?.id}
        onClose={() => setJoinModalClub(null)}
        onRetry={() => {
          if (joinModalClub) {
            void loadAvailableRoles(joinModalClub.id);
          }
        }}
        onSelectRole={setSelectedJoinRole}
        onJoin={() => void handleJoinClub()}
      />
    </StudentLayout>
  );
}
