import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import LecturerLayout from '../components/layout/LecturerLayout';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LecturerPendingApprovalsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const response = await axiosInstance.get('/lecturer/events/pending-approval');
      setEvents(response.data || []);
    } catch (error) {
      toast.error('Failed to load pending approvals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId) => {
    try {
      await axiosInstance.patch(`/events/${eventId}/treasurer-approve`);
      toast.success('Event approved');
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await axiosInstance.patch(`/events/${rejectModal.id}/treasurer-reject`, { reason: rejectReason });
      toast.success('Event rejected');
      setEvents((prev) => prev.filter((e) => e.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject event');
    }
  };

  return (
    <LecturerLayout>
      <section className="mb-8">
        <Link to="/lecturer/dashboard" className="text-sm font-semibold text-on-surface-variant hover:text-primary">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-3 text-5xl font-bold text-primary serif-heading">Pending Approvals</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Events submitted by your clubs that require your approval as Senior Treasurer.
        </p>
      </section>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant">Loading...</div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 shadow-sm text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">task_alt</span>
          <p className="text-lg font-semibold text-on-surface mb-2">All caught up!</p>
          <p className="text-sm text-on-surface-variant">No events pending your approval.</p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                  <th className="px-3 py-3">Event Title</th>
                  <th className="px-3 py-3">Club</th>
                  <th className="px-3 py-3">Organizer</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Venue</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-700">{event.clubName || '-'}</td>
                    <td className="px-3 py-4 text-sm text-slate-700">{event.createdByName || '-'}</td>
                    <td className="px-3 py-4 text-sm text-slate-700">{formatDate(event.startTime)}</td>
                    <td className="px-3 py-4 text-sm text-slate-700">{event.venue || '-'}</td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(event.id)}
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectModal(event); setRejectReason(''); }}
                          className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Reject Event</h2>
            <p className="text-sm text-slate-600 mb-4">
              Rejecting: <span className="font-semibold">{rejectModal.title}</span>
            </p>
            <label className="block mb-4">
              <span className="text-sm font-medium text-slate-700">Reason for rejection</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 h-24 resize-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason..."
                required
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700"
              >
                Reject Event
              </button>
            </div>
          </div>
        </div>
      )}
    </LecturerLayout>
  );
}
