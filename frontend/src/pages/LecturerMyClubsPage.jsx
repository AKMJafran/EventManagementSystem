import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import LecturerLayout from '../components/layout/LecturerLayout';

export default function LecturerMyClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div className="rounded-3xl bg-white p-12 shadow-sm text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">group_off</span>
          <p className="text-lg font-semibold text-on-surface mb-2">No clubs assigned</p>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            You are not assigned as Senior Treasurer to any clubs yet. 
            Please contact the administration if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <div key={club.id} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-on-surface">{club.name}</h3>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                  club.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {club.status || 'Active'}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
                {club.description || 'No description available.'}
              </p>
              <div className="space-y-2 text-xs text-on-surface-variant">
                {club.presidentName && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">person</span>
                    <span>President: {club.presidentName}</span>
                  </div>
                )}
                {club.memberCount != null && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">group</span>
                    <span>Members: {club.memberCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </LecturerLayout>
  );
}
