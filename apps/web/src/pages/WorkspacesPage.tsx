import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Building2,
  ShieldCheck,
  Mail,
  CheckCircle2,
  X,
  Crown,
  Shield
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';
import { WorkspaceRole } from '@intellmeet/shared';

export const WorkspacesPage: React.FC = () => {
  const { workspace, user } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>(WorkspaceRole.MEMBER);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [workspace]);

  const fetchMembers = async () => {
    try {
      if (workspace?.id) {
        const data: any = await apiClient.get(`/workspaces/${workspace.id}/members`);
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !workspace?.id) return;

    try {
      setIsInviting(true);
      await apiClient.post(`/workspaces/${workspace.id}/invitations`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setInviteSuccess(`Invitation dispatched to ${inviteEmail}`);
      setInviteEmail('');
      fetchMembers();
      setTimeout(() => setInviteSuccess(null), 3000);
      setShowInviteModal(false);
    } catch (err: any) {
      alert(err.message || 'Invitation failed');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Team Workspaces</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage team access, role assignments, and member directories
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite New Member</span>
        </button>
      </div>

      {inviteSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{inviteSuccess}</span>
        </div>
      )}

      {/* Current Workspace Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-violet-600/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{workspace?.name || 'My Workspace'}</h2>
            <p className="text-xs text-slate-400">
              Workspace Identifier: <span className="font-mono text-slate-300">{workspace?.slug}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Total Active Members</div>
          <div className="text-xl font-black text-white">{members.length}</div>
        </div>
      </div>

      {/* Members Directory */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          <span>Workspace Members ({members.length})</span>
        </h3>

        <div className="divide-y divide-white/5">
          {members.map((m) => {
            const isOwner = m.role === 'OWNER';
            const isAdmin = m.role === 'ADMIN';

            return (
              <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                    {m.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{m.fullName}</span>
                      {m.userId === user?.id && (
                        <span className="text-[10px] text-violet-400 font-semibold">(You)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{m.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${
                      isOwner
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isAdmin
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {isOwner && <Crown className="w-3 h-3 text-amber-400" />}
                    {isAdmin && <Shield className="w-3 h-3 text-violet-400" />}
                    <span>{m.role}</span>
                  </span>

                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Joined {new Date(m.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-400" />
                <span>Invite Team Member</span>
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Colleague Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                >
                  <option value={WorkspaceRole.MEMBER}>Member (Join meetings, tasks)</option>
                  <option value={WorkspaceRole.ADMIN}>Admin (Manage team & meetings)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 disabled:opacity-50"
                >
                  {isInviting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
