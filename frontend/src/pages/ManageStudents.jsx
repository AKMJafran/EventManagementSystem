import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import ModalPortal from '../components/ui/ModalPortal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  validateBatchYear,
  validateDepartment,
  validateEmail,
  validateName,
  validateStudentId,
} from '../utils/validation';

const emptyForm = {
  fullName: '',
  officialEmail: '',
  studentNumber: '',
  department: 'ICT',
  batchYear: new Date().getFullYear(),
};

const sampleColumns = ['studentNumber', 'officialEmail', 'fullName', 'department', 'batchYear'];

const normalizeImportedRow = (row) => ({
  studentNumber: String(row.studentNumber || row.StudentNumber || row.student_number || '').trim(),
  officialEmail: String(row.officialEmail || row.OfficialEmail || row.official_email || '').trim(),
  fullName: String(row.fullName || row.FullName || row.full_name || '').trim(),
  department: String(row.department || row.Department || '').trim(),
  batchYear: Number(row.batchYear || row.BatchYear || row.batch_year || ''),
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

function StudentFormModal({ student, form, formErrors, saving, onClose, onChange, onSubmit }) {
  if (!student) {
    return null;
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Student Account</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Edit Student</h2>
              <p className="mt-2 text-sm text-slate-600">Update the student profile details used across the portal.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close edit student modal"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Full Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                required
              />
              {formErrors.fullName && <p className="mt-2 text-sm font-medium text-error">{formErrors.fullName}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Official Email</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                name="officialEmail"
                type="email"
                value={form.officialEmail}
                onChange={onChange}
                required
              />
              {formErrors.officialEmail && <p className="mt-2 text-sm font-medium text-error">{formErrors.officialEmail}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Student Number</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                name="studentNumber"
                value={form.studentNumber}
                onChange={onChange}
                required
              />
              {formErrors.studentNumber && <p className="mt-2 text-sm font-medium text-error">{formErrors.studentNumber}</p>}
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
              {formErrors.department && <p className="mt-2 text-sm font-medium text-error">{formErrors.department}</p>}
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Batch Year</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                name="batchYear"
                type="number"
                min="2000"
                max="2100"
                value={form.batchYear}
                onChange={onChange}
                required
              />
              {formErrors.batchYear && <p className="mt-2 text-sm font-medium text-error">{formErrors.batchYear}</p>}
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

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingStudent, setEditingStudent] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  const activeCount = useMemo(
    () => students.filter((student) => student.isActive).length,
    [students]
  );

  const pendingFirstLoginCount = useMemo(
    () => students.filter((student) => student.isFirstLogin).length,
    [students]
  );

  useEffect(() => {
    void fetchStudents();
  }, []);

  const sortStudents = (items) =>
    [...items].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  const upsertStudent = (nextStudent) => {
    setStudents((current) => {
      const existing = current.some((student) => student.id === nextStudent.id);
      const merged = existing
        ? current.map((student) => (student.id === nextStudent.id ? nextStudent : student))
        : [nextStudent, ...current];
      return sortStudents(merged);
    });
  };

  const fetchStudents = async () => {
    try {
      const response = await axiosInstance.get('/admin/students');
      setStudents(sortStudents(response.data || []));
    } catch (error) {
      toast.error('Failed to load students.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateStudentForm = (data) => {
    const errors = {
      fullName: validateName(data.fullName, 'Full name'),
      officialEmail: validateEmail(data.officialEmail, 'Official email'),
      studentNumber: validateStudentId(data.studentNumber, 'Student number'),
      department: validateDepartment(data.department),
      batchYear: validateBatchYear(data.batchYear),
    };

    return Object.fromEntries(Object.entries(errors).filter(([, value]) => Boolean(value)));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormErrors((current) => ({ ...current, [name]: '' }));
    setForm((current) => ({
      ...current,
      [name]: name === 'batchYear' ? Number(value) : value,
    }));
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormErrors({});
    setForm({
      fullName: student.fullName || '',
      officialEmail: student.officialEmail || '',
      studentNumber: student.studentNumber || '',
      department: student.department || 'ICT',
      batchYear: student.batchYear || new Date().getFullYear(),
    });
  };

  const closeEditModal = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    const errors = validateStudentForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted student fields.');
      return;
    }
    setSaving(true);

    try {
      const response = await axiosInstance.post('/admin/students', form);
      upsertStudent(response.data);
      setForm(emptyForm);
      toast.success('Student account created. Welcome email sent.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create student account.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStudent = async (event) => {
    event.preventDefault();
    if (!editingStudent) {
      return;
    }

    const errors = validateStudentForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted student fields.');
      return;
    }

    setSaving(true);
    try {
      const response = await axiosInstance.put(`/admin/students/${editingStudent.id}`, form);
      upsertStudent(response.data);
      closeEditModal();
      toast.success('Student details updated.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update student.');
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
        toast.error('The selected CSV does not contain any student rows.');
        return;
      }

      const response = await axiosInstance.post('/admin/students/bulk', payload);
      setImportSummary(response.data);

      if (response.data.failed > 0) {
        toast.success(`Imported ${response.data.success} students with ${response.data.failed} row issues.`);
      } else {
        toast.success(`Imported ${response.data.success} students successfully.`);
      }

      await fetchStudents();
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
      const response = await axiosInstance.patch(`/admin/students/${statusTarget.id}/status`, {
        active: nextActive,
      });
      upsertStudent(response.data);
      toast.success(`Student account ${nextActive ? 'activated' : 'deactivated'}.`);
      setStatusTarget(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update student status.');
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
            <h1 className="mt-3 text-4xl font-bold text-slate-950 md:text-5xl serif-heading">Manage Students</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Create, edit, activate, and deactivate student accounts without leaving the workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Total Students', value: students.length, detail: 'All student accounts on record.' },
              { label: 'Active Accounts', value: activeCount, detail: 'Students who can sign in right now.' },
              { label: 'First Login Pending', value: pendingFirstLoginCount, detail: 'Students who still need to set a password.' },
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
                <h2 className="text-2xl font-bold text-slate-900 serif-heading">Add Single Student</h2>
                <p className="mt-2 text-sm text-slate-600">Create a new student account and send the initial access email.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Manual Entry
              </span>
            </div>

            <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={handleCreateStudent}>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Full Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
                {formErrors.fullName && <p className="mt-2 text-sm font-medium text-error">{formErrors.fullName}</p>}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Official Email</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="officialEmail"
                  type="email"
                  value={form.officialEmail}
                  onChange={handleChange}
                  required
                />
                {formErrors.officialEmail && <p className="mt-2 text-sm font-medium text-error">{formErrors.officialEmail}</p>}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Student Number</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="studentNumber"
                  value={form.studentNumber}
                  onChange={handleChange}
                  required
                />
                {formErrors.studentNumber && <p className="mt-2 text-sm font-medium text-error">{formErrors.studentNumber}</p>}
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
                {formErrors.department && <p className="mt-2 text-sm font-medium text-error">{formErrors.department}</p>}
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Batch Year</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  name="batchYear"
                  type="number"
                  min="2000"
                  max="2100"
                  value={form.batchYear}
                  onChange={handleChange}
                  required
                />
                {formErrors.batchYear && <p className="mt-2 text-sm font-medium text-error">{formErrors.batchYear}</p>}
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create Student Account'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-outline-variant/15 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 serif-heading">Bulk Import Students</h2>
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
                <p className="mt-2 text-sm text-slate-500">Each valid row creates both a user account and a student profile.</p>
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
                      <div key={`${failure.rowNumber}-${failure.studentNumber}-${failure.officialEmail}`} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
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
              <h2 className="text-2xl font-bold text-slate-900 serif-heading">Student Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">Review status, first-login progress, and account details.</p>
            </div>
            {loading && <span className="text-sm text-slate-500">Loading...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-surface-container-low text-left text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">First Login</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {students.map((student) => {
                  const statusLoading = statusLoadingId === student.id;
                  const nextActionLabel = student.isActive ? 'Deactivate' : 'Activate';

                  return (
                    <tr key={student.id} className="align-top hover:bg-surface-container-low/40">
                      <td className="px-6 py-5">
                        <p className="text-base font-semibold text-on-surface">{student.fullName}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">{student.officialEmail}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                          {student.studentNumber}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{student.department || '-'}</td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{student.batchYear || '-'}</td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                            student.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                            student.isFirstLogin
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {student.isFirstLogin ? 'Pending' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">
                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="inline-flex items-center justify-center rounded-2xl border border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={statusLoading}
                            onClick={() => setStatusTarget(student)}
                            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              student.isActive
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

                {!loading && students.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-14 text-center text-slate-500">
                      No student accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <StudentFormModal
        student={editingStudent}
        form={form}
        formErrors={formErrors}
        saving={saving}
        onClose={closeEditModal}
        onChange={handleChange}
        onSubmit={handleUpdateStudent}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={`${statusTarget?.isActive ? 'Deactivate' : 'Activate'} Student`}
        message={
          statusTarget
            ? `Are you sure you want to ${statusTarget.isActive ? 'deactivate' : 'activate'} ${statusTarget.fullName || statusTarget.officialEmail}?`
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
