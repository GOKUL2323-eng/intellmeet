import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ListTodo,
  Check,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface Props {
  summary: {
    overview: string;
    decisions: string[];
    discussionHighlights: string[];
    unresolvedQuestions: string[];
    nextSteps: string[];
  };
  actionItems: Array<{
    id: string;
    title: string;
    description?: string;
    assigneeName?: string;
    priority: string;
    status: string;
    dueDate?: string;
  }>;
  onClose: () => void;
}

export const AISummaryModal: React.FC<Props> = ({ summary, actionItems, onClose }) => {
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleConvertToTask = async (actionItem: any) => {
    try {
      setLoadingId(actionItem.id);
      await apiClient.post('/tasks/convert-action-item', {
        actionItemId: actionItem.id
      });
      setConvertedIds(prev => new Set(prev).add(actionItem.id));
    } catch (err) {
      console.error('Failed to convert action item:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-violet-500/30 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Meeting Intelligence</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Validated
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generated from recorded speech segments & participant discussions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Executive Overview */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Overview</span>
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">{summary.overview}</p>
          </div>

          {/* Key Decisions */}
          {summary.decisions?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Key Decisions Made</span>
              </h3>
              <div className="grid gap-2">
                {summary.decisions.map((decision, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/5 text-xs text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{decision}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discussion Highlights */}
          {summary.discussionHighlights?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
                <ListTodo className="w-3.5 h-3.5" />
                <span>Discussion Highlights</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {summary.discussionHighlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Action Items */}
          {actionItems?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Extracted Action Items & Deliverables</span>
              </h3>
              <div className="grid gap-3">
                {actionItems.map((item) => {
                  const isConverted = convertedIds.has(item.id) || item.status === 'CONVERTED';
                  const isLoading = loadingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-800/60 border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityBadge(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>
                          <span className="text-xs font-semibold text-slate-100">{item.title}</span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                          {item.assigneeName && <span>Owner: {item.assigneeName}</span>}
                          {item.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleConvertToTask(item)}
                        disabled={isConverted || isLoading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                          isConverted
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20'
                        }`}
                      >
                        {isConverted ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Converted</span>
                          </>
                        ) : isLoading ? (
                          <span>Adding...</span>
                        ) : (
                          <>
                            <span>Add to Kanban</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unresolved Questions & Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.unresolvedQuestions?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Unresolved Questions</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {summary.unresolvedQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.nextSteps?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Next Steps</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {summary.nextSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-slate-900/60">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>AI suggestions are based on meeting consent and require user review.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
