import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Video,
  Sparkles,
  KanbanSquare,
  ShieldCheck,
  Zap,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe2,
  Cpu
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Logo } from '../components/Logo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();

  const handleDemoLogin = async () => {
    try {
      await login('alex.chen@intellmeet.com', 'Password123!');
      navigate('/dashboard');
    } catch (err) {
      navigate('/signin');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="h-20 border-b border-white/10 px-8 flex items-center justify-between sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-xl">
        <Link to="/" className="hover:opacity-90 transition">
          <Logo size="lg" subtitle="Enterprise AI Collaboration" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#workflow" className="hover:text-white transition">Workflow</a>
          <a href="#security" className="hover:text-white transition">Enterprise Security</a>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-violet-600/30"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <button
                onClick={handleDemoLogin}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold text-sm transition"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>1-Click Demo</span>
              </button>
              <Link
                to="/signin"
                className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-violet-600/30"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glowing backdrop pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-8 shadow-inner">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>Next-Gen WebRTC Video & AI Meeting Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-[1.1] mb-6">
          Every conversation transformed into{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
            instant, actionable execution.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-3xl mb-10 leading-relaxed">
          IntellMeet unifies ultra-low latency WebRTC video conferencing, automated AI meeting summaries,
          structured action items extraction, and integrated Kanban project management into a single,
          isolated multi-tenant enterprise platform.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleDemoLogin}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-base transition shadow-xl shadow-violet-600/30"
          >
            <span>Launch Live Interactive Demo</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <Link
            to="/signup"
            className="px-8 py-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 font-bold text-base transition"
          >
            Create Free Team Workspace
          </Link>
        </div>

        {/* Hero Interactive Showcase Card */}
        <div className="w-full max-w-5xl mt-16 rounded-3xl bg-slate-900/80 border border-white/10 p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950 aspect-video flex flex-col relative">
            {/* Mock Header */}
            <div className="h-12 bg-slate-900 border-b border-white/10 px-4 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">Sprint 24 Architecture & WebRTC Sync</span>
                <span className="text-slate-500">|</span>
                <span className="text-violet-400 font-medium">AI Recording & Live Summary Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-violet-600/20 text-violet-300 border border-violet-500/30 font-semibold text-[11px]">
                  4 Participants
                </span>
              </div>
            </div>

            {/* Mock Grid */}
            <div className="flex-1 grid grid-cols-2 p-4 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-900 border border-violet-500/40 p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-white">Alex Chen (Host)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-violet-600 mx-auto flex items-center justify-center font-bold text-xl text-white shadow-lg">
                    AC
                  </div>
                  <span className="mt-2 block text-xs font-semibold text-slate-300">Speaking...</span>
                </div>
                <div className="h-1 w-full bg-violet-500/30 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 w-3/4 animate-pulse" />
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 border border-white/10 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-white">Elena Rostova (DevOps)</span>
                </div>
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-blue-600 mx-auto flex items-center justify-center font-bold text-xl text-white">
                    ER
                  </div>
                  <span className="mt-2 block text-xs text-slate-400">Listening</span>
                </div>
                <span className="text-[10px] text-slate-500 text-center">WebRTC Peer Connection Stable</span>
              </div>
            </div>

            {/* Bottom floating intelligence preview banner */}
            <div className="p-3 bg-violet-950/80 border-t border-violet-500/30 flex items-center justify-between text-xs px-6">
              <div className="flex items-center gap-2 text-violet-200">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>AI Detected Action Item: &quot;Configure Coturn STUN/TURN ICE credentials&quot;</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                Auto-Saved to Kanban
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-white/10 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Engineered for high-performing enterprise teams
            </h2>
            <p className="text-sm text-slate-400">
              Zero clutter. Absolute data privacy. Seamless transitions from conversations to tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-violet-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">WebRTC Video & Mesh Signaling</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct peer-to-peer audio and video transmission with public STUN servers, crystal-clear screen sharing, and socket presence.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-violet-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Automated AI Summaries</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts key decisions, discussion highlights, unresolved questions, next steps, and structured deliverables with strict schema validation.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-violet-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <KanbanSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Integrated Kanban Board</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                1-click conversion from meeting action items directly into workflow columns with assignees, due dates, priority tags, and discussion threads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-3">How IntellMeet Works</h2>
            <p className="text-xs text-slate-400">From schedule to delivery in four effortless steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Schedule or Launch', desc: 'Create unique, secure meeting codes with customizable lobby permissions.' },
              { step: '02', title: 'Real-Time Collaborate', desc: 'High-definition video, screen sharing, persistent chat, and shared live notes.' },
              { step: '03', title: 'AI Extraction', desc: 'Automated synthesis generates structured decisions and prioritized action items.' },
              { step: '04', title: 'Execute in Kanban', desc: 'Review, assign, and track progress on project boards until completion.' }
            ].map((s) => (
              <div key={s.step} className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 relative">
                <span className="text-3xl font-black text-violet-500/30 block mb-2">{s.step}</span>
                <h4 className="text-sm font-bold text-white mb-1.5">{s.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 border-t border-white/10 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise-Grade Security Architecture</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">
              Tenant isolation and absolute user consent built in
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              IntellMeet enforces multi-tenant workspace isolation on every database query, uses JWT access tokens with refresh token family rotation, and strictly requires explicit participant consent before processing meeting audio or transcripts.
            </p>
            <div className="space-y-3">
              {[
                'Strict workspaceId verification across all database queries',
                'Cryptographic refresh-token rotation with family reuse attack detection',
                'Explicit consent gate before any AI transcription or summary processing',
                'Zero client-side secrets: all AI keys remain securely on the backend'
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-white/10 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Lock className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-bold text-white">Security & Compliance Verified</span>
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Data Isolation</span>
                <span className="text-emerald-400 font-semibold">Enforced Mongoose Indexes</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Auth Standard</span>
                <span className="text-slate-200 font-semibold">JWT + HttpOnly Cookie</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Signaling Protocol</span>
                <span className="text-slate-200 font-semibold">Socket.io + STUN</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>AI Model Provider</span>
                <span className="text-violet-400 font-semibold">OpenAI / Local Mock Fallback</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-8 bg-[#0B0F19]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Logo size="sm" showText={false} />
            <span className="font-semibold text-slate-300">IntellMeet Enterprise Platform</span>
            <span>© 2026 IntellMeet Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/signin" className="hover:text-slate-300 transition">Sign In</Link>
            <Link to="/signup" className="hover:text-slate-300 transition">Register</Link>
            <button onClick={handleDemoLogin} className="hover:text-slate-300 transition">Demo Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
