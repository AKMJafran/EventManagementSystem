import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { deanApproveClub, deanRejectClub, getAllClubsForAdmin, getClubMembers } from '../api/clubApi';
import AdminLayout from '../components/layout/AdminLayout';
import ClubTypeTag from '../components/ui/ClubTypeTag';
import StatusBadge from '../components/ui/StatusBadge';
import ModalPortal from '../components/ui/ModalPortal';
import MemberRolePill from '../components/clubs/MemberRolePill';
import { getExecutiveCommitteeEntries, getGeneralMembers, getRoleDisplayName } from '../utils/clubRoles';
import { validateReason } from '../utils/validation';

function formatDate(value) {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ManageClubs() {
  const [activeTab, setActiveTab] = useState('pending');
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [membersModal, setMembersModal] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [rejectError, setRejectError] = useState('');

  const executiveCommittee = useMemo(
    () => getExecutiveCommitteeEntries(membersModal),
    [membersModal]
  );

  const generalMembers = useMemo(
    () => getGeneralMembers(clubMembers),
    [clubMembers]
  );

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllClubsForAdmin();
      const allClubs = response.data || [];
      setClubs(
        activeTab === 'pending'
          ? allClubs.filter((club) => club.status === 'PENDING_DEAN')
          : allClubs.filter((club) => club.status === 'ACTIVE')
      );
    } catch (error) {
      toast.error('Failed to load clubs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void fetchClubs();
  }, [fetchClubs]);

  const handleApprove = async (clubId) => {
    try {
      await deanApproveClub(clubId);
      toast.success('Club approved and is now ACTIVE');
      await fetchClubs();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve club');
    }
  };

  const handleReject = async () => {
    const validationMessage = validateReason(rejectReason, 'Reason for rejection');
    setRejectError(validationMessage);
    if (validationMessage) {
      toast.error('Please provide a clear rejection reason.');
      return;
    }

    try {
      await deanRejectClub(rejectModal.id, rejectReason);
      toast.success('Club rejected');
      setRejectModal(null);
      setRejectReason('');
      setRejectError('');
      await fetchClubs();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject club');
    }
  };

  const handleViewMembers = async (club) => {
    setMembersModal(club);
    setLoadingMembers(true);
    try {
      const response = await getClubMembers(club.id);
      setClubMembers(response.data || []);
    } catch (error) {
      toast.error('Failed to load members');
      console.error(error);
    } finally {
      setLoadingMembers(false);
    }
  };

  return (
    <AdminLayout>
      <section className="mb-8">
        <h1 className="mb-3 text-5xl font-bold text-primary serif-heading">Manage Clubs</h1>
        <p className="max-w-3xl text-lg text-on-surface-variant">
          Review pending club registrations and manage active campus clubs.
        </p>
      </section>

      <div className="mb-6 flex space-x-4 border-b border-slate-200">
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval
        </button>
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'all' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('all')}
        >
          Active Clubs
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading clubs...</div>
      ) : clubs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-500">
          No clubs found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Club Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  {activeTab === 'all' && <th className="px-6 py-4 font-medium">Status</th>}
                  <th className="px-6 py-4 font-medium">President</th>
                  <th className="px-6 py-4 font-medium">Senior Treasurer</th>
                  {activeTab === 'pending' && <th className="px-6 py-4 font-medium">Submitted</th>}
                  {activeTab === 'all' && <th className="px-6 py-4 font-medium">Members</th>}
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clubs.map((club) => (
                  <tr key={club.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{club.name}</td>
                    <td className="px-6 py-4">
                      <ClubTypeTag type={club.type} />
                    </td>
                    {activeTab === 'all' && (
                      <td className="px-6 py-4">
                        <StatusBadge status={club.status} />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{club.presidentName}</span>
                        <span className="text-xs text-slate-500">{club.presidentStudentNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{club.seniorTreasurerLecturerName}</span>
                        <span className="text-xs text-slate-500">{club.seniorTreasurerStaffId}</span>
                      </div>
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 text-slate-600">{formatDate(club.createdAt)}</td>
                    )}
                    {activeTab === 'all' && (
                      <td className="px-6 py-4 font-medium text-slate-900">{club.memberCount || 0}</td>
                    )}
                    <td className="px-6 py-4 text-right">
                      {activeTab === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewDetailsModal(club)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => void handleApprove(club.id)}
                            className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectModal(club);
                              setRejectReason('');
                              setRejectError('');
                            }}
                            className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => void handleViewMembers(club)}
                          className="whitespace-nowrap rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          View Members
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewDetailsModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-8 py-6">
                <h3 className="text-xl font-bold text-slate-800">Club Details</h3>
                <button
                  onClick={() => setViewDetailsModal(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <div className="max-h-[80vh] space-y-6 overflow-y-auto p-8">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">{viewDetailsModal.name}</h2>
                    <ClubTypeTag type={viewDetailsModal.type} />
                  </div>
                  <p className="text-sm text-slate-600">{viewDetailsModal.description || 'No description available.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-bold uppercase text-slate-500">President</p>
                    <p className="font-semibold text-slate-900">{viewDetailsModal.presidentName}</p>
                    <p className="text-sm text-slate-500">{viewDetailsModal.presidentStudentNumber}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-bold uppercase text-slate-500">Senior Treasurer</p>
                    <p className="font-semibold text-slate-900">{viewDetailsModal.seniorTreasurerLecturerName}</p>
                    <p className="text-sm text-slate-500">{viewDetailsModal.seniorTreasurerStaffId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-bold uppercase text-slate-500">Secretary</p>
                    <p className="font-semibold text-slate-900">{viewDetailsModal.secretaryName || 'N/A'}</p>
                    <p className="text-sm text-slate-500">{viewDetailsModal.secretaryStudentNumber || 'Student number N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-bold uppercase text-slate-500">Student Treasurer</p>
                    <p className="font-semibold text-slate-900">{viewDetailsModal.studentTreasurerName || 'N/A'}</p>
                    <p className="text-sm text-slate-500">{viewDetailsModal.studentTreasurerStudentNumber || 'Student number N/A'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => {
                      setViewDetailsModal(null);
                      setRejectModal(viewDetailsModal);
                      setRejectReason('');
                      setRejectError('');
                    }}
                    className="rounded-xl bg-rose-100 px-5 py-2 font-semibold text-rose-700 hover:bg-rose-200"
                  >
                    Reject...
                  </button>
                  <button
                    onClick={() => {
                      void handleApprove(viewDetailsModal.id);
                      setViewDetailsModal(null);
                    }}
                    className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white shadow-md hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {rejectModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
              <h2 className="mb-2 text-xl font-bold text-slate-900">Reject Club Registration</h2>
              <p className="mb-4 text-sm text-slate-600">
                Rejecting: <span className="font-semibold">{rejectModal.name}</span>
              </p>
              <label className="mb-6 block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Reason for rejection</span>
                <textarea
                  className="h-24 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectReason(event.target.value);
                    setRejectError('');
                  }}
                  placeholder="Provide a reason..."
                  required
                />
                {rejectError && <p className="mt-2 text-sm font-medium text-error">{rejectError}</p>}
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                    setRejectError('');
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleReject()}
                  className="rounded-xl bg-rose-600 px-6 py-2.5 font-semibold text-white shadow-md hover:bg-rose-700"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {membersModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-8 py-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{membersModal.name} Members</h3>
                  <p className="mt-1 text-sm text-slate-500">Executive committee and general membership overview.</p>
                </div>
                <button
                  onClick={() => setMembersModal(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="space-y-8 overflow-y-auto p-6">
                <section>
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-slate-900">Executive Committee</h4>
                    <p className="mt-1 text-sm text-slate-500">Senior Treasurer is shown separately from student memberships.</p>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Display Name</th>
                          <th className="px-4 py-3 font-medium">Member Name</th>
                          <th className="px-4 py-3 font-medium">Student Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr className="bg-slate-50/60">
                          <td className="px-4 py-3">
                            <MemberRolePill role="SENIOR_TREASURER" displayName="Senior Treasurer" compact />
                          </td>
                          <td className="px-4 py-3 text-slate-700">Senior Treasurer</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{membersModal.seniorTreasurerLecturerName || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{membersModal.seniorTreasurerStaffId || '(Lecturer)'}</td>
                        </tr>
                        {executiveCommittee.map((member) => (
                          <tr key={`${member.role}-${member.memberName}`} className="transition-colors hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <MemberRolePill role={member.role} displayName={member.displayName} compact />
                            </td>
                            <td className="px-4 py-3 text-slate-700">{member.displayName || getRoleDisplayName(member.role)}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{member.memberName || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-600">{member.memberStudentNumber || 'N/A'}</td>
                          </tr>
                        ))}
                        {executiveCommittee.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                              No executive committee assignments available yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">General Members</h4>
                      <p className="mt-1 text-sm text-slate-500">Students who joined under open membership.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {generalMembers.length} members
                    </span>
                  </div>

                  {loadingMembers ? (
                    <div className="rounded-2xl bg-slate-50 py-12 text-center text-slate-500">Loading members...</div>
                  ) : generalMembers.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 py-12 text-center text-slate-500">No general members yet.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Student Number</th>
                            <th className="px-4 py-3 font-medium">Joined Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {generalMembers.map((member) => (
                            <tr key={member.id || member.userId} className="transition-colors hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-medium text-slate-900">{member.fullName || member.userName || 'Unknown Member'}</td>
                              <td className="px-4 py-3 text-slate-600">{member.studentNumber || 'N/A'}</td>
                              <td className="px-4 py-3 text-slate-600">{formatDate(member.joinedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
}
