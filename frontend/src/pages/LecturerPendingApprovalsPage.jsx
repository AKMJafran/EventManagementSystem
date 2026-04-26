import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import { getLecturerClubs, treasurerApproveClub, treasurerRejectClub } from '../api/clubApi';
import LecturerLayout from '../components/layout/LecturerLayout';
import ClubTypeTag from '../components/ui/ClubTypeTag';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LecturerPendingApprovalsPage() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [clubRejectModal, setClubRejectModal] = useState(null);
  const [clubRejectReason, setClubRejectReason] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const [eventsRes, clubsRes] = await Promise.all([
        axiosInstance.get('/lecturer/events/pending-approval'),
        getLecturerClubs().catch(() => ({ data: [] }))
      ]);
      setEvents(eventsRes.data || []);
      const pendingClubs = (clubsRes.data || []).filter(c => c.status === 'PENDING_TREASURER');
      setClubs(pendingClubs);
    } catch (error) {
      toast.error('Failed to load pending approvals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Event Handlers ---
  const handleApproveEvent = async (eventId) => {
    try {
      await axiosInstance.patch(`/events/${eventId}/treasurer-approve`);
      toast.success('Event approved');
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleRejectEvent = async () => {
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

  // --- Club Handlers ---
  const handleApproveClub = async (clubId) => {
    try {
      await treasurerApproveClub(clubId);
      toast.success('Club approved and sent to Dean');
      setClubs((prev) => prev.filter((c) => c.id !== clubId));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve club');
    }
  };

  const handleRejectClub = async () => {
    if (!clubRejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await treasurerRejectClub(clubRejectModal.id, clubRejectReason);
      toast.success('Club rejected');
      setClubs((prev) => prev.filter((c) => c.id !== clubRejectModal.id));
      setClubRejectModal(null);
      setClubRejectReason('');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject club');
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
          Clubs and Events submitted by students that require your approval as Senior Treasurer.
        </p>
      </section>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant">Loading...</div>
      ) : (
        <div className="space-y-12">
          
          {/* Clubs Section */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              Clubs Pending Your Approval
            </h2>
            {clubs.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500">
                No clubs pending your approval.
              </div>
            ) : (
              <div className="grid gap-6">
                {clubs.map(club => (
                  <div key={club.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between gap-6 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{club.name}</h3>
                        <ClubTypeTag type={club.type} />
                      </div>
                      <p className="text-sm text-slate-600 mb-4">{club.description}</p>
                      <div className="flex gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">person</span>
                          <span>President: <strong>{club.presidentName}</strong> ({club.presidentStudentNumber})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          <span>Submitted: {formatDate(club.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:flex-col md:justify-center">
                      <button
                        onClick={() => handleApproveClub(club.id)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 w-full"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setClubRejectModal(club); setClubRejectReason(''); }}
                        className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold text-sm hover:bg-rose-700 w-full"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Events Section */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">event_note</span>
              Events Pending Your Approval
            </h2>
            {events.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500">
                No events pending your approval.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
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
                              onClick={() => handleApproveEvent(event.id)}
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
            )}
          </section>

        </div>
      )}

      {/* Reject Event Modal */}
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
                onClick={handleRejectEvent}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700"
              >
                Reject Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Club Modal */}
      {clubRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Reject Club Registration</h2>
            <p className="text-sm text-slate-600 mb-4">
              Rejecting: <span className="font-semibold">{clubRejectModal.name}</span>
            </p>
            <label className="block mb-4">
              <span className="text-sm font-medium text-slate-700">Reason for rejection</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 h-24 resize-none"
                value={clubRejectReason}
                onChange={(e) => setClubRejectReason(e.target.value)}
                placeholder="Provide a reason..."
                required
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setClubRejectModal(null); setClubRejectReason(''); }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectClub}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700"
              >
                Reject Club
              </button>
            </div>
          </div>
        </div>
      )}

    </LecturerLayout>
  );
}
