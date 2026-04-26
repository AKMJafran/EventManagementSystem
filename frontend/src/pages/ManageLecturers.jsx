import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';

const emptyForm = {
  name: '',
  email: '',
  staffId: '',
  department: '',
  designation: '',
};

export default function ManageLecturers() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const activeCount = useMemo(
    () => lecturers.filter((l) => l.isActive).length,
    [lecturers]
  );

  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    try {
      const response = await axiosInstance.get('/admin/lecturers');
      setLecturers(response.data);
    } catch (error) {
      toast.error('Failed to load lecturers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateLecturer = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.post('/admin/lecturers', form);
      toast.success(`Welcome email sent to ${form.email}`);
      setForm(emptyForm);
      await fetchLecturers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create lecturer account');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (lecturer) => {
    setEditingLecturer(lecturer);
    setForm({
      name: lecturer.name || '',
      email: lecturer.email || '',
      staffId: lecturer.staffId || '',
      department: lecturer.department || '',
      designation: lecturer.designation || '',
    });
  };

  const handleUpdateLecturer = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.put(`/admin/lecturers/${editingLecturer.id}`, form);
      toast.success('Lecturer details updated');
      setEditingLecturer(null);
      setForm(emptyForm);
      await fetchLecturers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update lecturer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (lecturer) => {
    const confirmed = window.confirm(`Deactivate ${lecturer.name || lecturer.email}?`);
    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/admin/lecturers/${lecturer.id}`);
      toast.success('Lecturer account deactivated');
      await fetchLecturers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to deactivate lecturer');
    }
  };

  const closeModals = () => {
    setEditingLecturer(null);
    setForm(emptyForm);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage Lecturers</h1>
            <p className="text-slate-600 mt-2">
              Create lecturer accounts, manage profiles, and control access.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total Lecturers</p>
              <p className="text-2xl font-bold text-slate-900">{lecturers.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Active Accounts</p>
              <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Add Single Lecturer</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateLecturer}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Official Email</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Staff ID</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  name="staffId"
                  value={form.staffId}
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
                <span className="text-sm font-medium text-slate-700">Designation</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
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
                  className="px-5 py-3 rounded-xl bg-teal-800 text-white font-semibold hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create Lecturer Account'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Lecturer Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Lecturer Accounts</h2>
            {loading && <span className="text-sm text-slate-500">Loading...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                  <th className="px-3 py-3">Lecturer</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Designation</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">First Login</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lecturers.map((lecturer) => (
                  <tr key={lecturer.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{lecturer.name}</p>
                      <p className="text-sm text-slate-600">{lecturer.email}</p>
                      <p className="text-xs text-slate-500 mt-1">{lecturer.staffId || '-'}</p>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-700">{lecturer.department || '-'}</td>
                    <td className="px-3 py-4 text-sm text-slate-700">{lecturer.designation || '-'}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${lecturer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {lecturer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${lecturer.isFirstLogin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {lecturer.isFirstLogin ? 'Pending' : 'Completed'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(lecturer)}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={!lecturer.isActive}
                          onClick={() => handleDeactivate(lecturer)}
                          className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 text-sm"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && lecturers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-3 py-8 text-center text-slate-500">
                      No lecturer accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>


      {/* Edit Lecturer Modal */}
      {editingLecturer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Edit Lecturer</h2>
              <button type="button" onClick={closeModals} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleUpdateLecturer}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" name="name" value={form.name} onChange={handleChange} required />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Staff ID</span>
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-slate-100 cursor-not-allowed" value={form.staffId} readOnly disabled />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Department</span>
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" name="department" value={form.department} onChange={handleChange} required />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Designation</span>
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" name="designation" value={form.designation} onChange={handleChange} required />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModals} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-teal-800 text-white font-semibold hover:bg-teal-700 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
