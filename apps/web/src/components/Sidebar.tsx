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
  X
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  const renderNavContent = (isMobile = false) => (
    <>
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
              onClick={isMobile ? onClose : undefined}
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
              onClick={isMobile ? onClose : undefined}
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
      <div className="p-4 m-3 rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-900 border border-violet-500/20 shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">AI Engine Ready</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Summaries, action item detection & transcripts active.
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900/90 border-r border-white/10 flex-col h-screen fixed left-0 top-0 z-30 backdrop-blur-xl">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <NavLink to="/dashboard" className="transition hover:opacity-90">
            <Logo size="md" subtitle="Enterprise AI" />
          </NavLink>
        </div>
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Slide-out Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 border-r border-white/10 flex flex-col h-full transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <NavLink to="/dashboard" onClick={onClose} className="transition hover:opacity-90">
            <Logo size="md" subtitle="Enterprise AI" />
          </NavLink>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {renderNavContent(true)}
      </aside>
    </>
  );
};
