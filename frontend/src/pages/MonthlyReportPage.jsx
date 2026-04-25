import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdminLayout from '../components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function compareValues(a, b, direction) {
  if (a == null && b == null) return 0;
  if (a == null) return direction === 'asc' ? -1 : 1;
  if (b == null) return direction === 'asc' ? 1 : -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a;
  }

  const left = String(a).toLowerCase();
  const right = String(b).toLowerCase();
  if (left < right) return direction === 'asc' ? -1 : 1;
  if (left > right) return direction === 'asc' ? 1 : -1;
  return 0;
}

export default function MonthlyReportPage() {
  const [report, setReport] = useState(null);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortDirection, setSortDirection] = useState('desc');

  const yearOptions = Array.from({ length: 7 }).map((_, idx) => {
    const y = currentYear - 3 + idx;
    return { value: String(y), label: String(y) };
  });

  const monthOptions = monthNames.map((label, index) => ({ value: String(index + 1), label }));

  const fetchReport = async (reportYear, reportMonth) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/events/reports/monthly', {
        params: { year: reportYear, month: reportMonth },
      });
      setReport(res.data);
    } catch (e) {
      toast.error('Failed to load monthly report');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(year, month);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchReport(year, month);
  };

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDirection('asc');
  };

  const visibleRows = useMemo(() => {
    const rows = report?.events || [];
    const filtered = rows.filter((item) => {
      const statusMatch = activeStatus === 'ALL' || item.status === activeStatus;
      if (!statusMatch) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.organizerName?.toLowerCase().includes(q) ||
        item.categoryName?.toLowerCase().includes(q) ||
        item.venue?.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => compareValues(a[sortBy], b[sortBy], sortDirection));
  }, [report, search, activeStatus, sortBy, sortDirection]);

  const exportCsv = () => {
    if (!visibleRows.length) {
      toast.error('No rows to export');
      return;
    }

    const headers = ['Title', 'Organizer', 'Category', 'Venue', 'Status', 'Type', 'Start Time', 'End Time', 'Registrations', 'Conflict'];
    const lines = visibleRows.map((item) => [
      item.title,
      item.organizerName,
      item.categoryName,
      item.venue,
      item.status,
      item.eventType,
      item.startTime,
      item.endTime,
      item.registrations,
      item.hasConflict ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...lines]
      .map((line) => line.map((field) => `"${String(field ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `monthly-report-${year}-${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (!visibleRows.length) {
      toast.error('No rows to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      visibleRows.map((item) => ({
        Title: item.title,
        Organizer: item.organizerName,
        Category: item.categoryName,
        Venue: item.venue,
        Status: item.status,
        Type: item.eventType,
        StartTime: item.startTime,
        EndTime: item.endTime,
        Registrations: item.registrations,
        Conflict: item.hasConflict ? 'Yes' : 'No',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MonthlyReport');
    XLSX.writeFile(workbook, `monthly-report-${year}-${String(month).padStart(2, '0')}.xlsx`);
  };

  const exportPdf = () => {
    if (!visibleRows.length) {
      toast.error('No rows to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Monthly Faculty Event Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Month: ${monthNames[month - 1]} ${year}`, 14, 26);
    doc.text(`Total Events: ${report?.totalEvents || 0} | Approval Rate: ${report?.approvalRate || 0}%`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [['Title', 'Organizer', 'Category', 'Venue', 'Status', 'Type', 'Start', 'Registrations', 'Conflict']],
      body: visibleRows.map((item) => [
        item.title,
        item.organizerName,
        item.categoryName,
        item.venue,
        item.status,
        item.eventType,
        String(item.startTime || ''),
        String(item.registrations || 0),
        item.hasConflict ? 'Yes' : 'No',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] },
    });

    doc.save(`monthly-report-${year}-${String(month).padStart(2, '0')}.pdf`);
  };

  const summaryCards = [
    { label: 'Total Events', value: report?.totalEvents || 0, hint: `${monthNames[month - 1]} ${year}` },
    { label: 'Approved', value: report?.approvedEvents || 0, hint: `${report?.approvalRate || 0}% approval rate` },
    { label: 'Pending', value: report?.pendingEvents || 0, hint: 'Awaiting decision' },
    { label: 'Rejected', value: report?.rejectedEvents || 0, hint: 'Not approved' },
    { label: 'Cancelled', value: report?.cancelledEvents || 0, hint: 'Cancelled events' },
    { label: 'Urgent', value: report?.urgentEvents || 0, hint: 'Marked as urgent' },
    { label: 'Upcoming', value: report?.upcomingEvents || 0, hint: 'Approved and upcoming' },
    { label: 'Completed', value: report?.completedEvents || 0, hint: 'Approved and completed' },
    { label: 'Registrations', value: report?.totalRegistrations || 0, hint: `${report?.averageRegistrationsPerEvent || 0} avg/event` },
    { label: 'Conflicts', value: report?.conflictEvents || 0, hint: `${report?.conflictRate || 0}% conflict rate` },
  ];

  return (
    <AdminLayout>
      <section className="max-w-7xl mx-auto space-y-8 print:space-y-4">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 print:hidden">
          <div>
            <h1 className="text-4xl font-serif font-bold text-teal-900 tracking-tight mb-2">Monthly Event Report</h1>
            <p className="text-on-surface-variant max-w-3xl">
              Month-focused operational snapshot for approvals, conflicts, participation proxy, and organizer activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/reports/analytics" className="text-sm font-bold text-primary hover:underline">Open Analytics</Link>
            <Link to="/admin/dashboard" className="text-sm font-bold text-on-surface-variant hover:underline">Back to Dashboard</Link>
          </div>
        </header>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-2xl">Report Controls</CardTitle>
            <CardDescription>Choose reporting month and refine with search/status drill-down.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <Select label="Year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))} options={yearOptions} />
              <Select label="Month" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} options={monthOptions} />
              <Input label="Search Events" placeholder="Search title, organizer, venue" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button type="submit" isLoading={loading}>Load Report</Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveStatus(chip)}
                  type="button"
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeStatus === chip ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
              <Button variant="secondary" onClick={exportExcel}>Export Excel</Button>
              <Button variant="secondary" onClick={exportPdf}>Export PDF</Button>
              <Button variant="outline" onClick={() => window.print()}>Print</Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-16 text-center text-on-surface-variant">Loading report...</CardContent>
          </Card>
        ) : !report ? (
          <Card>
            <CardContent className="py-16 text-center text-on-surface-variant">No report data available.</CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {summaryCards.map((card) => (
                <Card key={card.label} className="hover:shadow-md transition-shadow">
                  <CardContent>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{card.label}</p>
                    <p className="text-3xl font-bold text-teal-900 mt-2">{card.value}</p>
                    <p className="text-xs text-on-surface-variant mt-2">{card.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Events by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(report.eventsByType || []).map((item) => (
                      <div key={item.eventType}>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-teal-900">{item.eventType}</span>
                          <span className="font-bold">{item.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-surface-container">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${report.totalEvents ? (item.count / report.totalEvents) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    {(!report.eventsByType || report.eventsByType.length === 0) && (
                      <p className="text-sm text-on-surface-variant">No type distribution available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Events by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(report.eventsByCategory || []).map((item) => (
                      <div key={item.categoryName} className="flex items-center justify-between border-b border-surface-container pb-2">
                        <p className="font-medium text-teal-900">{item.categoryName}</p>
                        <p className="font-bold">{item.count}</p>
                      </div>
                    ))}
                    {(!report.eventsByCategory || report.eventsByCategory.length === 0) && (
                      <p className="text-sm text-on-surface-variant">No category distribution available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Event Drill-Down</CardTitle>
                <CardDescription>Search, sort, and inspect event-level details. Registrations are used as participation proxy.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/70 text-[11px] uppercase tracking-widest">
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('title')}>Title</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('organizerName')}>Organizer</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('categoryName')}>Category</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('venue')}>Venue</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('status')}>Status</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('eventType')}>Type</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('startTime')}>Start</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('registrations')}>Registrations</th>
                        <th className="px-4 py-3">Conflict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low">
                      {visibleRows.map((row) => (
                        <tr key={row.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-4 py-3 font-medium text-teal-900">{row.title}</td>
                          <td className="px-4 py-3">{row.organizerName}</td>
                          <td className="px-4 py-3">{row.categoryName}</td>
                          <td className="px-4 py-3">{row.venue}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-surface-container-high text-on-surface">
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{row.eventType}</td>
                          <td className="px-4 py-3 text-sm">{row.startTime}</td>
                          <td className="px-4 py-3 font-bold">{row.registrations}</td>
                          <td className="px-4 py-3">
                            {row.hasConflict ? (
                              <span className="inline-flex items-center gap-1 text-error text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                Yes
                              </span>
                            ) : (
                              <span className="text-xs text-on-surface-variant">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {visibleRows.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">No matching events for this month and filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </AdminLayout>
  );
}
