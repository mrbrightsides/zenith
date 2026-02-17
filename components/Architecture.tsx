import React, { useState, useEffect } from 'react';
import { db, auth, getFirebaseDiagnostics } from '../services/firebaseService';

const Architecture: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [gcpStatus, setGcpStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [apiKeyStatus, setApiKeyStatus] = useState<boolean>(false);
  const diagnostics = getFirebaseDiagnostics();

  useEffect(() => {
    const checkGCP = async () => {
      // Logic diperketat: Jika db ada dan config lengkap, set connected
      if (db && diagnostics.isFullyConfigured) {
        setGcpStatus('connected');
      } else {
        setGcpStatus('offline');
      }
    };

    const checkPermissions = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as any });
        setMicPermission(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'pending');
        result.onchange = () => setMicPermission(result.state as any);
      } catch (e) {
        setMicPermission('denied');
      }
    };

    // FIX: Gunakan import.meta.env untuk Vite
    setApiKeyStatus(!!import.meta.env.VITE_GEMINI_API_KEY);

    checkGCP();
    checkPermissions();
  }, [diagnostics.isFullyConfigured]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-1000">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Agentic Infrastructure</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500">Official Challenge Topology Monitor</p>
      </div>

      <div className="glass p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div className="relative z-10 flex flex-col items-center gap-16">
          <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-8">
            <Node 
              title="CHALLENGE OPERATOR" 
              icon="fa-desktop" 
              desc="Agentic Frontend" 
              status={apiKeyStatus ? 'active' : 'error'}
              tags={['React 19', 'Live SDK']} 
            />
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <i className={`fas fa-long-arrow-alt-right text-4xl ${apiKeyStatus ? 'text-indigo-500 animate-pulse' : 'text-slate-800'}`}></i>
                <span className="text-[8px] font-black uppercase text-slate-600">Multimodal Link</span>
              </div>
            </div>
            <Node 
              title="GEMINI CORE (AI)" 
              icon="fa-bolt" 
              desc="Agentic Logic Ecosystem" 
              status={apiKeyStatus ? 'active' : 'pending'}
              tags={['Live API', 'Multimodal', 'Reasoning']} 
            />
          </div>

          <div className={`h-20 w-px bg-gradient-to-b ${apiKeyStatus ? 'from-indigo-500 to-emerald-500' : 'from-slate-800 to-slate-900'} animate-pulse`}></div>

          <div className="grid grid-cols-1 md:grid-cols-4 w-full gap-6">
            <SubNode title="Gemini 3 Pro" active={apiKeyStatus} color="bg-blue-600" desc="Strategic Agency" />
            <SubNode title="Persistence" active={gcpStatus === 'connected'} color="bg-amber-600" desc="Agentic Memory" />
            <SubNode title="Identity" active={!!auth?.currentUser} color="bg-indigo-600" desc="Auth Link" />
            <SubNode title="Live Engine" active={apiKeyStatus} color="bg-emerald-600" desc="Real-time" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Link Health Analysis</h3>
          <ul className="space-y-4">
            <ComplianceItem label="Challenge API Handshake" status={apiKeyStatus ? 'Verified' : 'Unauthorized'} color={apiKeyStatus ? 'text-emerald-500' : 'text-red-500'} icon="fa-key" />
            <ComplianceItem label="Agentic Memory Sync" status={gcpStatus === 'connected' ? 'Cloud Linked' : 'Offline'} color={gcpStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'} icon="fa-cloud" />
            <ComplianceItem label="Multimodal Permission" status={micPermission === 'granted' ? 'Authorized' : 'Denied'} color={micPermission === 'granted' ? 'text-emerald-500' : 'text-red-500'} icon="fa-microphone" />
            <ComplianceItem label="Live Modality Engine" status="Gemini 2.5 Native" color="text-indigo-500" icon="fa-wave-square" />
          </ul>
        </div>

        <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Agentic Sequence Logs</h3>
          <div className="bg-slate-950/80 rounded-2xl p-6 font-mono text-[10px] text-emerald-500/80 space-y-2 h-[200px] overflow-y-auto custom-scrollbar shadow-inner">
            {/* FIX: Menggunakan template literal {'>>'} agar esbuild tidak error */}
            <p className="opacity-50">[{new Date().toLocaleTimeString()}] {'>>'} INITIALIZING AGENT CHALLENGE SEQUENCE...</p>
            {!apiKeyStatus && <p className="text-red-400">[{new Date().toLocaleTimeString()}] {'>>'} CRITICAL: Challenge Key Missing.</p>}
            {!diagnostics.projectId && <p className="text-amber-400">[{new Date().toLocaleTimeString()}] {'>>'} MEMORY: Persistence operating in Sandbox mode.</p>}
            {gcpStatus === 'connected' ? (
              <p className="text-emerald-400">[{new Date().toLocaleTimeString()}] {'>>'} MEMORY: Neural Link Established.</p>
            ) : (
              <p className="text-slate-500">[{new Date().toLocaleTimeString()}] {'>>'} STANDBY: Waiting for Memory handshake.</p>
            )}
            <p className={auth?.currentUser ? 'text-emerald-400' : 'text-indigo-400'}>
              [{new Date().toLocaleTimeString()}] {'>>'} IDENTITY: AGENT_LINK ... {auth?.currentUser ? 'AUTHORIZED_PARTICIPANT' : 'GUEST_AGENT'}
            </p>
            <p className="text-indigo-400 animate-pulse">[{new Date().toLocaleTimeString()}] {'>>'} READY: Demonstrating Multimodal Agency.</p>
            <p className="opacity-30">[{new Date().toLocaleTimeString()}] {'>>'} LISTENING...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... (Simpan Node, SubNode, ComplianceItem lu di bawah sini, jangan diubah)
const Node: React.FC<{ title: string; icon: string; desc: string; tags: string[]; status: 'active' | 'pending' | 'error' }> = ({ title, icon, desc, tags, status }) => (
  <div className={`p-8 rounded-[2.5rem] border transition-all duration-700 ${status === 'active' ? 'border-indigo-500/30 bg-indigo-500/5' : status === 'error' ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-slate-900/50'} space-y-4 text-center`}>
    <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl text-white shadow-2xl transition-colors duration-700 ${status === 'active' ? 'bg-indigo-600' : 'bg-slate-800'}`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <h3 className="text-sm font-black uppercase tracking-widest italic">{title}</h3>
    <p className="text-[10px] text-slate-500 font-medium">{desc}</p>
    <div className="flex flex-wrap justify-center gap-2">
      {tags.map(t => <span key={t} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-tighter text-slate-400">{t}</span>)}
    </div>
  </div>
);

const SubNode: React.FC<{ title: string; color: string; desc: string; active: boolean }> = ({ title, color, desc, active }) => (
  <div className={`p-6 rounded-3xl border transition-all duration-700 ${active ? 'border-white/10 bg-slate-900/50 opacity-100 scale-100' : 'border-transparent bg-slate-900/10 opacity-30 scale-95'} text-center space-y-2`}>
    <div className={`w-2 h-2 rounded-full mx-auto ${active ? color : 'bg-slate-800'} ${active ? 'animate-pulse' : ''}`}></div>
    <h4 className="text-[10px] font-black uppercase tracking-widest italic">{title}</h4>
    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">{desc}</p>
  </div>
);

const ComplianceItem: React.FC<{ label: string; status: string; icon: string; color: string }> = ({ label, status, icon, color }) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5 transition-all hover:bg-slate-900">
    <div className="flex items-center gap-3">
      <i className={`fas ${icon} text-indigo-500`}></i>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{label}</span>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${color}`}>{status}</span>
  </div>
);

export default Architecture;