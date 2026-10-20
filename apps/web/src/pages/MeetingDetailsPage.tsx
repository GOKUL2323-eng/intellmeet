import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  ListTodo,
  HelpCircle,
  ArrowRight,
  Search,
  FileText,
  Video,
  Check,
  Edit2,
  Save,
  ArrowLeft
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

export const MeetingDetailsPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [transcript, setTranscript] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'TRANSCRIPT' | 'ACTION_ITEMS'>('SUMMARY');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  // Edit Mode for Summary
  const [isEditing, setIsEditing] = useState(false);
  const [editOverview, setEditOverview] = useState('');

  useEffect(() => {
    fetchMeetingDetails();
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      setIsLoading(true);
      const [mRes, sRes]: [any, any] = await Promise.all([
        apiClient.get(`/meetings/${meetingId}`),
        apiClient.get(`/meetings/${meetingId}/summary`).catch(() => ({ summary: null, actionItems: [], transcript: null }))
      ]);

      setMeeting(mRes.meeting);
      if (sRes.summary) {
        setSummary(sRes.summary);
        setEditOverview(sRes.summary.overview);
        setActionItems(sRes.actionItems || []);
        setTranscript(sRes.transcript || null);
      }
    } catch (err) {
      console.error('Failed to load meeting details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAI = async () => {
    try {
      setIsProcessingAI(true);
      const res: any = await apiClient.post(`/meetings/${meetingId}/ai/process`, {
        meetingId,
        consentRecorded: true
      });
      setSummary(res.summary);
      setEditOverview(res.summary.overview);
      setActionItems(res.actionItems || []);
    } catch (err) {
      console.error('Failed to process AI summary:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSaveSummaryEdit = async () => {
    try {
      const res: any = await apiClient.patch(`/meetings/${meetingId}/summary`, {
        overview: editOverview
      });
      setSummary(res.summary);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save summary:', err);
    }
  };

  const handleConvertToTask = async (actionItem: any) => {
    try {
      await apiClient.post('/tasks/convert-action-item', {
        actionItemId: actionItem.id
      });
      setConvertedIds(prev => new Set(prev).add(actionItem.id));
    } catch (err) {
      console.error('Failed to convert action item:', err);
    }
  };

  const filteredSegments = transcript?.segments?.filter((s: any) =>
    s.text?.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
    s.speakerName?.toLowerCase().includes(transcriptSearch.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/meetings')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Meetings</span>
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {meeting?.title || 'Meeting Summary & Intelligence'}
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>{meeting ? new Date(meeting.scheduledStartTime).toLocaleDateString() : ''}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {meeting
                  ? new Date(meeting.scheduledStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : ''}
              </span>
            </span>
            <span className="font-mono text-violet-300 font-semibold">{meeting?.meetingCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAI}
            disabled={isProcessingAI}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessingAI ? 'Analyzing...' : 'Generate AI Summary'}</span>
          </button>
          <button
            onClick={() => navigate(`/lobby/${meeting?.meetingCode || meetingId}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-white/10 transition"
          >
            <Video className="w-4 h-4 text-emerald-400" />
            <span>Re-join Room</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'SUMMARY'
              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Executive Summary & Decisions</span>
        </button>

        <button
          onClick={() => setActiveTab('ACTION_ITEMS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ACTION_ITEMS'
              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Action Items ({actionItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSCRIPT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'TRANSCRIPT'
              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Full Transcript</span>
        </button>
      </div>

      {/* Tab 1: Executive Summary */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-6">
          {!summary ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
              <Sparkles className="w-10 h-10 text-violet-400 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No AI summary generated yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &quot;Generate AI Summary&quot; above to synthesize meeting decisions and action items.
              </p>
            </div>
          ) : (
            <>
              {/* Overview Box */}
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Executive Overview</span>
                  </h3>
                  <button
                    onClick={() => {
                      if (isEditing) handleSaveSummaryEdit();
                      else setIsEditing(true);
                    }}
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold"
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Overview</span>
                      </>
                    )}
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    value={editOverview}
                    onChange={(e) => setEditOverview(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl p-3.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                ) : (
                  <p className="text-sm text-slate-200 leading-relaxed">{summary.overview}</p>
                )}
              </div>

              {/* Key Decisions */}
              {summary.decisions?.length > 0 && (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved Decisions</span>
                  </h3>
                  <div className="grid gap-2.5">
                    {summary.decisions.map((dec: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-white/5 text-xs text-slate-200"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{dec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights & Next Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {summary.discussionHighlights?.length > 0 && (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      <span>Discussion Highlights</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {summary.discussionHighlights.map((h: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.nextSteps?.length > 0 && (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      <span>Agreed Next Steps</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {summary.nextSteps.map((s: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Action Items */}
      {activeTab === 'ACTION_ITEMS' && (
        <div className="space-y-4">
          {actionItems.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <ListTodo className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No action items extracted</h3>
              <p className="text-xs text-slate-400">Run AI intelligence processing to extract tasks.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {actionItems.map((item) => {
                const isConverted = convertedIds.has(item.id) || item.status === 'CONVERTED';
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-600/20 text-violet-300 border border-violet-500/30">
                          {item.priority}
                        </span>
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                        {item.assigneeName && <span>Owner: {item.assigneeName}</span>}
                        {item.dueDate && <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleConvertToTask(item)}
                      disabled={isConverted}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        isConverted
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/25'
                      }`}
                    >
                      {isConverted ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tracked in Kanban</span>
                        </>
                      ) : (
                        <>
                          <span>Convert to Task</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Searchable Transcript */}
      {activeTab === 'TRANSCRIPT' && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={transcriptSearch}
              onChange={(e) => setTranscriptSearch(e.target.value)}
              placeholder="Search transcript text or speaker..."
              className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="divide-y divide-white/5 space-y-3 pt-2">
            {filteredSegments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No transcript segments available for this meeting.
              </div>
            ) : (
              filteredSegments.map((s: any, idx: number) => (
                <div key={idx} className="pt-3 flex items-start gap-4 text-xs">
                  <span className="font-mono text-slate-500 text-[11px] shrink-0 mt-0.5">
                    {Math.floor(s.startTime / 60)}:{(s.startTime % 60).toString().padStart(2, '0')}
                  </span>
                  <div>
                    <span className="font-bold text-violet-400 mr-2">{s.speakerName}:</span>
                    <span className="text-slate-300 leading-relaxed">{s.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
