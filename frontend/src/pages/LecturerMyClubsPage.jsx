import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import { getClubMembers } from '../api/clubApi';
import LecturerLayout from '../components/layout/LecturerLayout';

export default function LecturerMyClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClub, setExpandedClub] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    async function fetchClubs() {
      try {
        const response = await axiosInstance.get('/lecturer/clubs');
        setClubs(response.data || []);
      } catch (error) {
        toast.error('Failed to load clubs');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchClubs();
  }, []);

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
        <div className="rounded-3xl bg-white p-12 shadow-sm text-center border border-slate-200">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">group_off</span>
          <p className="text-lg font-semibold text-on-surface mb-2">No clubs assigned</p>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            You are not assigned as Senior Treasurer to any clubs yet. 
            Please contact the administration if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {clubs.map((club) => (
            <div key={club.id} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-slate-900">{club.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      club.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      club.status === 'PENDING_DEAN' ? 'bg-yellow-100 text-yellow-700' :
                      club.status === 'PENDING_TREASURER' ? 'bg-orange-100 text-orange-700' :
                      club.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {club.status || 'Active'}
                    </span>
                    <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {club.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    {club.description || 'No description available.'}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                    {club.presidentName && (
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        <span className="font-medium text-slate-900">{club.presidentName}</span>
                        <span className="text-xs text-slate-500">({club.presidentStudentNumber})</span>
                      </div>
                    )}
                    {club.memberCount != null && (
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="material-symbols-outlined text-[16px]">group</span>
                        <span className="font-medium text-slate-900">{club.memberCount} Members</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => toggleMembers(club.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {expandedClub === club.id ? 'expand_less' : 'expand_more'}
                    </span>
                    {expandedClub === club.id ? 'Hide Members' : 'View Members'}
                  </button>
                </div>
              </div>

              {/* Expandable Members Section */}
              {expandedClub === club.id && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">list_alt</span> Club Roster
                  </h4>
                  {loadingMembers ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Loading members...</div>
                  ) : clubMembers.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-xl">No members found.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                            <tr key={member.userId} className="hover:bg-slate-50 transition-colors">
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
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </LecturerLayout>
  );
}
