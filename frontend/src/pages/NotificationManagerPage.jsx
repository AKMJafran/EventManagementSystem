import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import ModalPortal from '../components/ui/ModalPortal';
import { validateRequiredText } from '../utils/validation';

const typeOptions = ['GENERAL', 'EVENT_APPROVED', 'EVENT_REJECTED', 'CONFLICT', 'REMINDER'];
const audienceOptions = [
  { value: 'ALL_USERS', label: 'All users' },
  { value: 'ALL_STUDENTS', label: 'All students' },
  { value: 'ALL_ADMINS', label: 'All admins' },
  { value: 'SPECIFIC_USER', label: 'Specific person' },
];

const roleFilterOptions = ['ALL', 'STUDENT', 'ADMIN'];
const stateFilterOptions = ['ALL', 'NEW', 'READ'];

const truncateText = (value, limit = 80) => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit).trim()}...` : value;
};

export default function NotificationManagerPage() {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'GENERAL',
    targetAudience: 'ALL_USERS',
    userId: '',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notificationsRes, usersRes] = await Promise.all([
        axiosInstance.get('/notifications/admin/all'),
        axiosInstance.get('/users/all'),
      ]);

      setNotifications(notificationsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      toast.error('Failed to load notification manager');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch =
        notification.title?.toLowerCase().includes(search.toLowerCase()) ||
        notification.message?.toLowerCase().includes(search.toLowerCase()) ||
        notification.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
        notification.recipientEmail?.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === 'ALL' || notification.recipientRole === roleFilter;

      const matchesState =
        stateFilter === 'ALL' ||
        (stateFilter === 'NEW' && !notification.isRead) ||
        (stateFilter === 'READ' && notification.isRead);

      return matchesSearch && matchesRole && matchesState;
    });
  }, [notifications, search, roleFilter, stateFilter]);

  const summary = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((notification) => !notification.isRead).length;
    const studentTotal = notifications.filter((notification) => notification.recipientRole === 'STUDENT').length;
    const adminTotal = notifications.filter((notification) => notification.recipientRole === 'ADMIN').length;

    return { total, unread, studentTotal, adminTotal };
  }, [notifications]);

  const handleInputChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: '' }));
  };

  const submitNotification = async (event) => {
    event.preventDefault();

    const nextErrors = {
      title: validateRequiredText(form.title, 'Title', { min: 3, max: 120 }),
      message: validateRequiredText(form.message, 'Message', { min: 10, max: 1000 }),
      userId:
        form.targetAudience === 'SPECIFIC_USER' && !form.userId
          ? 'Please select a recipient.'
          : '',
    };

    setFormErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please fix the highlighted notification fields.');
      return;
    }

    try {
      setSending(true);
      const payload = {
        ...form,
        userId: form.targetAudience === 'SPECIFIC_USER' ? Number(form.userId) : null,
      };

      const response = await axiosInstance.post('/notifications/admin/send', payload);
      toast.success(`Notification sent to ${response.data.createdCount} recipient(s)`);
      setForm({
        title: '',
        message: '',
        type: 'GENERAL',
        targetAudience: 'ALL_USERS',
        userId: '',
      });
      setFormErrors({});
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send notification');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pt-8 pb-10 space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-teal-700 font-bold">Admin Notification Manager</p>
            <h1 className="text-5xl font-serif font-bold text-teal-950 mt-3">Monitor delivery, read state, and direct outreach</h1>
            <p className="text-lg text-slate-600 mt-4 leading-relaxed">
              This manager now gives admins a complete notification log across students and admins, plus broadcast and person-specific sending from one place.
            </p>
          </div>
          <button
            onClick={loadData}
            type="button"
            className="self-start lg:self-auto px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            Refresh data
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Total Records</p>
            <h2 className="text-4xl font-serif font-bold text-slate-900 mt-3">{summary.total}</h2>
            <p className="text-sm text-slate-500 mt-2">Every delivered notification row in the system.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Unread</p>
            <h2 className="text-4xl font-serif font-bold text-blue-700 mt-3">{summary.unread}</h2>
            <p className="text-sm text-slate-500 mt-2">Useful for spotting messages that still need attention.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Sent To Students</p>
            <h2 className="text-4xl font-serif font-bold text-emerald-700 mt-3">{summary.studentTotal}</h2>
            <p className="text-sm text-slate-500 mt-2">Student-facing communication history.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Sent To Admins</p>
            <h2 className="text-4xl font-serif font-bold text-amber-700 mt-3">{summary.adminTotal}</h2>
            <p className="text-sm text-slate-500 mt-2">Internal coordination and review notifications.</p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-serif font-bold text-slate-900">Notification Log</h2>
              <p className="text-sm text-slate-500 mt-2">
                Recommended manager essentials: full audit trail, read-state tracking, recipient filtering, and quick drill-down into message content.
              </p>
            </div>

            <div className="p-6 flex flex-col lg:flex-row gap-4 border-b border-slate-200 bg-slate-50/70">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, message, name, or email"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none"
              >
                {roleFilterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'All roles' : option}
                  </option>
                ))}
              </select>

              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none"
              >
                {stateFilterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'All states' : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Notification</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Recipient</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Type</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">State</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNotifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                        No notifications match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <tr
                        key={notification.id}
                        onClick={() => setSelectedNotification(notification)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-5">
                          <p className="font-semibold text-slate-900">{notification.title || 'Notification'}</p>
                          <p className="text-sm text-slate-500 mt-1">{truncateText(notification.message)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-medium text-slate-900">{notification.recipientName}</p>
                          <p className="text-sm text-slate-500">{notification.recipientEmail}</p>
                          <p className="text-xs text-slate-400 mt-1">{notification.recipientRole}</p>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-700">{notification.type}</td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${notification.isRead ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                            {notification.isRead ? 'Read' : 'New'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500">
                          <p>{new Date(notification.createdAt).toLocaleString()}</p>
                          <p className="text-xs mt-1">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-8">
            <form onSubmit={submitNotification} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-serif font-bold text-slate-900">Create Notification</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Use this for campus-wide notices, admin coordination, or a message to one selected person.
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => handleInputChange('title', event.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 ${
                      formErrors.title ? 'border-rose-300' : 'border-slate-200'
                    }`}
                    placeholder="Enter a short notification title"
                  />
                  {formErrors.title && <p className="mt-2 text-sm font-medium text-rose-600">{formErrors.title}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                    <select
                      value={form.type}
                      onChange={(event) => handleInputChange('type', event.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none"
                    >
                      {typeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Audience</label>
                    <select
                      value={form.targetAudience}
                      onChange={(event) => handleInputChange('targetAudience', event.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none"
                    >
                      {audienceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.targetAudience === 'SPECIFIC_USER' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Recipient</label>
                    <select
                      value={form.userId}
                      onChange={(event) => handleInputChange('userId', event.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none ${
                        formErrors.userId ? 'border-rose-300' : 'border-slate-200'
                      }`}
                    >
                      <option value="">Select a person</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role}) - {user.email}
                        </option>
                      ))}
                    </select>
                    {formErrors.userId && <p className="mt-2 text-sm font-medium text-rose-600">{formErrors.userId}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(event) => handleInputChange('message', event.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-200 min-h-40 resize-none ${
                      formErrors.message ? 'border-rose-300' : 'border-slate-200'
                    }`}
                    placeholder="Write the full notification content here"
                  />
                  {formErrors.message && <p className="mt-2 text-sm font-medium text-rose-600">{formErrors.message}</p>}
                </div>
              </div>

              <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  Best practice: keep the title short and put the actionable details in the message body.
                </p>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-3 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors disabled:opacity-60"
                >
                  {sending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>

            <div className="bg-gradient-to-br from-teal-950 to-slate-900 rounded-3xl p-7 text-white shadow-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-teal-200 font-bold">Manager Ideas</p>
              <h3 className="text-2xl font-serif font-bold mt-3">What matters most in this event system</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-200 leading-6">
                <p>Admins should be able to filter by audience, read state, and type so urgent items do not get buried under routine updates.</p>
                <p>A complete audit log helps answer who received a message, when it was sent, and whether it has been opened.</p>
                <p>Targeted outreach is important for rejected events, venue changes, reminders, and private follow-up with one student or one admin.</p>
                <p>The next valuable upgrade after this would be scheduled reminders and optional email delivery for high-priority notices.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {selectedNotification && (
        <ModalPortal>
          <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {selectedNotification.type}
                  </p>
                  <h2 className="mt-2 text-3xl font-serif font-bold text-slate-900">
                    {selectedNotification.title || 'Notification'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="text-slate-500 hover:text-slate-900"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-slate-500">Recipient</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedNotification.recipientName}</p>
                    <p className="text-slate-600">{selectedNotification.recipientEmail}</p>
                    <p className="mt-1 text-xs text-slate-400">{selectedNotification.recipientRole}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-slate-500">Delivery State</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedNotification.isRead ? 'Read' : 'New'}</p>
                    <p className="text-slate-600">{new Date(selectedNotification.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Full Message</p>
                  <p className="whitespace-pre-wrap leading-7 text-slate-700">{selectedNotification.message}</p>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
}
