import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import { getClubMembers, treasurerApproveClub, treasurerRejectClub } from '../api/clubApi';
import LecturerLayout from '../components/layout/LecturerLayout';

function MemberRolePill({ role }) {
  const className =
    role === 'PRESIDENT'
      ? 'bg-amber-100 text-amber-700'
      : role === 'SECRETARY' || role === 'TREASURER'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-slate-100 text-slate-700';

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {role}
    </span>
  );
}

export default function LecturerMyClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClub, setExpandedClub] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [processingClubId, setProcessingClubId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    void fetchClubs();
  }, []);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/lecturer/clubs');
      setClubs(response.data || []);
    } catch (error) {
      toast.error('Failed to load clubs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMembers = async (clubId) => {
    if (expandedClub === clubId) {
      setExpandedClub(null);
      setClubMembers([]);
      return;
    }

    setExpandedClub(clubId);
    setLoadingMembers(true);
    try {
      const response = await getClubMembers(clubId);
      setClubMembers(response.data || []);
    } catch (error) {
      toast.error('Failed to load members');
      console.error(error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleApproveClub = async (clubId) => {
    setProcessingClubId(clubId);
    try {
      await treasurerApproveClub(clubId);
      toast.success('Club approved and forwarded to the Dean');
      await fetchClubs();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve club');
    } finally {
      setProcessingClubId(null);
    }
  };

  const handleRejectClub = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessingClubId(rejectModal.id);
    try {
      await treasurerRejectClub(rejectModal.id, rejectReason);
      toast.success('Club rejected');
      setRejectModal(null);
      setRejectReason('');
      await fetchClubs();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject club');
    } finally {
      setProcessingClubId(null);
    }
  };

  return (
    <LecturerLayout>
      <section className="mb-8">
        <Link to="/lecturer/dashboard" className="text-sm font-semibold text-on-surface-variant hover:text-primary">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-3 text-5xl font-bold text-primary serif-heading">My Clubs</h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Clubs where you serve as Senior Treasurer.
        </p>
      </section>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant">Loading clubs...</div>
      ) : clubs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <span className="material-symbols-outlined mb-4 text-5xl text-on-surface-variant/40">group_off</span>
          <p className="mb-2 text-lg font-semibold text-on-surface">No clubs assigned</p>
          <p className="mx-auto max-w-md text-sm text-on-surface-variant">
            You are not assigned as Senior Treasurer to any clubs yet. Please contact the administration if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {clubs.map((club) => {
            const pendingTreasurerApproval = club.status === 'PENDING_TREASURER';

            return (
              <div key={club.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-900">{club.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        club.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : club.status === 'PENDING_DEAN'
                            ? 'bg-yellow-100 text-yellow-700'
                            : club.status === 'PENDING_TREASURER'
                              ? 'bg-orange-100 text-orange-700'
                              : club.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                      }`}>
                        {club.status || 'UNKNOWN'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {club.type}
                      </span>
                    </div>

                    <p className="mb-4 text-sm text-slate-600">
                      {club.description || 'No description available.'}
                    </p>

                    {pendingTreasurerApproval && (
                      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        This club is waiting for your Senior Treasurer approval.
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">President</p>
                        <p className="mt-1 font-semibold text-slate-900">{club.presidentName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{club.presidentStudentNumber || 'Student number N/A'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Secretary</p>
                        <p className="mt-1 font-semibold text-slate-900">{club.secretaryName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{club.secretaryStudentNumber || 'Student number N/A'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Treasurer</p>
                        <p className="mt-1 font-semibold text-slate-900">{club.studentTreasurerName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{club.studentTreasurerStudentNumber || 'Student number N/A'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Members</p>
                        <p className="mt-1 font-semibold text-slate-900">{club.memberCount ?? 0}</p>
                        <p className="text-xs text-slate-500">{club.seniorTreasurerStaffId || 'Staff ID N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:min-w-[190px]">
                    <button
                      onClick={() => toggleMembers(club.id)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {expandedClub === club.id ? 'expand_less' : 'expand_more'}
                      </span>
                      {expandedClub === club.id ? 'Hide Members' : 'View Members'}
                    </button>

                    {pendingTreasurerApproval && (
                      <>
                        <button
                          onClick={() => handleApproveClub(club.id)}
                          disabled={processingClubId === club.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {processingClubId === club.id ? 'Approving...' : 'Approve Club'}
                        </button>
                        <button
                          onClick={() => {
                            setRejectModal(club);
                            setRejectReason('');
                          }}
                          disabled={processingClubId === club.id}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                        >
                          Reject Club
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {expandedClub === club.id && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
                      <span className="material-symbols-outlined text-[18px]">list_alt</span>
                      Club Roster
                    </h4>
                    {loadingMembers ? (
                      <div className="py-8 text-center text-sm text-slate-500">Loading members...</div>
                    ) : clubMembers.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">No members found.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Name</th>
                              <th className="px-4 py-3 font-medium">Student No</th>
                              <th className="px-4 py-3 font-medium">Role</th>
                              <th className="px-4 py-3 font-medium">Joined Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {clubMembers.map((member) => (
                              <tr key={member.id || member.userId} className="transition-colors hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-900">{member.fullName || member.userName || 'Unknown Member'}</td>
                                <td className="px-4 py-3 text-slate-600">{member.studentNumber || 'N/A'}</td>
                                <td className="px-4 py-3">
                                  <MemberRolePill role={member.memberRole} />
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-2 text-xl font-bold text-slate-900">Reject Club Registration</h2>
            <p className="mb-4 text-sm text-slate-600">
              Rejecting: <span className="font-semibold">{rejectModal.name}</span>
            </p>
            <label className="mb-4 block">
              <span className="text-sm font-medium text-slate-700">Reason for rejection</span>
              <textarea
                className="mt-1 h-24 w-full resize-none rounded-xl border border-slate-300 px-3 py-2"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Provide a reason..."
                required
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectClub}
                disabled={processingClubId === rejectModal.id}
                className="rounded-xl bg-rose-600 px-5 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {processingClubId === rejectModal.id ? 'Rejecting...' : 'Reject Club'}
              </button>
            </div>
          </div>
        </div>
      )}
    </LecturerLayout>
  );
}
