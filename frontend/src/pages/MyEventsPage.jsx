import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const statusColors = {
  PENDING: 'bg-yellow-400',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
};

export default function MyEventsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await axiosInstance.get('/events', {
          params: { userId: user.id },
        });
        setEvents(res.data);
      } catch (err) {
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [user]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Events</h1>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-gray-500">No events found.</div>
          ) : (
            events.map(event => (
              <div key={event.id} className="bg-white p-4 rounded shadow flex items-center">
                <div className={`w-24 h-8 rounded text-white flex items-center justify-center mr-4 ${statusColors[event.status] || 'bg-gray-400'}`}>{event.status}</div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{event.title}</div>
                  <div className="text-gray-600">{event.venue}</div>
                  <div className="text-gray-500">{new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}</div>
                  {event.status === 'REJECTED' && event.rejectReason && (
                    <div className="mt-2 text-red-600 text-sm">Reason: {event.rejectReason}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
