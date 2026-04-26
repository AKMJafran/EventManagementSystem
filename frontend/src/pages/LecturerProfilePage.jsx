import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import LecturerLayout from '../components/layout/LecturerLayout';

export default function LecturerProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', designation: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/lecturer/profile');
      setProfile(response.data);
      setForm({ name: response.data.name || '', designation: response.data.designation || '' });
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axiosInstance.put('/lecturer/profile', form);
      setProfile(response.data);
      setEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LecturerLayout>
        <div className="py-16 text-center text-on-surface-variant">Loading profile...</div>
      </LecturerLayout>
    );
  }

  return (
    <LecturerLayout>
      <section className="mb-8">
        <Link to="/lecturer/dashboard" className="text-sm font-semibold text-on-surface-variant hover:text-primary">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-3 text-5xl font-bold text-primary serif-heading">My Profile</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          View and manage your lecturer profile information.
        </p>
      </section>

      <div className="max-w-2xl">
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-bold text-teal-900">Profile Details</h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Staff ID</span>
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-slate-100 cursor-not-allowed" value={profile?.staffId || ''} readOnly disabled />
                <p className="text-xs text-slate-500 mt-1">Staff ID can only be changed by an administrator.</p>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Department</span>
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-slate-100 cursor-not-allowed" value={profile?.department || ''} readOnly disabled />
                <p className="text-xs text-slate-500 mt-1">Department can only be changed by an administrator.</p>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Designation</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={form.designation}
                  onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-slate-100 cursor-not-allowed" value={profile?.email || ''} readOnly disabled />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setForm({ name: profile?.name || '', designation: profile?.designation || '' }); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-teal-800 text-white font-semibold hover:bg-teal-700 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Full Name', value: profile?.name },
                { label: 'Staff ID', value: profile?.staffId },
                { label: 'Department', value: profile?.department },
                { label: 'Designation', value: profile?.designation },
                { label: 'Email', value: profile?.email },
                { label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
              ].map((field) => (
                <div key={field.label} className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-500">{field.label}</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">{field.value || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-serif font-bold text-teal-900 mb-4">Security</h2>
          <Link
            to="/change-password"
            className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-primary">lock</span>
            <div>
              <p className="text-sm font-semibold text-on-surface">Change Password</p>
              <p className="text-xs text-on-surface-variant">Update your account password</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto">chevron_right</span>
          </Link>
        </section>
      </div>
    </LecturerLayout>
  );
}
