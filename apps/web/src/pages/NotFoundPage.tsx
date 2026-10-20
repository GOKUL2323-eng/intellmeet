import React from 'react';
import { Link } from 'react-router-dom';
import { Video, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6">
        <Video className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
      <h2 className="text-lg font-bold text-slate-300 mb-2">Page or Room Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm mb-8 leading-relaxed">
        The meeting room or page you are attempting to reach does not exist, has expired, or is restricted.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to IntellMeet Home</span>
      </Link>
    </div>
  );
};
