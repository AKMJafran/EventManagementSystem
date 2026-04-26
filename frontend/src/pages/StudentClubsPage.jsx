import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAllClubs, getMyClub, joinClub, submitClubRegistration, getClubMembers } from '../api/clubApi';
import axiosInstance from '../api/axiosInstance';
import StudentLayout from '../components/layout/StudentLayout';
import StatusStepper from '../components/ui/StatusStepper';
import ClubTypeTag from '../components/ui/ClubTypeTag';
import StatusBadge from '../components/ui/StatusBadge';
import ModalPortal from '../components/ui/ModalPortal';
import useAuthStore from '../context/AuthContext';

export default function StudentClubsPage() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [clubs, setClubs] = useState([]);
  const [myClub, setMyClub] = useState(null);
  const [myClubMembers, setMyClubMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const { user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lecturers, setLecturers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'ACADEMIC',
    description: '',
    seniorTreasurerStaffId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    fetchLecturers();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clubsRes, myClubRes] = await Promise.all([
        getAllClubs(),
        getMyClub().catch(() => ({ data: null })) // Ignores 404 if not found
      ]);
      setClubs(clubsRes.data || []);
      setMyClub(myClubRes.data || null);
      if (myClubRes.data && myClubRes.data.status === 'ACTIVE') {
        fetchMyClubMembers(myClubRes.data.id);
      }
    } catch (error) {
      toast.error('Failed to load clubs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClubMembers = async (id) => {
    try {
      const res = await getClubMembers(id);
      setMyClubMembers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch club members', error);
    }
  };

  const fetchLecturers = async () => {
    try {
      const res = await axiosInstance.get('/admin/lecturers');
      setLecturers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch lecturers', error);
    }
  };

  const handleJoinClub = async (id) => {
    setJoining(true);
    try {
      await joinClub(id);
      const clubName = clubs.find((c) => c.id === id)?.name;
      toast.success(`You joined ${clubName}!`);
      fetchData(); // Refresh to update joined status if needed (e.g., if we want to show 'Joined')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to join club');
    } finally {
      setJoining(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.setActiveTab = 'my';
    e.preventDefault();
    if (formData.description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }
    setSubmitting(true);
    try {
      await submitClubRegistration(formData);
      toast.success('Club registration submitted! Waiting for Senior Treasurer approval.');
      setIsModalOpen(false);
      setFormData({ name: '', type: 'ACADEMIC', description: '', seniorTreasurerStaffId: '' });
      fetchData();
      setActiveTab('my');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to register club');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if student has already joined a club. For simplicity, we could assume if they are in the member list.
  // We actually need a way to check if current user is joined. The requirements don't explicitly mention fetching current user's memberships.
  // We'll just provide a join button.

  return (
    <StudentLayout>
      <section className="mb-8">
        <h1 className="text-5xl font-bold text-primary serif-heading mb-3">Clubs & Societies</h1>
        <p className="max-w-3xl text-lg text-on-surface-variant">
          Discover and join campus clubs, or register a new one as President.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-slate-200">
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('all')}
        >
          All Clubs
        </button>
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'my' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('my')}
        >
          My Club
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading...</div>
      ) : activeTab === 'all' ? (
        <div className="space-y-6">
          {clubs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No active clubs yet.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => (
                <div key={club.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{club.name}</h3>
                    <ClubTypeTag type={club.type} />
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
                    {club.description}
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[16px] mr-2">person</span>
                      Treasurer: {club.seniorTreasurerName || 'N/A'}
                    </div>
                    <div className="flex items-center text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[16px] mr-2">group</span>
                      Members: {club.memberCount || 0}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinClub(club.id)}
                    disabled={joining}
                    className="w-full py-2 bg-primary/10 text-primary font-semibold rounded-xl hover:bg-primary/20 transition-colors"
                  >
                    Join Club
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // My Club Tab
        <div>
          {myClub ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">{myClub.name}</h2>
                    <ClubTypeTag type={myClub.type} />
                  </div>
                  <p className="text-slate-600">{myClub.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Senior Treasurer</p>
                  <p className="font-medium text-slate-900">{myClub.seniorTreasurerName} ({myClub.seniorTreasurerStaffId})</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Members</p>
                  <p className="font-medium text-slate-900">{myClub.memberCount || 0}</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-4">Registration Status</h3>
              <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                 <StatusStepper currentStatus={myClub.status} />
                 {myClub.status === 'REJECTED' && (
                   <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                     <p className="text-sm font-semibold text-rose-800">Rejection Reason:</p>
                     <p className="text-sm text-rose-700">{myClub.rejectionReason || 'No reason provided.'}</p>
                   </div>
                 )}
              </div>

              {myClub.status === 'ACTIVE' && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">group</span> Members
                  </h3>
                  {myClubMembers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-t-xl">
                          <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Student No</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {myClubMembers.map((member) => (
                            <tr key={member.userId}>
                              <td className="px-4 py-3 font-medium text-slate-900">{member.fullName}</td>
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
                  ) : (
                    <p className="text-sm text-slate-500">No members yet.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">add_business</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">You haven't registered a club yet.</h2>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Step up as a leader! Register a new club or society and guide your fellow students.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-gradient py-3 px-8 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Register a New Club
              </button>
            </div>
          )}
        </div>
      )}

      {/* Registration Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800">Register New Club</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <div className="p-8 overflow-y-auto">
                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Club Name</label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Coding Club"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Club Type</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="ACADEMIC">Academic</option>
                      <option value="CULTURAL">Cultural</option>
                      <option value="SPORTS">Sports</option>
                      <option value="TECHNICAL">Technical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senior Treasurer</label>
                    <select
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
                      value={formData.seniorTreasurerStaffId}
                      onChange={(e) => setFormData({ ...formData, seniorTreasurerStaffId: e.target.value })}
                    >
                      <option value="">Select a Lecturer...</option>
                      {lecturers.map(l => (
                        <option key={l.id} value={l.staffId}>{l.name} ({l.staffId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                    <textarea
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none h-32 resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the club's purpose and activities (min 20 chars)..."
                    />
                    <p className="text-xs text-slate-500 mt-1 text-right">{formData.description.length}/20 min</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Registration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </StudentLayout>
  );
}
