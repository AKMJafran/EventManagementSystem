import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout';

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [lastSynced, setLastSynced] = useState(new Date());
  
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = status !== 'ALL' ? { status } : {};
        const res = await axiosInstance.get('/events', { params });
        if (!cancelled) {
          setEvents(res.data.content || res.data);
          setLastSynced(new Date());
        }
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
      setEvents(res.data.content || res.data);
      setLastSynced(new Date());
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
      toast.error(e?.response?.data?.message || 'Failed to approve event');
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

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusDisplay = (evtStatus) => {
    switch (evtStatus) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
            <span className="text-xs font-bold text-tertiary">Pending Review</span>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary"></div>
            <span className="text-xs font-bold text-secondary">Approved</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error"></div>
            <span className="text-xs font-bold text-error">Rejected</span>
          </div>
        );
      default:
        return <span className="text-xs font-bold">{evtStatus}</span>;
    }
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case 'ACADEMIC': return "bg-secondary-container text-on-secondary-container";
      case 'SPORTS': return "bg-primary-fixed text-on-primary-fixed-variant";
      case 'CULTURAL': return "bg-surface-container-highest text-on-surface-variant";
      case 'TECHNICAL': return "bg-tertiary-container text-on-tertiary-container";
      case 'URGENT': return "bg-error-container text-on-error-container";
      default: return "bg-surface-container-highest text-on-surface-variant";
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.venue.toLowerCase().includes(search.toLowerCase()) ||
    (e.createdByName && e.createdByName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="pt-8">
        {/* Header Section */}
        <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-serif font-bold text-teal-900 tracking-tight leading-none mb-4">Manage Institutional Events</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl font-light">Oversee and curate the faculty event pipeline with administrative precision.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-surface-container-low px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">history</span>
              <span className="text-xs font-semibold text-teal-800">
                Last Synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Filters Section */}
        <section className="max-w-7xl mx-auto mb-10 bg-white p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-6">
          <div className="flex-1 min-w-75">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 rounded-xl pl-12 pr-4 py-3 text-sm placeholder:text-outline" 
                placeholder="Search event title, venue, or faculty lead..." 
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mr-2">Filter By:</span>
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(sf => (
              <button 
                key={sf}
                onClick={() => setStatus(sf)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${status === sf ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-teal-700 hover:bg-teal-50'}`}
              >
                {sf.charAt(0) + sf.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </section>

        {/* Table Section */}
        <section className="max-w-7xl mx-auto">
          <div className="overflow-hidden bg-white rounded-3xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-teal-900">Event Details</th>
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-teal-900">Type</th>
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-teal-900">Venue & Time</th>
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-teal-900">Status</th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-teal-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-on-surface-variant italic">No events found matching current filters.</td>
                  </tr>
                ) : filteredEvents.map(event => (
                  <tr key={event.id} className="group hover:bg-surface-container-lowest transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-1 self-stretch rounded-full ${event.hasConflict ? 'bg-error' : (event.status === 'PENDING' ? 'bg-tertiary' : (event.status === 'APPROVED' ? 'bg-secondary' : 'bg-on-surface-variant/20'))}`}></div>
                        <div>
                          <h4 className="font-serif text-base font-bold text-teal-900 flex items-center gap-2 group-hover:text-primary transition-colors">
                            {event.title}
                            {event.hasConflict && <span className="material-symbols-outlined text-error text-[16px]" title="Venue Booking Conflict Detected">warning</span>}
                          </h4>
                          <p className="text-xs text-on-surface-variant mt-1">Lead: {event.createdByName || 'Faculty Member'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getTypeBadgeStyle(event.eventType)}`}>
                        {event.eventType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-teal-900 font-medium">
                          <span className="material-symbols-outlined text-sm">location_on</span> {event.venue}
                        </span>
                        <span className="flex items-center gap-2 text-on-surface-variant text-xs">
                          <span className="material-symbols-outlined text-sm">schedule</span> {formatTime(event.startTime)} — {formatTime(event.endTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      {getStatusDisplay(event.status)}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={`flex items-center justify-end gap-2 ${event.status !== 'PENDING' ? 'opacity-30' : ''}`}>
                        <button 
                          disabled={event.status !== 'PENDING'}
                          onClick={() => approveEvent(event.id)}
                          className="p-2 rounded-lg text-secondary hover:bg-secondary-container transition-colors disabled:cursor-not-allowed" 
                          title="Approve"
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </button>
                        <button 
                          disabled={event.status !== 'PENDING'}
                          onClick={() => { setRejectId(event.id); setShowRejectModal(true); }}
                          className="p-2 rounded-lg text-error hover:bg-error-container transition-colors disabled:cursor-not-allowed" 
                          title="Reject"
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                        </button>
                        <button className="p-2 rounded-lg text-outline hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <footer className="mt-6 flex justify-between items-center px-4">
            <p className="text-xs text-on-surface-variant">Showing <span className="font-bold text-teal-900">{filteredEvents.length}</span> of <span className="font-bold text-teal-900">{events.length}</span> events</p>
            <div className="flex gap-2">
              <button disabled className="px-4 py-2 bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors opacity-50 cursor-not-allowed">Previous</button>
              <button disabled className="px-4 py-2 bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors opacity-50 cursor-not-allowed">Next</button>
            </div>
          </footer>
        </section>

        {/* Institutional Context */}
        <aside className="max-w-7xl mx-auto mt-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-primary/5 rounded-3xl p-8 border-l-4 border-primary">
            <h3 className="font-serif text-xl font-bold text-teal-900 mb-2">Administrative Guideline</h3>
            <p className="text-sm text-teal-800 leading-relaxed italic">"All institutional events involving external dignitaries must be vetted by the Office of Public Affairs at least 14 days prior to the commencement date. Please ensure venue availability through the Central Registrar's ledger before final approval."</p>
          </div>
          <div className="bg-tertiary/10 rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-serif text-xl font-bold text-tertiary-container mb-4">Venue Capacity Alert</h3>
              <p className="text-sm text-on-tertiary-container">Great Hall is at <span className="font-bold">95% capacity</span> for the upcoming Academic Week.</p>
              <button className="mt-6 text-xs font-bold uppercase tracking-widest text-tertiary underline decoration-2 underline-offset-4">View Schedule</button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-tertiary/10 group-hover:scale-110 transition-transform">warning</span>
          </div>
        </aside>

        {/* Reject Modal Overlay */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-teal-950/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-bold text-error">Reject Event</h2>
                <button onClick={() => setShowRejectModal(false)} className="text-outline hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">Please provide an administrative reason for returning this event request.</p>
              <textarea 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-error/20 rounded-xl mb-6 text-sm placeholder:opacity-50 resize-none h-28" 
                placeholder="e.g., Venue conflict, Incomplete risk assessment..." 
              />
              <div className="flex justify-end gap-3">
                <button 
                  className="px-6 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors" 
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-error text-white shadow-md shadow-error/20 hover:bg-error/90 transition-colors" 
                  onClick={rejectEvent}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-10 right-10 flex flex-col items-end gap-4 z-50">
        <button 
          onClick={() => navigate('/create-event')}
          className="editorial-gradient h-16 w-16 rounded-full flex items-center justify-center text-white shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all group"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
          <span className="absolute right-full mr-4 bg-teal-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
            New Request
          </span>
        </button>
      </div>
    </AdminLayout>
  );
}
