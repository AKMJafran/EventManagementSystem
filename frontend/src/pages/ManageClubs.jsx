import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAllClubs, deanApproveClub, deanRejectClub, getClubMembers } from '../api/clubApi';
import AdminLayout from '../components/layout/AdminLayout';
import ClubTypeTag from '../components/ui/ClubTypeTag';
import StatusBadge from '../components/ui/StatusBadge';
import ModalPortal from '../components/ui/ModalPortal';

export default function ManageClubs() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'all'
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [membersModal, setMembersModal] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [viewDetailsModal, setViewDetailsModal] = useState(null);

  useEffect(() => {
    fetchClubs();
  }, [activeTab]);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const response = await getAllClubs();
      let filtered = response.data || [];
      if (activeTab === 'pending') {
        filtered = filtered.filter(c => c.status === 'PENDING_DEAN');
      } else {
        // Assume 'all' shows ACTIVE and maybe others, or specifically ACTIVE
        // Requirements say: "Tab 2: "All Clubs" - Fetch GET /clubs (shows ACTIVE clubs)"
        filtered = filtered.filter(c => c.status === 'ACTIVE');
      }
      setClubs(filtered);
    } catch (error) {
      toast.error('Failed to load clubs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (clubId) => {
    try {
      await deanApproveClub(clubId);
      toast.success('Club approved and is now ACTIVE');
      fetchClubs();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve club');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await deanRejectClub(rejectModal.id, rejectReason);
      toast.success('Club rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchClubs();
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
    } finally {
      setLoadingMembers(false);
    }
  };

  return (
    <AdminLayout>
      <section className="mb-8">
        <h1 className="text-5xl font-bold text-primary serif-heading mb-3">Manage Clubs</h1>
        <p className="max-w-3xl text-lg text-on-surface-variant">
          Review pending club registrations and manage active campus clubs.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-slate-200">
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval
        </button>
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('all')}
        >
          Active Clubs
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading clubs...</div>
      ) : clubs.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No clubs found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-4 font-medium">Club Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  {activeTab === 'all' && <th className="px-6 py-4 font-medium">Status</th>}
                  <th className="px-6 py-4 font-medium">President</th>
                  <th className="px-6 py-4 font-medium">Treasurer</th>
                  {activeTab === 'pending' && <th className="px-6 py-4 font-medium">Submitted</th>}
                  {activeTab === 'all' && <th className="px-6 py-4 font-medium">Members</th>}
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clubs.map(club => (
                  <tr key={club.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{club.name}</td>
                    <td className="px-6 py-4"><ClubTypeTag type={club.type} /></td>
                    {activeTab === 'all' && <td className="px-6 py-4"><StatusBadge status={club.status} /></td>}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{club.presidentName}</span>
                        <span className="text-xs text-slate-500">{club.presidentStudentNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{club.seniorTreasurerName}</span>
                        <span className="text-xs text-slate-500">{club.seniorTreasurerStaffId}</span>
                      </div>
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(club.createdAt).toLocaleDateString()}
                      </td>
                    )}
                    {activeTab === 'all' && (
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        {club.memberCount || 0}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      {activeTab === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewDetailsModal(club)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleApprove(club.id)}
                            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal(club); setRejectReason(''); }}
                            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleViewMembers(club)}
                          className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
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

      {/* View Details Modal (for pending clubs) */}
      {viewDetailsModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800">Club Details</h3>
                <button onClick={() => setViewDetailsModal(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">{viewDetailsModal.name}</h2>
                    <ClubTypeTag type={viewDetailsModal.type} />
                  </div>
                  <p className="text-slate-600 text-sm">{viewDetailsModal.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">President</p>
                    <p className="font-semibold text-slate-900">{viewDetailsModal.presidentName}</p>
                    <p className="text-sm text-slate-500">{viewDetailsModal.presidentStudentNumber}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Senior Treasurer</p>
                    <p className="font-semibold text-slate-900">{viewDetailsModal.seniorTreasurerName}</p>
                    <p className="text-sm text-slate-500">{viewDetailsModal.seniorTreasurerStaffId}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => { setViewDetailsModal(null); setRejectModal(viewDetailsModal); setRejectReason(''); }}
                    className="px-5 py-2 rounded-xl bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200"
                  >
                    Reject...
                  </button>
                  <button
                    onClick={() => { handleApprove(viewDetailsModal.id); setViewDetailsModal(null); }}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-md"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Reject Club Registration</h2>
              <p className="text-sm text-slate-600 mb-4">
                Rejecting: <span className="font-semibold">{rejectModal.name}</span>
              </p>
              <label className="block mb-6">
                <span className="text-sm font-semibold text-slate-700 mb-1.5 block">Reason for rejection</span>
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none h-24 resize-none"
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
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-md"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* View Members Modal */}
      {membersModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">group</span> {membersModal.name} Members
                  </h3>
                </div>
                <button onClick={() => setMembersModal(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {loadingMembers ? (
                  <div className="py-12 text-center text-slate-500">Loading members...</div>
                ) : clubMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl">No members found in this club.</div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Student No</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {clubMembers.map((member) => (
                          <tr key={member.userId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">{member.fullName}</td>
                            <td className="px-4 py-3 text-slate-600">{member.studentNumber}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                member.memberRole === 'PRESIDENT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {member.memberRole}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {new Date(member.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

    </AdminLayout>
  );
}
