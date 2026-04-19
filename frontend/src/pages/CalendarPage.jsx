import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import useAuthStore from '../context/AuthContext';
import StudentLayout from '../components/layout/StudentLayout';
import AdminLayout from '../components/layout/AdminLayout';

const formatDateInput = (date) => date.toISOString().split('T')[0];

export default function CalendarPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const dashboardLink = isAdmin ? '/admin/dashboard' : '/student/dashboard';

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

  const padRef = (id) => {
    if (!id) return 'N/A';
    return id.toString().padStart(3, '0').toUpperCase();
  };

  const getStatusClasses = (status) => {
    const base = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block";
    switch (status) {
      case 'APPROVED':
        return `${base} bg-secondary-container text-on-secondary-container`;
      case 'PENDING':
        return `${base} bg-surface-container-highest text-on-surface-variant`;
      case 'REJECTED':
        return `${base} bg-error-container text-on-error-container`;
      default:
        return `${base} bg-surface-container text-on-surface`;
    }
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const day = d.getDate().toString().padStart(2, '0');
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = hours.toString().padStart(2, '0') + ':' + minutes + ' ' + ampm;
    return `${month} ${day}, ${strTime}`;
  };

  const content = (
    <div className="flex-1 p-8 md:p-12 max-w-[1440px] mx-auto w-full">
      {/* Breadcrumb & Back Action */}
      <div className="mb-10">
        <Link to={dashboardLink} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 group w-fit">
          <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span className="font-label text-sm font-semibold tracking-wide">Back to Dashboard</span>
        </Link>
        <h2 className="font-headline text-5xl font-bold text-on-surface tracking-tight mb-2">Event Calendar</h2>
        <p className="text-on-surface-variant text-lg">Browse events scheduled for the selected range.</p>
      </div>

      {/* Filters Section */}
      <form onSubmit={handleSearch} className="bg-surface-container-lowest p-8 rounded-2xl mb-12 flex flex-wrap items-end gap-6 shadow-sm">
        <div className="flex-1 min-w-[240px]">
          <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">Start Date</label>
          <div className="relative bg-surface-container-high rounded-xl px-4 py-3 border-b-2 border-transparent focus-within:border-primary transition-all">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-transparent border-none focus:ring-0 w-full font-label text-on-surface outline-none"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[240px]">
          <label className="block font-label text-sm font-semibold text-on-surface-variant mb-2">End Date</label>
          <div className="relative bg-surface-container-high rounded-xl px-4 py-3 border-b-2 border-transparent focus-within:border-primary transition-all">
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-transparent border-none focus:ring-0 w-full font-label text-on-surface outline-none"
            />
          </div>
        </div>
        <button type="submit" className="bg-surface-container-highest text-on-surface px-8 py-3.5 rounded-xl font-label font-bold flex items-center gap-3 hover:bg-outline-variant/30 transition-all active:scale-95 cursor-pointer">
          <span className="material-symbols-outlined">refresh</span>
          Refresh
        </button>
      </form>

      {/* Table Layout */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-10 text-on-surface-variant font-label">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant font-label">No events found in this date range.</div>
        ) : (
          <table className="w-full border-separate border-spacing-y-4">
            <thead>
              <tr className="text-left text-on-surface-variant font-label text-xs uppercase tracking-widest">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Venue</th>
                <th className="px-6 py-4">Start</th>
                <th className="px-6 py-4">End</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="space-y-4">
              {events.map((event, index) => {
                const isTertiary = index % 2 === 0;
                return (
                  <tr key={event.id} className="bg-surface-container-low group hover:bg-white transition-all duration-300">
                    <td className={`px-6 py-6 rounded-l-2xl ${isTertiary ? 'border-l-4 border-tertiary' : ''}`}>
                      <p className="font-headline font-bold text-on-surface">{event.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1">Ref: {event.eventType ? event.eventType.substring(0,4).toUpperCase() + '-' : 'EVT-'}{padRef(event.id)}</p>
                    </td>
                    <td className="px-6 py-6 text-on-surface font-label text-sm">{event.category?.name || event.eventType || 'Academic Event'}</td>
                    <td className="px-6 py-6 text-on-surface font-label text-sm">{event.venue}</td>
                    <td className="px-6 py-6 text-on-surface font-label text-sm">{formatDateString(event.startTime)}</td>
                    <td className="px-6 py-6 text-on-surface font-label text-sm">{formatDateString(event.endTime)}</td>
                    <td className="px-6 py-6 text-center">
                      <span className={getStatusClasses(event.status)}>{event.status}</span>
                    </td>
                    <td className="px-6 py-6 rounded-r-2xl text-right">
                      <span className="material-symbols-outlined text-outline cursor-pointer hover:text-primary">more_vert</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Empty Space for Breathing Room */}
      <div className="h-32"></div>
    </div>
  );

  if (isAdmin) {
    return (
      <AdminLayout>
        {content}
      </AdminLayout>
    );
  }

  return (
    <StudentLayout user={user}>
      {content}
    </StudentLayout>
  );
}

