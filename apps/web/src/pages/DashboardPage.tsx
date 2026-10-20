import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  KanbanSquare,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../services/apiClient';
import { AISummaryModal } from '../components/AISummaryModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, workspace } = useAuthStore();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [selectedActionItems, setSelectedActionItems] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [workspace]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [meetingsRes, tasksRes, analyticsRes]: [any, any, any] = await Promise.all([
        apiClient.get('/meetings?limit=5').catch(() => ({ meetings: [] })),
        apiClient.get('/tasks?limit=5').catch(() => ({ tasks: [] })),
        apiClient.get('/analytics/overview').catch(() => ({ overview: null }))
      ]);

      setMeetings(meetingsRes.meetings || []);
      setTasks(tasksRes.tasks || []);
      setAnalytics(analyticsRes.overview || null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSummary = async (meetingId: string) => {
    try {
      const data: any = await apiClient.get(`/meetings/${meetingId}/summary`);
      setSelectedSummary(data.summary);
      setSelectedActionItems(data.actionItems || []);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const upcomingMeeting = meetings.find(m => m.status === 'SCHEDULED' || m.status === 'LIVE');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Good day, {user?.fullName?.split(' ')[0] || 'Team'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Welcome to <span className="text-slate-200 font-semibold">{workspace?.name}</span>. Here is your team&apos;s real-time briefing.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <button
            onClick={() => navigate('/meetings')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-violet-600/25 shrink-0"
          >
            <Video className="w-4 h-4" />
            <span>Launch Meeting</span>
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold text-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Meetings
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {analytics?.totalMeetings ?? meetings.length}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{analytics?.completedMeetingsCount ?? 1} completed</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Video className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Kanban Tasks
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {analytics?.totalTasks ?? tasks.length}
            </div>
            <div className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
              <span>{analytics?.completionRate ?? 25}% completion rate</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <KanbanSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              AI Action Items
            </div>
            <div className="text-2xl font-black text-white mt-1">
              3
            </div>
            <div className="text-[11px] text-violet-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Extracted from audio</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Team Members
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {analytics?.totalMembers ?? 3}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Active collaborators</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Spotlight: Next Upcoming Meeting */}
      {upcomingMeeting && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-950/60 via-slate-900 to-slate-900 border border-violet-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-violet-600/30 text-violet-300 text-[11px] font-bold border border-violet-500/30">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
              <span>{upcomingMeeting.status === 'LIVE' ? 'LIVE NOW' : 'UPCOMING SESSION'}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{upcomingMeeting.title}</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {upcomingMeeting.description || 'Enterprise collaboration session.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>
                  {new Date(upcomingMeeting.scheduledStartTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(upcomingMeeting.scheduledStartTime).toLocaleDateString()}</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-violet-300">{upcomingMeeting.meetingCode}</span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/lobby/${upcomingMeeting.meetingCode}`)}
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-violet-600/30 transition shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Enter Meeting Lobby</span>
          </button>
        </div>
      )}

      {/* Two Columns: Recent Meetings & Active Kanban Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Meetings */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Recent Meetings</h3>
            </div>
            <button
              onClick={() => navigate('/meetings')}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {meetings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No meetings found. Schedule one to start collaborating!
              </div>
            ) : (
              meetings.map((m) => (
                <div
                  key={m.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-2 rounded-lg transition"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{m.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span>{new Date(m.scheduledStartTime).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{m.meetingCode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.aiProcessingStatus === 'COMPLETED' ? (
                      <button
                        onClick={() => handleOpenSummary(m.id)}
                        className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>AI Summary</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/lobby/${m.meetingCode}`)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Tasks */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KanbanSquare className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Project Tasks</h3>
            </div>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
            >
              <span>Go to Kanban</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {tasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No tasks assigned yet. Convert meeting action items into tasks!
              </div>
            ) : (
              tasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate('/tasks')}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-2 rounded-lg cursor-pointer transition"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-slate-200">{t.title}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="capitalize">{t.status.replace('_', ' ')}</span>
                      {t.dueDate && (
                        <>
                          <span>•</span>
                          <span>Due {new Date(t.dueDate).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      t.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : t.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Summary Modal */}
      {selectedSummary && (
        <AISummaryModal
          summary={selectedSummary}
          actionItems={selectedActionItems}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </div>
  );
};
