import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Plus,
  ChevronDown,
  LogOut,
  Building2,
  CheckCircle2,
  Menu
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../services/apiClient';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar }) => {
  const navigate = useNavigate();
  const { user, workspace, workspaces, switchWorkspace, logout } = useAuthStore();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [workspace]);

  const fetchNotifications = async () => {
    try {
      const data: any = await apiClient.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      // Ignore
    }
  };

  return (
    <header className="h-16 bg-slate-900/80 border-b border-white/10 px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl gap-2 sm:gap-4 select-none">
      {/* Left side: Hamburger Button (Mobile) + Workspace Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Workspace Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-slate-200 hover:bg-slate-800 transition"
          >
            <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[160px]">
              {workspace?.name || 'My Workspace'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-white/10 shadow-2xl py-2 z-50">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400 border-b border-white/5">
                Switch Workspace
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setShowWorkspaceMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 flex items-center justify-between text-sm text-slate-300 hover:bg-violet-600/20 hover:text-white transition"
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === workspace?.id && (
                    <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Global Search Bar (Desktop) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search meetings, tasks, transcripts..."
            className="w-full bg-slate-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Instant New Meeting */}
        <button
          onClick={() => navigate('/meetings')}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs sm:text-sm font-medium hover:from-violet-500 hover:to-indigo-500 transition shadow-md shadow-violet-600/20"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden xs:inline">New Meeting</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-slate-900 border border-white/10 shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-400">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-violet-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs hover:bg-slate-800/50 cursor-pointer ${
                        !n.isRead ? 'bg-violet-950/20' : ''
                      }`}
                      onClick={() => {
                        if (n.link) navigate(n.link);
                        setShowNotifications(false);
                      }}
                    >
                      <div className="font-semibold text-slate-200">{n.title}</div>
                      <div className="text-slate-400 mt-0.5">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/60 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-blue-500 flex items-center justify-center font-bold text-xs text-white">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-200 hidden sm:inline truncate max-w-[100px]">
              {user?.fullName || 'User'}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900 border border-white/10 shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-white/5">
                <div className="text-xs font-semibold text-slate-200">{user?.fullName}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
              <button
                onClick={() => {
                  navigate('/settings');
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                Settings & Preferences
              </button>
              <button
                onClick={() => logout()}
                className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
