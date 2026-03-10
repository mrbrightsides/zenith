
import React, { useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";

interface GovernanceStudioProps {
  theme: 'dark' | 'light';
}

const GovernanceStudio: React.FC<GovernanceStudioProps> = ({ theme }) => {
  const { user, isAuthenticated } = useAuth0();
  const [policies, setPolicies] = useState([
    { id: 'pol-1', resource: 'GitHub Repo', action: 'Read Issues', status: 'allowed', level: 'Standard' },
    { id: 'pol-2', resource: 'GitHub Repo', action: 'Delete Repository', status: 'denied', level: 'Critical' },
    { id: 'pol-3', resource: 'Google Calendar', action: 'Schedule Meeting', status: 'allowed', level: 'Standard' },
    { id: 'pol-4', resource: 'Google Calendar', action: 'Delete Calendar', status: 'denied', level: 'Critical' },
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Neural Governance</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500">OpenFGA Fine-Grained Authorization</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Engine Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Policy List */}
        <div className="lg:col-span-3 glass rounded-[2.5rem] border border-white/10 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <i className="fas fa-fingerprint text-9xl"></i>
          </div>

          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                <i className="fas fa-shield-virus"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Relationship Tuples</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isAuthenticated ? `Governing Agent Agency for ${user?.name}` : 'Awaiting Governance Handshake'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <div key={policy.id} className={`glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-slate-900/50'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        policy.level === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      }`}>
                        {policy.level}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{policy.resource}</span>
                    </div>
                    <h4 className="font-bold text-sm">{policy.action}</h4>
                  </div>

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                    policy.status === 'allowed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    <i className={`fas ${policy.status === 'allowed' ? 'fa-check' : 'fa-times'}`}></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Governance Stats */}
        <div className="space-y-6">
          <div className="glass rounded-[2.5rem] border border-white/10 p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">FGA Diagnostics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Tuples Loaded</span>
                <span className="text-white">128</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Policy Latency</span>
                <span className="text-emerald-500">12ms</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Decision Mode</span>
                <span className="text-indigo-500">Strict</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-[2.5rem] border border-white/10 p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-500">Biometric Handshake</h3>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl text-slate-600 border border-white/5 hover:bg-indigo-600 hover:text-white hover:border-indigo-400 transition-all cursor-pointer group">
                <i className="fas fa-fingerprint group-active:scale-90 transition-transform"></i>
              </div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-center">Touch to Authorize High-Stakes Agency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Graph Visualization Placeholder */}
      <div className="glass rounded-[2.5rem] border border-white/10 p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Policy Relationship Graph</h3>
          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Real-time OpenFGA Visualization</span>
        </div>
        <div className="h-64 flex items-center justify-center border border-dashed border-white/5 rounded-3xl bg-slate-900/20">
          <div className="text-center space-y-4">
            <i className="fas fa-project-diagram text-4xl text-slate-800"></i>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Initializing Neural Governance Graph...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernanceStudio;
