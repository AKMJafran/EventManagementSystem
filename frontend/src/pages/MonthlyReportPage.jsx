import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

export default function MonthlyReportPage() {
  const [report, setReport] = useState(null);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);

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
  }, [year, month]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchReport(year, month);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Monthly Event Report</h1>
          <p className="text-gray-600">See totals and breakdowns for the selected month.</p>
        </div>
        <Link to="/admin/dashboard" className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
          Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <input
            type="number"
            min="2020"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input
            type="number"
            min="1"
            max="12"
            value={Number(month)}
            onChange={(e) => setMonth(String(e.target.value).padStart(2, '0'))}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <button type="submit" className="h-12 self-end bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Load Report
        </button>
      </form>

      {loading ? (
        <div className="text-center py-10">Loading report...</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded shadow">
              <div className="text-sm font-semibold text-gray-500">Total Events</div>
              <div className="text-3xl font-bold mt-2">{report.totalEvents}</div>
            </div>
            <div className="bg-white p-5 rounded shadow">
              <div className="text-sm font-semibold text-gray-500">Approved</div>
              <div className="text-3xl font-bold mt-2">{report.approvedEvents}</div>
            </div>
            <div className="bg-white p-5 rounded shadow">
              <div className="text-sm font-semibold text-gray-500">Pending</div>
              <div className="text-3xl font-bold mt-2">{report.pendingEvents}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded shadow">
              <div className="text-sm font-semibold text-gray-500">Rejected</div>
              <div className="text-3xl font-bold mt-2">{report.rejectedEvents}</div>
            </div>
            <div className="bg-white p-5 rounded shadow">
              <div className="text-sm font-semibold text-gray-500">Urgent Events</div>
              <div className="text-3xl font-bold mt-2">{report.urgentEvents}</div>
            </div>
            <div className="bg-white p-5 rounded shadow">
              <div className="text-sm font-semibold text-gray-500">Month</div>
              <div className="text-3xl font-bold mt-2">{report.month}/{report.year}</div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="bg-white p-5 rounded shadow">
              <h2 className="text-xl font-semibold mb-4">Events by Type</h2>
              {report.eventsByType.length === 0 ? (
                <div className="text-gray-500">No event type data available.</div>
              ) : (
                <ul className="space-y-2">
                  {report.eventsByType.map((item) => (
                    <li key={item.eventType} className="flex justify-between border-b pb-2">
                      <span>{item.eventType}</span>
                      <span className="font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white p-5 rounded shadow">
              <h2 className="text-xl font-semibold mb-4">Events by Category</h2>
              {report.eventsByCategory.length === 0 ? (
                <div className="text-gray-500">No category breakdown available.</div>
              ) : (
                <ul className="space-y-2">
                  {report.eventsByCategory.map((item) => (
                    <li key={item.categoryName} className="flex justify-between border-b pb-2">
                      <span>{item.categoryName}</span>
                      <span className="font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-gray-500">No report data available.</div>
      )}
    </div>
  );
}
