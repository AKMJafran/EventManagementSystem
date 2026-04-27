import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import AdminLayout from '../components/layout/AdminLayout';
import StudentLayout from '../components/layout/StudentLayout';
import LecturerLayout from '../components/layout/LecturerLayout';
import { getPortalLabel } from '../utils/profileRoutes';
import {
  validateName,
  validatePassword,
  validateRequiredText,
} from '../utils/validation';

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

function PasswordField({
  label,
  value,
  onChange,
  error,
  visible,
  onToggle,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={fieldClass(Boolean(error), false)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {visible ? 'visibility' : 'visibility_off'}
          </span>
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-error">{error}</p>}
    </label>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);
  const markPasswordChanged = useAuthStore((state) => state.markPasswordChanged);
  const skipPasswordChange = useAuthStore((state) => state.skipPasswordChange);
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', designation: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const requiredPasswordChange = user?.mustChangePassword || searchParams.get('required') === '1';
  const activeTab = searchParams.get('tab') === 'password' ? 'password' : 'profile';

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

  function openTab(nextTab) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    if (nextTab !== 'password') {
      nextParams.delete('required');
    }
    setSearchParams(nextParams, { replace: true });
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: '' }));
  }

  function handleCancel() {
    setForm({
      name: profile?.name || '',
      designation: profile?.designation || '',
    });
    setErrors({});
  }

  function handlePasswordCancel() {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({});
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

  async function handlePasswordSave(event) {
    event.preventDefault();

    const nextErrors = {
      currentPassword: validateRequiredText(passwordForm.currentPassword, 'Current password'),
      newPassword: validatePassword(passwordForm.newPassword, 'New password'),
      confirmPassword: validateRequiredText(passwordForm.confirmPassword, 'Confirm new password'),
    };

    if (
      !nextErrors.newPassword &&
      passwordForm.newPassword === passwordForm.currentPassword
    ) {
      nextErrors.newPassword = 'New password must be different from the current password.';
    }

    if (
      !nextErrors.confirmPassword &&
      passwordForm.confirmPassword !== passwordForm.newPassword
    ) {
      nextErrors.confirmPassword = 'Confirm new password must match the new password.';
    }

    setPasswordErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please fix the highlighted password fields.');
      return;
    }

    setSavingPassword(true);

    try {
      await axiosInstance.post('/auth/change-password', passwordForm);
      markPasswordChanged();
      handlePasswordCancel();

      if (requiredPasswordChange) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', 'profile');
        nextParams.delete('required');
        setSearchParams(nextParams, { replace: true });
      }

      toast.success('Password updated successfully.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to change password.');
      console.error(error);
    } finally {
      setSavingPassword(false);
    }
  }

  const content = loading ? (
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
            Update your profile details and password from one unified workspace while keeping role-protected fields secure.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-outline-variant/20 bg-white px-5 py-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
            Account Status
          </p>
          <p className="mt-2 text-lg font-semibold text-on-surface">
            {requiredPasswordChange ? 'Password update required' : 'Profile active'}
          </p>
        </div>
      </section>

      {requiredPasswordChange && (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                <span className="material-symbols-outlined mr-1 align-middle text-base">shield_lock</span>
                Password update recommended
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                We recommend changing your temporary password. You can do it now or skip and come back later from your profile.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                skipPasswordChange();
                const dashboard = user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'LECTURER' ? '/lecturer/dashboard' : '/student/dashboard';
                navigate(dashboard);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100"
            >
              <span className="material-symbols-outlined text-base">skip_next</span>
              Skip for Now
            </button>
          </div>
        </section>
      )}

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

      <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ['profile', 'Profile Info'],
            ['password', 'Change Password'],
          ].map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => openTab(tabKey)}
              className={`rounded-[1.25rem] px-5 py-3 text-sm font-semibold transition ${
                activeTab === tabKey
                  ? 'bg-primary text-white shadow-lg shadow-primary/15'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'profile' ? (
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
                  {errors.designation && (
                    <p className="mt-2 text-sm font-medium text-error">{errors.designation}</p>
                  )}
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
                    value={item.value || '-'}
                    readOnly
                    disabled
                    className={fieldClass(false, true)}
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
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface serif-heading">Change Password</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Keep your account secure without leaving the profile workspace.
                </p>
              </div>
              <span className="rounded-full bg-secondary-container px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-on-secondary-container">
                Security
              </span>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handlePasswordSave} noValidate>
              <PasswordField
                label="Current Password"
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                error={passwordErrors.currentPassword}
                visible={visiblePasswords.currentPassword}
                onToggle={() =>
                  setVisiblePasswords((current) => ({
                    ...current,
                    currentPassword: !current.currentPassword,
                  }))
                }
                placeholder="Enter your current password"
              />

              <PasswordField
                label="New Password"
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                error={passwordErrors.newPassword}
                visible={visiblePasswords.newPassword}
                onToggle={() =>
                  setVisiblePasswords((current) => ({
                    ...current,
                    newPassword: !current.newPassword,
                  }))
                }
                placeholder="Use at least 8 characters"
              />

              <PasswordField
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                error={passwordErrors.confirmPassword}
                visible={visiblePasswords.confirmPassword}
                onToggle={() =>
                  setVisiblePasswords((current) => ({
                    ...current,
                    confirmPassword: !current.confirmPassword,
                  }))
                }
                placeholder="Re-enter your new password"
              />

              <div className="flex flex-col gap-3 border-t border-outline-variant/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handlePasswordCancel}
                  className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-gradient inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold text-on-surface serif-heading">Password Guidance</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Use a strong password that is easy for you to remember and hard for others to guess.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Use at least 8 characters.',
                'Choose something different from your current password.',
                'Confirm the new password exactly before saving.',
                'You stay on this profile page after the password update finishes.',
              ].map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );

  return renderLayout(user, content);
}
