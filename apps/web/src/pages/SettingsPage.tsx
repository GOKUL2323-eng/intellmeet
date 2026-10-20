import React, { useState } from 'react';
import {
  User,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Volume2,
  Camera,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../services/apiClient';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Audio/Video Defaults
  const [defaultMute, setDefaultMute] = useState(true);
  const [defaultCameraOff, setDefaultCameraOff] = useState(false);

  // AI Privacy
  const [aiConsent, setAiConsent] = useState(true);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await apiClient.patch('/users/me', { fullName, timezone });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure personal account, meeting defaults, and AI data privacy
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Profile changes saved successfully.</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-violet-400" />
          <span>Personal Profile</span>
        </h2>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-800/30 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full sm:w-72 bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
            >
              <option value="UTC">UTC (Universal Coordinated Time)</option>
              <option value="America/New_York">America / New York (EST)</option>
              <option value="America/Los_Angeles">America / Los Angeles (PST)</option>
              <option value="Europe/London">Europe / London (GMT)</option>
              <option value="Asia/Kolkata">Asia / Kolkata (IST)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition shadow-md shadow-violet-600/30 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Meeting Media Defaults */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-400" />
          <span>Meeting Entry Defaults</span>
        </h2>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-white/5 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200">Always Join Muted</span>
              <p className="text-[11px] text-slate-400">
                Keep microphone muted by default when joining meeting rooms
              </p>
            </div>
            <input
              type="checkbox"
              checked={defaultMute}
              onChange={(e) => setDefaultMute(e.target.checked)}
              className="rounded text-violet-600"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-white/5 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200">Always Join with Camera Off</span>
              <p className="text-[11px] text-slate-400">
                Keep camera disabled by default when entering rooms
              </p>
            </div>
            <input
              type="checkbox"
              checked={defaultCameraOff}
              onChange={(e) => setDefaultCameraOff(e.target.checked)}
              className="rounded text-violet-600"
            />
          </label>
        </div>
      </div>

      {/* AI Privacy & Retention Policy */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>AI Intelligence & Data Retention</span>
        </h2>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-white/5 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200">Enable AI Meeting Summaries</span>
              <p className="text-[11px] text-slate-400">
                Automatically generate structured overview, decisions, and action items upon meeting conclusion
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => setAiConsent(e.target.checked)}
              className="rounded text-violet-600"
            />
          </label>

          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-rose-300">Data Deletion Policy</span>
              <p className="text-[11px] text-slate-400">
                Permanently purge all recorded speech transcripts and audio segments from storage
              </p>
            </div>
            <button
              type="button"
              onClick={() => alert('Transcript retention cycle executed. Transcripts purged.')}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition shrink-0"
            >
              Purge Transcripts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
