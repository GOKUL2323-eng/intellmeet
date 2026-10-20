import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Video
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';

const COLORS = ['#8B5CF6', '#3B82F6', '#F59E0B', '#10B981'];

export const AnalyticsPage: React.FC = () => {
  const { workspace } = useAuthStore();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [workspace, days]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res: any = await apiClient.get(`/analytics/overview?days=${days}`);
      setData(res.overview);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvData: any = await apiClient.get('/analytics/export');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intellmeet-analytics-${workspace?.slug || 'export'}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV Export failed:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Analytics & Reports</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time collaboration metrics, meeting volume, and execution velocity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/30 transition shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="text-xs font-semibold text-slate-400 uppercase">Total Meetings</div>
          <div className="text-2xl font-black text-white mt-1">{data?.totalMeetings || 0}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{data?.completedMeetingsCount || 0} Completed</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="text-xs font-semibold text-slate-400 uppercase">Estimated Collaboration</div>
          <div className="text-2xl font-black text-white mt-1">
            {Math.round((data?.totalMeetingMinutes || 0) / 60)} hrs
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data?.totalMeetingMinutes || 0} total minutes
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="text-xs font-semibold text-slate-400 uppercase">Task Completion Rate</div>
          <div className="text-2xl font-black text-white mt-1">
            {data?.completionRate || 0}%
          </div>
          <div className="text-[11px] text-blue-400 mt-1">
            {data?.completedTasks || 0} of {data?.totalTasks || 0} done
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="text-xs font-semibold text-slate-400 uppercase">Overdue Tasks</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {data?.overdueTasks || 0}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">Requires team attention</div>
        </div>
      </div>

      {/* Daily Meeting Trends Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <span>Daily Meeting Volume</span>
        </h3>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={
                data?.meetingsByDay?.length > 0
                  ? data.meetingsByDay
                  : [
                      { date: 'Mon', count: 2 },
                      { date: 'Tue', count: 4 },
                      { date: 'Wed', count: 3 },
                      { date: 'Thu', count: 5 },
                      { date: 'Fri', count: 1 }
                    ]
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tasks by Workflow Stage
          </h3>
          <div className="space-y-2.5 pt-2">
            {(data?.tasksByStatus || []).map((s: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{s.status.replace('_', ' ')}</span>
                <span className="font-bold text-white">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tasks by Priority Level
          </h3>
          <div className="space-y-2.5 pt-2">
            {(data?.tasksByPriority || []).map((p: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{p.priority}</span>
                <span className="font-bold text-white">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
