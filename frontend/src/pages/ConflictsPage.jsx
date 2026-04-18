import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchConflicts() {
    try {
      const res = await axiosInstance.get('/events/admin/conflicts');
      setConflicts(res.data);
    } catch (e) {
      toast.error('Failed to load conflicts');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConflicts();
  }, []);

  async function approveEvent(id) {
    try {
      setActionLoading(true);
      await axiosInstance.patch(`/events/${id}/approve`);
      toast.success('Event approved');
      await fetchConflicts();
    } catch (e) {
      toast.error('Failed to approve event');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectEvent(id) {
    const reason = window.prompt('Enter rejection reason for this event:');
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      await axiosInstance.patch(`/events/${id}/reject`, { reason });
      toast.success('Event rejected');
      await fetchConflicts();
    } catch (e) {
      toast.error('Failed to reject event');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Event Conflicts</h1>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : conflicts.length === 0 ? (
        <div className="text-gray-500">No conflicts found.</div>
      ) : (
        <div className="space-y-4">
          {conflicts.map(conflict => {
            const primary = conflict.event || {};
            const secondary = conflict.conflictingEvent || {};
            return (
              <div key={conflict.id} className="bg-white p-4 rounded shadow flex flex-col md:flex-row md:space-x-4">
                <div className="flex-1">
                  <div className="font-bold">{primary.title || `Event ${conflict.eventId}`}</div>
                  <div className="text-gray-600">Venue: {primary.venue || 'Unknown'}</div>
                  <div className="text-gray-500">Time: {primary.startTime ? new Date(primary.startTime).toLocaleString() : 'N/A'} - {primary.endTime ? new Date(primary.endTime).toLocaleString() : 'N/A'}</div>
                  <div className="text-gray-700">ID: {conflict.eventId}</div>
                </div>
                <div className="flex-1">
                  <div className="font-bold">Conflicts With: {secondary.title || `Event ${conflict.conflictWith}`}</div>
                  <div className="text-gray-600">Venue: {secondary.venue || 'Unknown'}</div>
                  <div className="text-gray-500">Time: {secondary.startTime ? new Date(secondary.startTime).toLocaleString() : 'N/A'} - {secondary.endTime ? new Date(secondary.endTime).toLocaleString() : 'N/A'}</div>
                  <div className="text-gray-700">ID: {conflict.conflictWith}</div>
                </div>
                <div className="flex flex-col justify-center mt-4 md:mt-0">
                  <button className="bg-green-500 text-white px-4 py-2 rounded mb-2" onClick={() => approveEvent(conflict.eventId)} disabled={actionLoading}>Approve Primary</button>
                  <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={() => rejectEvent(conflict.eventId)} disabled={actionLoading}>Reject Primary</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
