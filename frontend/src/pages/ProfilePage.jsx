import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import AdminLayout from '../components/layout/AdminLayout';
import StudentLayout from '../components/layout/StudentLayout';
import LecturerLayout from '../components/layout/LecturerLayout';
import { getPortalLabel } from '../utils/profileRoutes';
import { validateName, validateRequiredText } from '../utils/validation';

function renderLayout(user, children) {
  if (user?.role === 'ADMIN') {
    return <AdminLayout>{children}</AdminLayout>;
  }
  if (user?.role === 'LECTURER') {
    return <LecturerLayout>{children}</LecturerLayout>;
  }
  return <StudentLayout user={user}>{children}</StudentLayout>;
}

function fieldClass(hasError, readOnly = false) {
  return [
    'mt-2 w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none transition',
    readOnly
      ? 'cursor-not-allowed border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
      : 'border-outline-variant/30 bg-white focus:border-primary focus:ring-2 focus:ring-primary/10',
    hasError ? 'border-error bg-error-container/30 focus:border-error focus:ring-error/10' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', designation: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roleDetails = useMemo(() => {
    if (user?.role === 'LECTURER') {
      return [
        { label: 'Email', value: profile?.email, editable: false },
        { label: 'Staff ID', value: profile?.staffId, editable: false },
        { label: 'Department', value: profile?.department, editable: false },
        { label: 'Designation', value: profile?.designation, editable: false },
      ];
    }

    if (user?.role === 'STUDENT') {
      return [
        { label: 'Email', value: profile?.email, editable: false },
        { label: 'Student ID', value: profile?.studentNumber, editable: false },
        { label: 'Department', value: profile?.department, editable: false },
        { label: 'Batch Year', value: profile?.batchYear, editable: false },
      ];
    }

    return [
      { label: 'Email', value: profile?.email, editable: false },
      { label: 'Role', value: getPortalLabel(profile?.role), editable: false },
      { label: 'Faculty', value: profile?.faculty, editable: false },
    ];
  }, [profile, user?.role]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await axiosInstance.get('/users/me/profile');
        if (cancelled) return;
        setProfile(response.data);
        setForm({
          name: response.data?.name || '',
          designation: response.data?.designation || '',
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || 'Failed to load profile.');
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function handleCancel() {
    setForm({
      name: profile?.name || '',
      designation: profile?.designation || '',
    });
    setErrors({});
  }

  async function handleSave(event) {
    event.preventDefault();

    const nextErrors = {
      name: validateName(form.name, 'Full name'),
      designation:
        user?.role === 'LECTURER'
          ? validateRequiredText(form.designation, 'Designation', { min: 2, max: 120 })
          : '',
    };

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please fix the highlighted profile fields.');
      return;
    }

    setSaving(true);

    try {
      const payload =
        user?.role === 'LECTURER'
          ? { name: form.name, designation: form.designation }
          : { name: form.name };

      const response = await axiosInstance.patch('/users/me/profile', payload);
      setProfile(response.data);
      setForm({
        name: response.data?.name || '',
        designation: response.data?.designation || '',
      });
      updateUserProfile({ name: response.data?.name || form.name });
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return renderLayout(
    user,
    loading ? (
      <div className="py-20 text-center text-on-surface-variant">Loading profile...</div>
    ) : (
      <div className="space-y-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Profile Management</p>
            <h1 className="mt-3 serif-heading text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
              My Profile
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-on-surface-variant">
              Review your account information, update the fields available to your role, and keep your portal details current.
            </p>
          </div>

          <Link
            to="/change-password"
            className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 bg-white px-5 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
          >
            Change Password
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Portal', value: getPortalLabel(profile?.role), detail: 'Current role access level.' },
            { label: 'Department', value: profile?.department || 'Faculty-wide', detail: 'Assigned academic unit.' },
            {
              label: 'Member Since',
              value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-',
              detail: 'Account creation date.',
            },
          ].map((item) => (
            <article key={item.label} className="rounded-[1.75rem] border border-outline-variant/15 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">{item.label}</p>
              <p className="mt-3 text-2xl font-bold text-on-surface">{item.value}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{item.detail}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface serif-heading">Editable Details</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Role-protected fields stay read-only to preserve account and approval integrity.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {getPortalLabel(profile?.role)}
              </span>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSave} noValidate>
              <label className="block">
                <span className="text-sm font-semibold text-on-surface">Full Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className={fieldClass(Boolean(errors.name))}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="mt-2 text-sm font-medium text-error">{errors.name}</p>}
              </label>

              {user?.role === 'LECTURER' && (
                <label className="block">
                  <span className="text-sm font-semibold text-on-surface">Designation</span>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(event) => updateField('designation', event.target.value)}
                    className={fieldClass(Boolean(errors.designation))}
                    placeholder="Senior Lecturer"
                  />
                  {errors.designation && <p className="mt-2 text-sm font-medium text-error">{errors.designation}</p>}
                </label>
              )}

              <div className="flex flex-col gap-3 border-t border-outline-variant/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gradient inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold text-on-surface serif-heading">Account Overview</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              These fields are managed by the system or an administrator when required.
            </p>

            <div className="mt-8 space-y-4">
              {roleDetails.map((item) => (
                <label key={item.label} className="block">
                  <span className="text-sm font-semibold text-on-surface">{item.label}</span>
                  <input
                    type="text"
                    value={item.editable ? form[item.key] || '' : item.value || '-'}
                    readOnly={!item.editable}
                    disabled={!item.editable}
                    className={fieldClass(false, !item.editable)}
                  />
                </label>
              ))}

              <label className="block">
                <span className="text-sm font-semibold text-on-surface">Faculty</span>
                <input
                  type="text"
                  value={profile?.faculty || 'Faculty of Technology'}
                  readOnly
                  disabled
                  className={fieldClass(false, true)}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    )
  );
}
