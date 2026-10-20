import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Plus,
  Search,
  Calendar,
  Clock,
  Copy,
  Check,
  Sparkles,
  Play,
  X,
  Users,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';
import { AISummaryModal } from '../components/AISummaryModal';

export const MeetingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspace } = useAuthStore();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState('10:00');
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [defaultMute, setDefaultMute] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copied indicator
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Summary Modal
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [selectedActionItems, setSelectedActionItems] = useState<any[]>([]);

  useEffect(() => {
    fetchMeetings();
  }, [workspace, filterStatus]);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      let endpoint = '/meetings?limit=50';
      if (filterStatus !== 'ALL') {
        endpoint += `&status=${filterStatus}`;
      }
      if (searchQuery) {
        endpoint += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const data: any = await apiClient.get(endpoint);
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      setIsSubmitting(true);
      const startDateTime = new Date(`${newDate}T${newTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 45 * 60 * 1000); // 45 min default

      await apiClient.post('/meetings', {
        title: newTitle,
        description: newDescription,
        scheduledStartTime: startDateTime.toISOString(),
        scheduledEndTime: endDateTime.toISOString(),
        accessSettings: {
          allowGuests: true,
          waitingRoom,
          defaultMute
        }
      });

      setShowScheduleModal(false);
      setNewTitle('');
      setNewDescription('');
      fetchMeetings();
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantMeeting = async () => {
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000);

      const res: any = await apiClient.post('/meetings', {
        title: `Instant Meeting (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        scheduledStartTime: now.toISOString(),
        scheduledEndTime: end.toISOString(),
        accessSettings: {
          allowGuests: true,
          waitingRoom: false,
          defaultMute: false
        }
      });

      navigate(`/lobby/${res.meeting.meetingCode}`);
    } catch (err) {
      console.error('Failed to start instant meeting:', err);
    }
  };

  const handleCopyInvite = (code: string) => {
    const inviteUrl = `${window.location.origin}/lobby/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
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

  const filteredMeetings = meetings.filter((m) =>
    m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.meetingCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Meetings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Schedule, manage, and review AI intelligence from team meetings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleInstantMeeting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold text-xs transition"
          >
            <Play className="w-4 h-4 fill-current text-emerald-400" />
            <span>Instant Meeting</span>
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-violet-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-white/10 max-w-fit">
          {['ALL', 'SCHEDULED', 'LIVE', 'ENDED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterStatus === status
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title or code..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Meetings List */}
      <div className="grid gap-3">
        {filteredMeetings.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
            <Video className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No meetings found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Schedule your first team conference or launch an instant room to get started.
            </p>
          </div>
        ) : (
          filteredMeetings.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'LIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : m.status === 'SCHEDULED'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {m.status}
                  </span>
                  <h3 className="text-sm font-bold text-white">{m.title}</h3>
                </div>

                {m.description && (
                  <p className="text-xs text-slate-400 max-w-2xl">{m.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(m.scheduledStartTime).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {new Date(m.scheduledStartTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="font-mono text-violet-300 font-semibold">{m.meetingCode}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyInvite(m.meetingCode)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Copy meeting join link"
                >
                  {copiedCode === m.meetingCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                {m.aiProcessingStatus === 'COMPLETED' && (
                  <button
                    onClick={() => handleOpenSummary(m.id)}
                    className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Summary</span>
                  </button>
                )}

                <button
                  onClick={() => navigate(`/lobby/${m.meetingCode}`)}
                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/25 transition"
                >
                  {m.status === 'ENDED' ? 'Re-Enter' : 'Join'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>Schedule New Meeting</span>
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Sprint Architecture & AI Alignment"
                  required
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Agenda
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Key topics to discuss..."
                  rows={2}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>

              {/* Security & Access Toggles */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waitingRoom}
                    onChange={(e) => setWaitingRoom(e.target.checked)}
                    className="rounded border-slate-700 text-violet-600 focus:ring-violet-500/40"
                  />
                  <span className="text-xs text-slate-300">
                    Enable Waiting Room (Host admits participants)
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defaultMute}
                    onChange={(e) => setDefaultMute(e.target.checked)}
                    className="rounded border-slate-700 text-violet-600 focus:ring-violet-500/40"
                  />
                  <span className="text-xs text-slate-300">
                    Mute participant microphones upon joining
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Scheduling...' : 'Save & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
