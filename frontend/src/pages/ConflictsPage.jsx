import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConflicts() {
      try {
        const res = await axiosInstance.get('/admin/conflicts');
        setConflicts(res.data);
      } catch (err) {
        toast.error('Failed to load conflicts');
      } finally {
        setLoading(false);
      }
    }
    fetchConflicts();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Event Conflicts</h1>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : conflicts.length === 0 ? (
        <div className="text-gray-500">No conflicts found.</div>
      ) : (
        <div className="space-y-4">
          {conflicts.map(conflict => (
            <div key={conflict.id} className="bg-white p-4 rounded shadow flex flex-col md:flex-row md:space-x-4">
              <div className="flex-1">
                <div className="font-bold">Event {conflict.eventId}</div>
                <div className="text-gray-600">Venue: {conflict.venue}</div>
                <div className="text-gray-500">Time: {new Date(conflict.startTime).toLocaleString()} - {new Date(conflict.endTime).toLocaleString()}</div>
                <div className="text-gray-700">Submitted by: {conflict.createdByName}</div>
              </div>
              <div className="flex-1">
                <div className="font-bold">Conflicts With: {conflict.conflictWith}</div>
                <div className="text-gray-600">Venue: {conflict.conflictVenue}</div>
                <div className="text-gray-500">Time: {new Date(conflict.conflictStartTime).toLocaleString()} - {new Date(conflict.conflictEndTime).toLocaleString()}</div>
                <div className="text-gray-700">Submitted by: {conflict.conflictCreatedByName}</div>
              </div>
              <div className="flex items-center mt-4 md:mt-0">
                <button className="bg-green-500 text-white px-4 py-2 rounded mr-2">Approve</button>
                <button className="bg-red-500 text-white px-4 py-2 rounded">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
