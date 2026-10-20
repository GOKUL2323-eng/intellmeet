import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  KanbanSquare,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '@intellmeet/shared';

import { Logo } from './Logo';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meetings', label: 'Meetings', icon: Video },
  { to: '/tasks', label: 'Tasks & Kanban', icon: KanbanSquare },
  { to: '/workspaces', label: 'Team Workspaces', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-white/10 flex flex-col h-screen fixed left-0 top-0 z-30 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <NavLink to="/dashboard" className="transition hover:opacity-90">
          <Logo size="md" subtitle="Enterprise AI" />
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Main Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {isAdmin && (
          <div className="pt-6">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Administration
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Admin Console</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* AI Processing Status Indicator */}
      <div className="p-4 m-3 rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-900 border border-violet-500/20">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">AI Engine Ready</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Summaries, action item detection & transcripts active.
        </p>
      </div>
    </aside>
  );
};
