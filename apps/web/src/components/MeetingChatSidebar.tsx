import React, { useState } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { useMeetingStore } from '../stores/meetingStore';
import { useAuthStore } from '../stores/authStore';

interface Props {
  onSendMessage: (msg: string) => void;
  onClose: () => void;
}

export const MeetingChatSidebar: React.FC<Props> = ({ onSendMessage, onClose }) => {
  const { user } = useAuthStore();
  const { chatMessages } = useMeetingStore();
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <aside className="w-80 h-full bg-slate-900/95 border-l border-white/10 flex flex-col z-20 backdrop-blur-xl">
      {/* Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <MessageSquare className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold">In-Meeting Chat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 stroke-[1.5] mb-2 text-slate-600" />
            <p>No messages yet.</p>
            <p className="mt-1">Messages sent here are visible to all meeting participants.</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.senderName === user?.fullName || msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? 'bg-violet-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 border border-white/10 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to everyone..."
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/50"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};
