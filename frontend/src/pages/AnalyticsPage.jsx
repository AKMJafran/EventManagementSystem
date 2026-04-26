import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import AdminLayout from '../components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { exportRowsToExcel } from '../utils/exportExcel';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'CULTURAL', label: 'Cultural' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'URGENT', label: 'Urgent' },
];

const STATUS_COLORS = {
  APPROVED: '#169c89',
  PENDING: '#efb034',
  REJECTED: '#d73d4a',
  CANCELLED: '#667085',
};

const TYPE_COLORS = ['#0d9488', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444'];

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function getStatusBadge(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'APPROVED') {
    return 'bg-secondary-container text-on-secondary-container';
  }
  if (normalized === 'PENDING') {
    return 'bg-tertiary-container text-on-tertiary-container';
  }
  if (normalized === 'REJECTED') {
    return 'bg-error-container text-on-error-container';
  }
  if (normalized === 'CANCELLED') {
    return 'bg-surface-container-high text-on-surface-variant';
  }
  return 'bg-surface-container text-on-surface';
}

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

function getMaxCount(items = []) {
  return items.reduce((max, item) => Math.max(max, Number(item?.count) || 0), 0);
}

function formatPercent(count, total) {
  if (!total) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

function DistributionList({ items, total, colorMap }) {
  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">No distribution available for this selection.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const count = Number(item?.count) || 0;
        const width = total ? `${(count / total) * 100}%` : '0%';
        const color = colorMap?.[item.label] || TYPE_COLORS[idx % TYPE_COLORS.length];

        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="font-medium text-teal-900 truncate">{item.label}</span>
              </div>
              <span className="text-sm text-on-surface-variant shrink-0">{count} ({formatPercent(count, total)})</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-container">
              <div className="h-2.5 rounded-full" style={{ width, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ items }) {
  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">No daily trend available for this selection.</p>;
  }

  const maxCount = getMaxCount(items) || 1;

  return (
    <div className="h-full flex items-end gap-2">
      {items.map((item) => {
        const count = Number(item?.count) || 0;
        const height = `${Math.max((count / maxCount) * 100, count > 0 ? 10 : 4)}%`;

        return (
          <div key={item.label} className="flex-1 min-w-0 h-full flex flex-col justify-end gap-2">
            <div className="flex-1 flex items-end">
              <div
                className="w-full rounded-t-md bg-teal-600/85 hover:bg-teal-700 transition-colors"
                style={{ height }}
                title={`${item.label}: ${count}`}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-teal-900">{count}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  const [fromDate, setFromDate] = useState(getMonthStartISO());
  const [toDate, setToDate] = useState(getTodayISO());
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [venue, setVenue] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortDirection, setSortDirection] = useState('desc');

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReport = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select a valid date range');
      return;
    }

    setLoading(true);
    try {
      const params = {
        from: fromDate,
        to: toDate,
      };

      if (status) params.status = status;
      if (eventType) params.eventType = eventType;
      if (categoryId) params.categoryId = categoryId;
      if (venue.trim()) params.venue = venue.trim();
      if (organizerName.trim()) params.organizerName = organizerName.trim();

      const response = await axiosInstance.get('/events/reports/analytics', { params });
      setReport(response.data);
    } catch (error) {
      toast.error('Failed to load analytics report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchReport();
  }, []);

  const visibleRows = useMemo(() => {
    const rows = report?.events || [];
    const filtered = rows.filter((row) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.title?.toLowerCase().includes(q) ||
        row.organizerName?.toLowerCase().includes(q) ||
        row.categoryName?.toLowerCase().includes(q) ||
        row.venue?.toLowerCase().includes(q) ||
        row.status?.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered].sort((a, b) => compareValues(a[sortBy], b[sortBy], sortDirection));
    return sorted;
  }, [report, search, sortBy, sortDirection]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDirection('asc');
  };

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
    link.setAttribute('download', `faculty-analytics-${fromDate}-to-${toDate}.csv`);
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

    exportRowsToExcel(
      visibleRows,
      [
        { header: 'Title', value: (item) => item.title },
        { header: 'Organizer', value: (item) => item.organizerName },
        { header: 'Category', value: (item) => item.categoryName },
        { header: 'Venue', value: (item) => item.venue },
        { header: 'Status', value: (item) => item.status },
        { header: 'Type', value: (item) => item.eventType },
        { header: 'Start Time', value: (item) => item.startTime },
        { header: 'End Time', value: (item) => item.endTime },
        { header: 'Registrations', value: (item) => item.registrations },
        { header: 'Conflict', value: (item) => (item.hasConflict ? 'Yes' : 'No') },
      ],
      `faculty-analytics-${fromDate}-to-${toDate}.xls`,
      'FacultyAnalytics'
    );
  };

  const exportPdf = () => {
    if (!visibleRows.length) {
      toast.error('No rows to export');
      return;
    }

    window.print();
  };

  const printReport = () => {
    window.print();
  };

  const summaryCards = [
    { key: 'totalEvents', label: 'Total Events', value: report?.totalEvents || 0, hint: `${fromDate} to ${toDate}` },
    { key: 'upcomingEvents', label: 'Upcoming', value: report?.upcomingEvents || 0, hint: 'Approved and upcoming' },
    { key: 'completedEvents', label: 'Completed', value: report?.completedEvents || 0, hint: 'Approved and completed' },
    { key: 'pendingEvents', label: 'Pending', value: report?.pendingEvents || 0, hint: 'Awaiting admin action' },
    { key: 'totalRegistrations', label: 'Registrations', value: report?.totalRegistrations || 0, hint: 'Registration count proxy' },
    { key: 'approvalRate', label: 'Approval Rate', value: `${report?.approvalRate || 0}%`, hint: 'Approved / Total' },
  ];
  const totalEvents = report?.totalEvents || 0;
  const statusData = report?.eventsByStatus || [];
  const typeData = report?.eventsByType || [];
  const trendData = report?.dailyTrend || [];

  return (
    <AdminLayout>
      <section className="max-w-7xl mx-auto space-y-8 print:space-y-4">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 print:hidden">
          <div>
            <h1 className="text-4xl font-serif font-bold text-teal-900 tracking-tight mb-2">Faculty Analytics Report</h1>
            <p className="text-on-surface-variant max-w-3xl">
              Consolidated event intelligence for faculty operations, approvals, participation trends, and organizer performance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/reports/monthly" className="text-sm font-bold text-primary hover:underline">Monthly Snapshot</Link>
            <Link to="/admin/dashboard" className="text-sm font-bold text-on-surface-variant hover:underline">Back to Dashboard</Link>
          </div>
        </header>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-2xl">Filters</CardTitle>
            <CardDescription>Apply multi-dimensional filters for date range, status, type, category, and organizer.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input type="date" label="From" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" label="To" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
              <Select label="Event Type" value={eventType} onChange={(e) => setEventType(e.target.value)} options={EVENT_TYPE_OPTIONS} />
              <Select
                label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
              />
              <Input label="Venue" placeholder="Example: Main Hall" value={venue} onChange={(e) => setVenue(e.target.value)} />
              <Input label="Organizer" placeholder="Search organizer name" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} />
              <Input label="Search Results" placeholder="Search in drill-down table" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button isLoading={loading} onClick={fetchReport}>Load Analytics</Button>
              <Button variant="outline" onClick={() => {
                setFromDate(getMonthStartISO());
                setToDate(getTodayISO());
                setStatus('');
                setEventType('');
                setCategoryId('');
                setVenue('');
                setOrganizerName('');
                setSearch('');
              }}>
                Reset Filters
              </Button>
              <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
              <Button variant="secondary" onClick={exportExcel}>Export Excel</Button>
              <Button variant="secondary" onClick={exportPdf}>Export PDF</Button>
              <Button variant="outline" onClick={printReport}>Print</Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-16 text-center text-on-surface-variant">Loading analytics report...</CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {summaryCards.map((item) => (
                <Card key={item.key} className="hover:shadow-md transition-shadow">
                  <CardContent>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{item.label}</p>
                    <p className="text-3xl font-bold text-teal-900 mt-2">{item.value}</p>
                    <p className="text-xs text-on-surface-variant mt-2">{item.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <DistributionList items={statusData} total={totalEvents} colorMap={STATUS_COLORS} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Events By Type</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <DistributionList items={typeData} total={totalEvents} />
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Trend</CardTitle>
                  <CardDescription>Events scheduled by day in selected period.</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <TrendChart items={trendData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Organizers</CardTitle>
                  <CardDescription>Most active event organizers in selected range.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(report?.topOrganizers || []).slice(0, 8).map((organizer) => (
                      <div key={organizer.organizerId} className="flex items-center justify-between border-b border-surface-container pb-2">
                        <div>
                          <p className="font-semibold text-teal-900">{organizer.organizerName}</p>
                          <p className="text-xs text-on-surface-variant">Approved: {organizer.approvedEvents} | Pending: {organizer.pendingEvents}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{organizer.totalEvents}</p>
                          <p className="text-xs text-on-surface-variant">events</p>
                        </div>
                      </div>
                    ))}
                    {(!report?.topOrganizers || report.topOrganizers.length === 0) && (
                      <p className="text-sm text-on-surface-variant">No organizer activity available for this selection.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Drill-Down Event Table</CardTitle>
                <CardDescription>
                  Sortable event-level rows for operational follow-up. Registration is used as participation proxy until check-in data exists.
                </CardDescription>
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
                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(row.status)}`}>
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
                          <td className="px-4 py-8 text-center text-on-surface-variant" colSpan={9}>No matching events for current filters/search.</td>
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
