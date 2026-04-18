import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const formatDateInput = (date) => date.toISOString().split('T')[0];

export default function CalendarPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [events, setEvents] = useState([]);
  const [start, setStart] = useState(formatDateInput(firstDay));
  const [end, setEnd] = useState(formatDateInput(lastDay));
  const [loading, setLoading] = useState(true);

  const fetchEvents = async (selectedStart, selectedEnd) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/events/calendar', {
        params: { start: selectedStart, end: selectedEnd },
      });
      setEvents(res.data);
    } catch (e) {
      toast.error('Failed to load calendar events');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(start, end);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEvents(start, end);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Event Calendar</h1>
          <p className="text-gray-600">Browse events scheduled for the selected range.</p>
        </div>
        <Link to="/admin/dashboard" className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
          Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <button type="submit" className="h-12 self-end bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Refresh
        </button>
      </form>

      {loading ? (
        <div className="text-center py-10">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-gray-500">No events found in this date range.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Venue</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">End</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{event.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{event.eventType || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{event.venue}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(event.startTime).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(event.endTime).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{event.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
