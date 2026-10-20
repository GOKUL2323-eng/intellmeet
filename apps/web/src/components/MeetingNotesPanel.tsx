import React from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';
import { useMeetingStore } from '../stores/meetingStore';

interface Props {
  onClose: () => void;
}

export const MeetingNotesPanel: React.FC<Props> = ({ onClose }) => {
  const { notes, setNotes } = useMeetingStore();

  return (
    <aside className="w-full md:w-80 h-full fixed md:relative inset-0 md:inset-auto bg-slate-900/98 md:bg-slate-900/95 border-l border-white/10 flex flex-col z-40 md:z-20 backdrop-blur-xl">
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <FileText className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold">Shared Notes</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2 text-[11px] text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Auto-saved to meeting records</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down agenda items, quick decisions, links, or notes..."
          className="w-full flex-1 bg-slate-800/60 border border-white/10 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
        />
      </div>
    </aside>
  );
};
