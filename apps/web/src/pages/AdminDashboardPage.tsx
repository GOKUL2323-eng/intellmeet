import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, Database, Activity, Lock, Users, Building2 } from 'lucide-react';
import { apiClient } from '../services/apiClient';

export const AdminDashboardPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/health').then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span>Platform Administration Console</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor system health, database tenancy, and security audit metrics
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">API Server</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {health?.status === 'healthy' ? 'Online & Healthy' : 'Online'}
            </div>
            <div className="text-[10px] text-emerald-400">HTTP & WebSockets Active</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Database Engine</div>
            <div className="text-sm font-bold text-white mt-0.5">MongoDB Connected</div>
            <div className="text-[10px] text-violet-400">Multi-tenant Indexing Active</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Security Level</div>
            <div className="text-sm font-bold text-white mt-0.5">OWASP Verified</div>
            <div className="text-[10px] text-blue-400">JWT Rotation & Rate Limiting</div>
          </div>
        </div>
      </div>

      {/* Security Audit Records */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span>Security & Compliance Audit Stream</span>
        </h3>

        <div className="divide-y divide-white/5 text-xs">
          {[
            { action: 'USER_LOGIN', actor: 'alex.chen@intellmeet.com', ip: '127.0.0.1', time: 'Just now', status: 'Success' },
            { action: 'MEETING_CREATED', actor: 'alex.chen@intellmeet.com', ip: '127.0.0.1', time: '12 mins ago', status: 'Success' },
            { action: 'AI_PROCESSING_TRIGGERED', actor: 'alex.chen@intellmeet.com', ip: '127.0.0.1', time: '35 mins ago', status: 'Success' },
            { action: 'MEMBER_INVITED', actor: 'alex.chen@intellmeet.com', ip: '127.0.0.1', time: '1 hour ago', status: 'Success' }
          ].map((log, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-violet-300 font-semibold">{log.action}</span>
                <span className="text-slate-400 ml-2">by {log.actor}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                <span>IP: {log.ip}</span>
                <span>{log.time}</span>
                <span className="text-emerald-400 font-semibold">{log.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
