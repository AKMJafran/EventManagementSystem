import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import ModalPortal from '../components/ui/ModalPortal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const emptyForm = {
  name: '',
  email: '',
  staffId: '',
  department: 'ICT',
  designation: '',
};

const sampleColumns = ['staffId', 'email', 'name', 'department', 'designation'];

const normalizeImportedRow = (row) => ({
  staffId: String(row.staffId || row.StaffId || row.staff_id || '').trim(),
  email: String(row.email || row.Email || row.officialEmail || row.OfficialEmail || '').trim(),
  name: String(row.name || row.Name || row.fullName || row.FullName || '').trim(),
  department: String(row.department || row.Department || '').trim(),
  designation: String(row.designation || row.Designation || '').trim(),
});

const cleanCsvValue = (value) => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"');

const parseCsv = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map(cleanCsvValue);
  return lines.slice(1).map((line) => {
    const values = line.split(',').map(cleanCsvValue);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return normalizeImportedRow(row);
  });
};

function LecturerFormModal({ lecturer, form, saving, onClose, onChange, onSubmit }) {
  if (!lecturer) {
    return null;
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Lecturer Account</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Edit Lecturer</h2>
              <p className="mt-2 text-sm text-slate-600">Update lecturer details while preserving existing portal access rules.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close edit lecturer modal"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Full Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                name="name"
                value={form.name}
                onChange={onChange}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Official Email</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                value={form.email}
                disabled
                readOnly
              />
              <p className="mt-2 text-xs text-slate-500">Email changes remain locked to avoid breaking current sign-in identifiers.</p>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Staff ID</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                value={form.staffId}
                disabled
                readOnly
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Department</span>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                name="department"
                value={form.department}
                onChange={onChange}
              >
                <option value="ICT">ICT</option>
                <option value="ET">ET</option>
                <option value="BST">BST</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Designation</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                name="designation"
                value={form.designation}
                onChange={onChange}
                required
              />
            </label>

            <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function ManageLecturers() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [editingLecturer, setEditingLecturer] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [importSummary, setImportSummary] = useState(null);

  const activeCount = useMemo(
    () => lecturers.filter((lecturer) => lecturer.isActive).length,
    [lecturers]
  );

  const pendingFirstLoginCount = useMemo(
    () => lecturers.filter((lecturer) => lecturer.isFirstLogin).length,
    [lecturers]
  );

  useEffect(() => {
    void fetchLecturers();
  }, []);

  const sortLecturers = (items) =>
    [...items].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  const upsertLecturer = (nextLecturer) => {
    setLecturers((current) => {
      const existing = current.some((lecturer) => lecturer.id === nextLecturer.id);
      const merged = existing
        ? current.map((lecturer) => (lecturer.id === nextLecturer.id ? nextLecturer : lecturer))
        : [nextLecturer, ...current];
      return sortLecturers(merged);
    });
  };

  const fetchLecturers = async () => {
    try {
      const response = await axiosInstance.get('/admin/lecturers');
      setLecturers(sortLecturers(response.data || []));
    } catch (error) {
      toast.error('Failed to load lecturers.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openEditModal = (lecturer) => {
    setEditingLecturer(lecturer);
    setForm({
      name: lecturer.name || '',
      email: lecturer.email || '',
      staffId: lecturer.staffId || '',
      department: lecturer.department || 'ICT',
      designation: lecturer.designation || '',
    });
  };

  const closeEditModal = () => {
    setEditingLecturer(null);
    setForm(emptyForm);
  };

  const handleCreateLecturer = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await axiosInstance.post('/admin/lecturers', form);
      upsertLecturer(response.data);
      setForm(emptyForm);
      toast.success(`Welcome email sent to ${response.data?.email || form.email}.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create lecturer account.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLecturer = async (event) => {
    event.preventDefault();
    if (!editingLecturer) {
      return;
    }

    setSaving(true);
    try {
      const response = await axiosInstance.put(`/admin/lecturers/${editingLecturer.id}`, form);
      upsertLecturer(response.data);
      closeEditModal();
      toast.success('Lecturer details updated.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update lecturer.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkLoading(true);

    try {
      const text = await file.text();
      const payload = parseCsv(text);

      if (payload.length === 0) {
        toast.error('The selected CSV does not contain any lecturer rows.');
        return;
      }

      const response = await axiosInstance.post('/admin/lecturers/bulk', payload);
      setImportSummary(response.data);

      if (response.data.failed > 0) {
        toast.success(`Imported ${response.data.success} lecturers with ${response.data.failed} row issues.`);
      } else {
        toast.success(`Imported ${response.data.success} lecturers successfully.`);
      }

      await fetchLecturers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Bulk import failed.');
      console.error(error);
    } finally {
      event.target.value = '';
      setBulkLoading(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) {
      return;
    }

    const nextActive = !statusTarget.isActive;
    setStatusLoadingId(statusTarget.id);

    try {
      const response = await axiosInstance.patch(`/admin/lecturers/${statusTarget.id}/status`, {
        active: nextActive,
      });
      upsertLecturer(response.data);
      toast.success(`Lecturer account ${nextActive ? 'activated' : 'deactivated'}.`);
      setStatusTarget(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update lecturer status.');
    } finally {
      setStatusLoadingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Admin Workspace</p>
            <h1 className="mt-3 text-4xl font-bold text-slate-950 md:text-5xl serif-heading">Manage Lecturers</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Keep lecturer accounts current, reactivate access safely, and preserve a consistent review workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Total Lecturers', value: lecturers.length, detail: 'All lecturer accounts on record.' },
              { label: 'Active Accounts', value: activeCount, detail: 'Lecturers who can access the portal.' },
              { label: 'First Login Pending', value: pendingFirstLoginCount, detail: 'Accounts waiting for initial password setup.' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.75rem] border border-outline-variant/15 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">{item.label}</p>
                <p className="mt-3 text-3xl font-bold text-on-surface">{item.value}</p>
                <p className="mt-2 text-sm text-on-surface-variant">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 serif-heading">Add Single Lecturer</h2>
                <p className="mt-2 text-sm text-slate-600">Create a lecturer account and send the initial credentials email.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Manual Entry
              </span>
            </div>

            <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={handleCreateLecturer}>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Full Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Official Email</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Staff ID</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="staffId"
                  value={form.staffId}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Department</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                >
                  <option value="ICT">ICT</option>
                  <option value="ET">ET</option>
                  <option value="BST">BST</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Designation</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  required
                />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create Lecturer Account'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 serif-heading">Bulk Import Lecturers</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Upload a CSV using these headers: <span className="font-semibold">{sampleColumns.join(', ')}</span>
                </p>
              </div>
              <span className="rounded-full bg-secondary-container px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-on-secondary-container">
                CSV Import
              </span>
            </div>

            <label className="mt-8 flex cursor-pointer items-center justify-center rounded-[1.75rem] border-2 border-dashed border-outline-variant/40 bg-surface-container-low px-6 py-10 text-center transition hover:border-primary/35 hover:bg-primary/5">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleBulkImport}
                disabled={bulkLoading}
              />
              <div>
                <p className="text-lg font-semibold text-slate-900">{bulkLoading ? 'Importing...' : 'Select CSV to Import'}</p>
                <p className="mt-2 text-sm text-slate-500">Each valid row creates both a user account and a lecturer profile.</p>
              </div>
            </label>

            {importSummary && (
              <div className="mt-6 rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-low p-5">
                <div className="grid gap-3 text-center sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Total</p>
                    <p className="mt-2 text-2xl font-bold text-on-surface">{importSummary.total}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Success</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">{importSummary.success}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Failed</p>
                    <p className="mt-2 text-2xl font-bold text-rose-600">{importSummary.failed}</p>
                  </div>
                </div>

                {importSummary.failures?.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {importSummary.failures.map((failure) => (
                      <div key={`${failure.rowNumber}-${failure.staffId}-${failure.email}`} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-sm font-semibold text-rose-800">Row {failure.rowNumber}</p>
                        <p className="mt-1 text-sm text-rose-700">{failure.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-[2rem] border border-outline-variant/15 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 serif-heading">Lecturer Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">Review current status, role readiness, and profile information.</p>
            </div>
            {loading && <span className="text-sm text-slate-500">Loading...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-surface-container-low text-left text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">Lecturer</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Designation</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">First Login</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {lecturers.map((lecturer) => {
                  const statusLoading = statusLoadingId === lecturer.id;
                  const nextActionLabel = lecturer.isActive ? 'Deactivate' : 'Activate';

                  return (
                    <tr key={lecturer.id} className="align-top hover:bg-surface-container-low/40">
                      <td className="px-6 py-5">
                        <p className="text-base font-semibold text-on-surface">{lecturer.name}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">{lecturer.email}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                          {lecturer.staffId || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{lecturer.department || '-'}</td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{lecturer.designation || '-'}</td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                            lecturer.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {lecturer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                            lecturer.isFirstLogin
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {lecturer.isFirstLogin ? 'Pending' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">
                        {lecturer.createdAt ? new Date(lecturer.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(lecturer)}
                            className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={statusLoading}
                            onClick={() => setStatusTarget(lecturer)}
                            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              lecturer.isActive
                                ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {statusLoading ? 'Updating...' : nextActionLabel}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && lecturers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-14 text-center text-slate-500">
                      No lecturer accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <LecturerFormModal
        lecturer={editingLecturer}
        form={form}
        saving={saving}
        onClose={closeEditModal}
        onChange={handleChange}
        onSubmit={handleUpdateLecturer}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={`${statusTarget?.isActive ? 'Deactivate' : 'Activate'} Lecturer`}
        message={
          statusTarget
            ? `Are you sure you want to ${statusTarget.isActive ? 'deactivate' : 'activate'} ${statusTarget.name || statusTarget.email}?`
            : ''
        }
        confirmLabel={statusTarget?.isActive ? 'Deactivate Account' : 'Activate Account'}
        confirmTone={statusTarget?.isActive ? 'danger' : 'primary'}
        loading={statusLoadingId === statusTarget?.id}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleConfirmStatusChange}
      />
    </AdminLayout>
  );
}
