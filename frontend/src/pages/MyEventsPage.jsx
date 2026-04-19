import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import StudentLayout from '../components/layout/StudentLayout';

export default function MyEventsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await axiosInstance.get('/events/user/my-events');
        setEvents(res.data);
      } catch (e) {
        toast.error('Failed to load events');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [user]);

  const filteredEvents = events.filter(e => {
    if (filter === 'Upcoming') return new Date(e.startTime) > new Date();
    if (filter === 'Past') return new Date(e.startTime) <= new Date();
    return true;
  }).filter(e => {
    const titleMatch = e.title?.toLowerCase().includes(search.toLowerCase());
    const venueStr = typeof e.venue === 'string' ? e.venue : e.venue?.name || '';
    const venueMatch = venueStr.toLowerCase().includes(search.toLowerCase());
    return titleMatch || venueMatch;
  });

  const getStatusStyles = (status) => {
    switch(status) {
      case 'APPROVED': return { badge: 'bg-green-100 text-green-800', bar: 'bg-primary' };
      case 'PENDING': return { badge: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', bar: 'bg-tertiary' };
      case 'REJECTED': return { badge: 'bg-error-container text-on-error-container', bar: 'bg-error' };
      default: return { badge: 'bg-surface-dim text-on-surface', bar: 'bg-outline' };
    }
  };

  const navigate = useNavigate();

  const getStatusIcon = (status) => {
    switch(status) {
      case 'APPROVED': return 'event_available';
      case 'PENDING': return 'history';
      case 'REJECTED': return 'cancel';
      default: return 'event';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  return (
    <StudentLayout user={user}>
      {/* Header Section */}
      <div className="mb-12">
        <h1 className="serif-authoritative text-4xl md:text-5xl font-bold text-on-background mb-4">My Events</h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">Manage your academic engagements, workshops, and symposium registrations in one curated ledger.</p>
      </div>

      {/* Filter/Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setFilter('All')} 
            className={`font-semibold pb-1 transition-colors ${filter === 'All' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            All Events
          </button>
          <button 
            onClick={() => setFilter('Upcoming')} 
            className={`font-semibold pb-1 transition-colors ${filter === 'Upcoming' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setFilter('Past')} 
            className={`font-semibold pb-1 transition-colors ${filter === 'Past' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Past
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-lg focus:ring-2 focus:ring-primary text-sm w-64" 
              placeholder="Search entries..." 
              type="text"
            />
          </div>
        </div>
      </div>

      {/* Bento-Style Event Grid */}
      {loading ? (
        <div className="text-center py-10 text-on-surface-variant">Loading...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-on-surface-variant">No events found.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredEvents.map(event => {
            const styles = getStatusStyles(event.status);
            return (
              <div key={event.id} className="group bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,101,101,0.08)]">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bar}`}></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 ${styles.badge}`}>
                      {event.status}
                    </span>
                    <h3 className="serif-authoritative text-2xl font-bold text-on-background leading-tight mb-2">{event.title}</h3>
                    {event.categoryName && (
                      <p className="text-on-secondary-fixed-variant text-sm font-medium tracking-wide flex items-center gap-1 uppercase">
                        <span className="material-symbols-outlined text-sm">category</span>
                        {event.categoryName}
                      </p>
                    )}
                  </div>
                  <div className="bg-surface-container-high p-3 rounded-lg text-primary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {getStatusIcon(event.status)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary">calendar_month</span>
                    <span className="text-sm">{formatDate(event.startTime)} — {formatDate(event.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    <span className="text-sm">{typeof event.venue === 'object' ? event.venue.name : event.venue}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-surface-container-highest">
                  {event.status === 'REJECTED' && event.rejectReason ? (
                    <div className="text-error text-sm italic">
                      Reason: {event.rejectReason}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="text-xs text-on-surface-variant italic">
                        {event.status === 'PENDING' && 'Awaiting Faculty Approval'}
                      </div>
                      {event.status === 'PENDING' && (
                        <button
                          onClick={() => navigate(`/student/edit-event/${event.id}`)}
                          className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                        >
                          Edit Event <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
}
