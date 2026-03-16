import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const approvedRes = await axiosInstance.get('/events', {
          params: { status: 'APPROVED' },
        });
        setApprovedEvents(approvedRes.data);
       const myRes = await axiosInstance.get('/events');
        setMyEvents(myRes.data.filter(event => event.userId === user.id));
        
      } catch (err) {
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
     <div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-bold">Student Dashboard</h1>
  <button
    onClick={() => navigate('/create-event')}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  >
    + Create Event
  </button>
</div>
      {/* Notification bell placeholder */}
      <div className="flex justify-end mb-4">
        {/* NotificationBell component will be added in Step 21 */}
        <div className="relative">
        
<div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
  <span role="img" aria-label="bell">🔔</span>
</div>
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-2">0</span>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Upcoming Approved Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedEvents.length === 0 ? (
                <div className="text-gray-500">No approved events found.</div>
              ) : (
                approvedEvents.map(event => (
                  <div key={event.id} className="bg-white p-4 rounded shadow">
                    <div className="font-bold text-lg">{event.title}</div>
                    <div className="text-gray-600">{event.venue}</div>
                    <div className="text-gray-500">{new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-2">My Recent Event Requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myEvents.length === 0 ? (
                <div className="text-gray-500">No event requests found.</div>
              ) : (
                myEvents.map(event => (
                  <div key={event.id} className="bg-white p-4 rounded shadow">
                    <div className="font-bold text-lg">{event.title}</div>
                    <div className="text-gray-600">{event.venue}</div>
                    <div className="text-gray-500">{new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}</div>
                    <div className="mt-2 text-sm text-gray-700">Status: <span className="font-semibold">{event.status}</span></div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
