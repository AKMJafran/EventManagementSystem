import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';

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

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [importSummary, setImportSummary] = useState(null);

  const activeCount = useMemo(
    () => students.filter((student) => student.isActive).length,
    [students]
  );

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axiosInstance.get('/admin/students');
      setStudents(response.data);
    } catch (error) {
      toast.error('Failed to load students');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'batchYear' ? Number(value) : value,
    }));
  };

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await axiosInstance.post('/admin/students', form);
      toast.success('Student account created. Welcome email sent.');
      setForm(emptyForm);
      await fetchStudents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create student account');
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
      toast.error(error?.response?.data?.message || 'Bulk import failed');
      console.error(error);
    } finally {
      event.target.value = '';
      setBulkLoading(false);
    }
  };

  const handleDeactivate = async (student) => {
    const confirmed = window.confirm(`Deactivate ${student.fullName || student.officialEmail}?`);
    if (!confirmed) {
      return;
    }

    try {
      await axiosInstance.delete(`/admin/students/${student.id}`);
      toast.success('Student account deactivated.');
      await fetchStudents();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to deactivate student');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage Students</h1>
            <p className="text-slate-600 mt-2">
              Create student accounts, import cohorts, and deactivate access when needed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total Students</p>
              <p className="text-2xl font-bold text-slate-900">{students.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Active Accounts</p>
              <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Add Single Student</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateStudent}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Official Email</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  name="officialEmail"
                  type="email"
                  value={form.officialEmail}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Student Number</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  name="studentNumber"
                  value={form.studentNumber}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Department</span>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
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
                <span className="text-sm font-medium text-slate-700">Batch Year</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  name="batchYear"
                  type="number"
                  min="2000"
                  max="2100"
                  value={form.batchYear}
                  onChange={handleChange}
                  required
                />
              </label>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-teal-800 text-white font-semibold hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create Student Account'}
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Bulk Import Students</h2>
            <p className="text-sm text-slate-600 mb-4">
              Upload a CSV file using these headers: <span className="font-semibold">{sampleColumns.join(', ')}</span>
            </p>
            <label className="flex items-center justify-center w-full border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleBulkImport}
                disabled={bulkLoading}
              />
              <div>
                <p className="text-lg font-semibold text-slate-900">{bulkLoading ? 'Importing...' : 'Select CSV to Import'}</p>
                <p className="text-sm text-slate-500 mt-2">Each valid row creates both a user account and a student profile.</p>
              </div>
            </label>

            {importSummary && (
              <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{importSummary.total}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Success</p>
                    <p className="text-2xl font-bold text-emerald-600">{importSummary.success}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Failed</p>
                    <p className="text-2xl font-bold text-rose-600">{importSummary.failed}</p>
                  </div>
                </div>

                {importSummary.failures?.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Failure Reasons</h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {importSummary.failures.map((failure) => (
                        <div key={`${failure.rowNumber}-${failure.studentNumber}-${failure.officialEmail}`} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                          <p className="text-sm font-semibold text-rose-800">Row {failure.rowNumber}</p>
                          <p className="text-sm text-rose-700">{failure.reason}</p>
                          <p className="text-xs text-rose-600 mt-1">
                            {failure.studentNumber || 'No student number'} - {failure.officialEmail || 'No email'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Student Accounts</h2>
            {loading && <span className="text-sm text-slate-500">Loading...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Batch</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">First Login</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{student.fullName}</p>
                      <p className="text-sm text-slate-600">{student.officialEmail}</p>
                      <p className="text-xs text-slate-500 mt-1">{student.studentNumber}</p>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-700">{student.department || '-'}</td>
                    <td className="px-3 py-4 text-sm text-slate-700">{student.batchYear || '-'}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${student.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${student.isFirstLogin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {student.isFirstLogin ? 'Pending' : 'Completed'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-700">
                      {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <button
                        type="button"
                        disabled={!student.isActive}
                        onClick={() => handleDeactivate(student)}
                        className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && students.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-3 py-8 text-center text-slate-500">
                      No student accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
