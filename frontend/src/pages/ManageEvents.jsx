import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectId, setRejectId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = status !== 'ALL' ? { status } : {};
        const res = await axiosInstance.get('/events', { params });
        if (!cancelled) setEvents(res.data);
      } catch (e) {
        toast.error('Failed to load events');
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  async function reloadEvents(nextStatus = status) {
    try {
      const params = nextStatus !== 'ALL' ? { status: nextStatus } : {};
      const res = await axiosInstance.get('/events', { params });
      setEvents(res.data);
    } catch (e) {
      toast.error('Failed to load events');
      console.error(e);
    }
  }

  async function approveEvent(id) {
    try {
      await axiosInstance.patch(`/events/${id}/approve`);
      toast.success('Event approved');
      await reloadEvents();
    } catch (e) {
      toast.error('Failed to approve event');
      console.error(e);
    }
  }

  async function rejectEvent() {
    try {
      await axiosInstance.patch(`/events/${rejectId}/reject`, { reason: rejectReason });
      toast.success('Event rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectId(null);
      await reloadEvents();
    } catch (e) {
      toast.error('Failed to reject event');
      console.error(e);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Events</h1>
      <div className="mb-4 flex space-x-2">
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border rounded">
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4">Title</th>
            <th className="py-2 px-4">Venue</th>
            <th className="py-2 px-4">Time</th>
            <th className="py-2 px-4">Status</th>
            <th className="py-2 px-4">Conflict</th>
            <th className="py-2 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-4 text-gray-500">No events found.</td></tr>
          ) : (
            events.map(event => (
              <tr key={event.id} className="border-b">
                <td className="py-2 px-4">{event.title}</td>
                <td className="py-2 px-4">{event.venue}</td>
                <td className="py-2 px-4">{new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}</td>
                <td className="py-2 px-4">{event.status}</td>
                <td className="py-2 px-4">{event.hasConflict ? <span className="text-red-500 text-xl">⚠️</span> : ''}</td>
                <td className="py-2 px-4">
                  {event.status === 'PENDING' && (
                    <>
                      <button className="bg-green-500 text-white px-2 py-1 rounded mr-2" onClick={() => approveEvent(event.id)}>Approve</button>
                      <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => { setRejectId(event.id); setShowRejectModal(true); }}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4">Reject Event</h2>
            <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full px-3 py-2 border rounded mb-4" placeholder="Reason for rejection" />
            <div className="flex justify-end space-x-2">
              <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={rejectEvent}>Reject</button>
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowRejectModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
