import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import StudentLayout from '../components/layout/StudentLayout';

export default function StudentDashboard() {
  const { user, isAuthenticated, authLoaded } = useAuthStore();
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoaded || !isAuthenticated) {
      return;
    }

    async function fetchData() {
      try {
        const approvedRes = await axiosInstance.get('/events', {
          params: { status: 'APPROVED' },
        });
        const approvedData = approvedRes.data.content || approvedRes.data || [];
        setApprovedEvents(approvedData.slice(0, 2)); // Just show top 2 featured

        const myRes = await axiosInstance.get('/events/user/my-events').catch(() => ({ data: [] }));
        const myData = myRes.data.content || myRes.data || [];
        setMyEvents(myData.slice(0, 3)); // show top 3
      } catch (e) {
        toast.error('Failed to load events');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [authLoaded, isAuthenticated, user]);

  if (loading) {
    return (
      <StudentLayout user={user}>
        <div className="text-center py-10">Loading...</div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout user={user}>
      {/* Hero Section */}
      <section className="mb-16">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-primary mb-2 serif-heading">Welcome back, {user?.name?.split(' ')[0] || 'Student'}</h1>
            <p className="text-on-surface-variant text-lg">Curating the university's vibrant academic calendar.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <img 
                className="w-10 h-10 rounded-full border-2 border-background object-cover" 
                alt="student coordinator" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuApTmt9kZPC9sCI24FhSSEmQbMLu4yk5I87jEChL8xwszeQcO6wlpgjuW5f154b20v14CDDRo79MNjvMaSvyuP9snYkR-r-aAiiteHCe9ikE3owbQMU_rObPwXQv21DiJha7dRDkJGtYlffRiFlMKYWblmAstW8IGdBXRjxkP_lYHBdeHdGTg6w14xpl7kmfeSWJSL8Xn_Go7FmVqqHRfLPJTTHYQUGuE7_y3yF8wPQeAlCLjnZkkKpJwSbDmsuRHZHjfRoiKdZwXJq"
              />
              <img 
                className="w-10 h-10 rounded-full border-2 border-background object-cover" 
                alt="young man with glasses" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXBYycNl3QY3QWDG_Ru4EuPstb_N8us0eZDgRFotGzrhEGxvvzooM6Z5iqSpLs5aLLcq6jwdEBeaEPGrLxL6CrJGYj7Le_p3UPnrYMMV7xNIHLp5Bvh121sYXrfb9fHXBhpxpQjy-GgPtIP25fWK6AcEhRb1DfFBrlMlu4kvPJliHi92aw_CXNl01s3kHhyseL-Er8BTHDWen0fydceFp-Sgkr-FXXxTJBnASf-rddeINXucWvKPsmDaRih1HuAwBKLbTb1Dob-JYl"
              />
              <div className="w-10 h-10 rounded-full border-2 border-background bg-tertiary-container flex items-center justify-center text-[10px] font-bold text-white">
                +12
              </div>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">Faculty members online</p>
          </div>
        </div>
      </section>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-10">
        {/* Section 1: Upcoming Approved Events (Featured) */}
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold flex items-center gap-3 serif-heading">
              <span className="w-2 h-8 academic-gradient rounded-full"></span>
              Upcoming Approved Events
            </h2>
            <Link to="/student/calendar" className="text-primary text-sm font-semibold hover:underline decoration-2 underline-offset-4">
              View All
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {approvedEvents.length === 0 ? (
              <p className="text-gray-500">No approved events found.</p>
            ) : (
              approvedEvents.map((event, idx) => (
                <div key={event.id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-500 border border-transparent hover:border-primary-container/10">
                  <div className="h-48 overflow-hidden">
                    <img 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      alt="event cover" 
                      src={idx % 2 === 0 ? "https://lh3.googleusercontent.com/aida-public/AB6AXuBHch0oh0KRKaRlDJ6hgwZiIS0ebL19vjp0oRcK8_eIrMtM0xJKoknARmKHHb_afzeVEr-gJEFZJUAdKJrtda__iaup2Pm3kWWSt67LWVb7xvMK_CLHYPZshgzjwQsM6qgZwa1QdC-8sKfdNYcmz8lSZi_97-xz6VsiireSCCHwgYLWEMaXWDRmVWsUEIwHChDRhbM8eAo0tkycz5IwjNvm8tySkNDO8tO9I4y4l9iDMjK_j24OoyDdnUfCNYV-Ro4PYARPIlPwLtoC" : "https://lh3.googleusercontent.com/aida-public/AB6AXuA8CDznZ29YXO_q5ey-pIR-I0EHdDI_l9KmP0vlmIGrqMbTebC9nOewVlbHjfSOXMs-htMvTzNz5h1jHL3ooAQi3XSCLcE9JAwhAMEYcZZWEaqC-gnDjySmNHXtf66Z9ex__44Ynw1_QMj5fsPqd5qI8P3aoE-TZsOdN0LANAxS2Y8pxb2G8wkLiWJayOPUsss3eJoDsMTkBacntc21kkWLz1XfM9NQpG8ciEqB-wjyi6R1sIesXFagQpDXF7EeuowkY88F-kr68XWS"}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-tertiary text-on-tertiary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider mb-2">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      {new Date(event.startTime || event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors serif-heading">{event.title}</h3>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-6">{event.description || 'A vibrant university event bringing together students and faculty.'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant">location_on</span>
                        <span className="text-xs text-on-surface-variant">{event.venue}</span>
                      </div>
                      <Link to="/student/calendar" className="text-primary hover:bg-primary/5 p-2 rounded-full transition-colors inline-block">
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: My Recent Event Requests (Sidebar) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold flex items-center gap-3 serif-heading">
              <span className="w-2 h-8 bg-tertiary rounded-full"></span>
              My Event Requests
            </h2>
          </div>
          <div className="space-y-4">
            {myEvents.length === 0 ? (
              <p className="text-gray-500">No event requests found.</p>
            ) : (
              myEvents.map(event => {
                let statusConfig = {
                  colorClass: "border-primary",
                  tagClass: "bg-secondary-container/30 text-secondary",
                  label: "Approved",
                  icon: "check_circle"
                };
                
                if (event.status === 'PENDING') {
                  statusConfig = {
                    colorClass: "border-yellow-600",
                    tagClass: "bg-tertiary-container/10 text-tertiary",
                    label: "Pending Approval",
                    icon: "schedule"
                  };
                } else if (event.status === 'REJECTED') {
                  statusConfig = {
                    colorClass: "border-error",
                    tagClass: "bg-error-container/30 text-error",
                    label: "Rejected",
                    icon: "event_busy"
                  };
                }

                return (
                  <div key={event.id} className={`p-5 bg-surface-container-lowest rounded-xl shadow-sm border-l-4 ${statusConfig.colorClass}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`${statusConfig.tagClass} font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-tighter`}>
                        {statusConfig.label}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono">REQ-{event.id.toString().padStart(4, '0')}</span>
                    </div>
                    <h4 className="font-bold text-on-surface mb-1 serif-heading">{event.title}</h4>
                    <p className="text-xs text-on-surface-variant mb-4 line-clamp-1">Requesting {event.venue} for {event.category?.name || 'event'}...</p>
                    
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant border-t border-outline-variant/10 pt-4">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {new Date(event.startTime || event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {event.status === 'REJECTED' ? (
                        <div className="text-error font-bold cursor-pointer hover:underline">View Reason</div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">{statusConfig.icon}</span>
                          Faculty: Dean Vance
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <Link 
              to="/student/my-events" 
              className="block text-center w-full py-4 text-xs font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors uppercase tracking-widest mt-4"
            >
              See History
            </Link>
          </div>
        </div>
      </div>

      {/* Bento Grid - Institutional Stats/Guidance */}
      <section className="mt-20">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4 p-8 bg-primary rounded-3xl text-on-primary relative overflow-hidden">
            <div className="relative z-10">
              <span className="material-symbols-outlined text-4xl mb-4 font-variation-fill">lightbulb</span>
              <h3 className="text-2xl font-bold mb-2 serif-heading">Academic Guidelines</h3>
              <p className="text-sm opacity-80 leading-relaxed mb-6">
                Ensure your events meet university standards for safety, inclusivity, and academic excellence.
              </p>
              <button className="bg-white text-primary px-6 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform">Read Policy</button>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <span className="material-symbols-outlined text-[200px]">book</span>
            </div>
          </div>
          
          <div className="col-span-12 md:col-span-5 p-8 bg-surface-container-highest rounded-3xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-4 serif-heading">Venue Capacity Insights</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Grand Ballroom</span>
                  <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">High Demand</span>
                </div>
                <div className="w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary w-[85%] h-full"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lecture Theatre 1</span>
                  <span className="text-xs bg-tertiary/10 text-tertiary px-2 py-1 rounded">Moderate</span>
                </div>
                <div className="w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-tertiary w-[45%] h-full"></div>
                </div>
              </div>
            </div>
            <div className="pt-6">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Updated: Today 08:00 AM</p>
            </div>
          </div>
          
          <div className="col-span-12 md:col-span-3 p-8 academic-gradient rounded-3xl text-white flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-5xl mb-4">support_agent</span>
            <h4 className="text-lg font-bold mb-1 serif-heading">Need Assistance?</h4>
            <p className="text-xs opacity-80 mb-6">Contact Faculty Liaison for urgent booking issues.</p>
            <button className="border border-white/30 hover:bg-white/10 px-6 py-2 rounded-full text-xs font-bold transition-all">Get Help</button>
          </div>
        </div>
      </section>
    </StudentLayout>
  );
}



