import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, conflicts: 0 });
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const eventsRes = await axiosInstance.get('/events');
        const total = eventsRes.data.length;
        const pending = eventsRes.data.filter(e => e.status === 'PENDING').length;
        const conflictsRes = await axiosInstance.get('/events/admin/conflicts');
        setStats({ total, pending, conflicts: conflictsRes.data.length });
        setConflicts(conflictsRes.data.slice(0, 5)); // show recent 5
      } catch (err) {
        toast.error('Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-100 p-4 rounded shadow text-center">
          <div className="text-lg font-semibold">Total Events</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded shadow text-center">
          <div className="text-lg font-semibold">Pending Events</div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="bg-red-100 p-4 rounded shadow text-center">
          <div className="text-lg font-semibold">Conflicts</div>
          <div className="text-2xl font-bold">{stats.conflicts}</div>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Recent Conflict Alerts</h2>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : conflicts.length === 0 ? (
          <div className="text-gray-500">No conflicts found.</div>
        ) : (
          <ul className="space-y-2">
            {conflicts.map(conflict => (
              <li key={conflict.id} className="bg-white p-3 rounded shadow flex items-center">
                <span className="text-red-500 text-xl mr-2">⚠️</span>
                <span className="font-semibold">Event {conflict.eventId} conflicts with {conflict.conflictWith}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex space-x-4">
        <Link to="/manage-categories" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Manage Categories</Link>
        <Link to="/manage-events" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Manage Events</Link>
        <Link to="/conflicts" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">View Conflicts</Link>
      </div>
    </div>
  );
}
