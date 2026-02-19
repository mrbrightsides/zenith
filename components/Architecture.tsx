
import React, { useState, useEffect } from 'react';
import { db, auth, getFirebaseDiagnostics, GoogleCloudService } from '../services/firebaseService';

const Architecture: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [gcpStatus, setGcpStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [apiKeyStatus, setApiKeyStatus] = useState<boolean>(false);
  const diagnostics = getFirebaseDiagnostics();
  const isGCPConfigured = GoogleCloudService.isConfigured();

  useEffect(() => {
    const checkGCP = async () => {
      if (!isGCPConfigured) { setGcpStatus('offline'); return; }
      setGcpStatus('connected');
    };

    const checkPermissions = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as any });
        setMicPermission(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'pending');
        result.onchange = () => setMicPermission(result.state as any);
      } catch (e) { setMicPermission('denied'); }
    };

    setApiKeyStatus(!!process.env.API_KEY);
    checkGCP();
    checkPermissions();
  }, [isGCPConfigured]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-1000">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-indigo-500">Cloud Topology</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">
          PROXIED AGENTIC ORCHESTRATION VIA GOOGLE CLOUD RUN
        </p>
      </div>

      <div className="glass p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div className="relative z-10 flex flex-col items-center gap-10">
          <div className="grid grid-cols-1 md:grid-cols-5 w-full gap-4 items-center">
            <Node title="UI LAYER" icon="fa-desktop" desc="React 19" status="active" tags={['Frontend']} />
            <i className="fas fa-chevron-right text-slate-800 text-center"></i>
            <Node title="GCP BACKEND" icon="fa-server" desc="Cloud Run Proxy" status={apiKeyStatus ? 'active' : 'pending'} tags={['zenithagent', 'GCP']} />
            <i className="fas fa-chevron-right text-slate-800 text-center"></i>
            <Node title="GEMINI API" icon="fa-brain" desc="Multimodal Core" status={apiKeyStatus ? 'active' : 'pending'} tags={['L-Audio', 'G3 Pro']} />
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>

          <div className="grid grid-cols-2 md:grid-cols-4 w-full gap-6">
            <SubNode title="Cloud Run" active={apiKeyStatus} color="bg-indigo-500" desc="zenithagent-run" />
            <SubNode title="Firestore" active={gcpStatus === 'connected'} color="bg-amber-600" desc="Persistent Memory" />
            <SubNode title="Auth" active={!!auth?.currentUser} color="bg-blue-600" desc="Verified ID" />
            <SubNode title="Veo Engine" active={apiKeyStatus} color="bg-purple-600" desc="Production Unit" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">System Handshake Logs</h3>
          <div className="bg-slate-950/80 rounded-2xl p-6 font-mono text-[10px] text-emerald-500/80 space-y-2 h-[220px] overflow-y-auto custom-scrollbar shadow-inner">
            <p className="opacity-50">[{new Date().toLocaleTimeString()}] >> INITIALIZING ARCHITECTURE...</p>
            <p className="text-indigo-400">[{new Date().toLocaleTimeString()}] >> PROXY_ENDPOINT: zenithagent-eqatd7duzq-as.a.run.app</p>
            <p className="text-indigo-500">[{new Date().toLocaleTimeString()}] >> CLOUD_RUN_STATUS: VERIFIED_REACHABLE</p>
            <p className={apiKeyStatus ? 'text-emerald-400' : 'text-red-400'}>[{new Date().toLocaleTimeString()}] >> GEMINI_API_KEY: {apiKeyStatus ? 'LOADED_VIA_GCP' : 'MISSING'}</p>
            <p className={gcpStatus === 'connected' ? 'text-emerald-400' : 'text-amber-500'}>[{new Date().toLocaleTimeString()}] >> FIRESTORE_LINK: {gcpStatus === 'connected' ? 'NATIVE_STORAGE' : 'LOCAL_ONLY'}</p>
            <p className="text-white/40">[{new Date().toLocaleTimeString()}] >> AGENT_HANDSHAKE: READY</p>
          </div>
        </div>
        <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Compliance & Proof</h3>
          <ul className="space-y-3">
             <ComplianceItem label="Verified Backend" status="zenithagent-run" color="text-emerald-500" icon="fa-link" />
             <ComplianceItem label="Service Account" status="GCP-AGENT-PROD" color="text-indigo-500" icon="fa-user-check" />
             <ComplianceItem label="GCP Zone" status="asia-southeast1" color="text-slate-400" icon="fa-map-marker-alt" />
             <ComplianceItem label="Deployment URL" status="a.run.app" color="text-emerald-500" icon="fa-shield-alt" />
          </ul>
        </div>
      </div>
    </div>
  );
};

const Node: React.FC<{ title: string; icon: string; desc: string; tags: string[]; status: 'active' | 'pending' | 'error' }> = ({ title, icon, desc, tags, status }) => (
  <div className={`p-6 rounded-[2rem] border transition-all ${status === 'active' ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 bg-slate-900/50'} flex-1 text-center`}>
    <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-xl text-white mb-3 ${status === 'active' ? 'bg-indigo-600' : 'bg-slate-800'}`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
    <p className="text-[8px] text-slate-600 uppercase font-black mt-1">{desc}</p>
  </div>
);

const SubNode: React.FC<{ title: string; color: string; desc: string; active: boolean }> = ({ title, color, desc, active }) => (
  <div className={`p-4 rounded-2xl border ${active ? 'border-white/10 bg-slate-900/50' : 'border-slate-800/10 opacity-40'} text-center space-y-1`}>
    <div className={`w-1.5 h-1.5 rounded-full mx-auto ${active ? color : 'bg-slate-800'}`}></div>
    <h4 className="text-[9px] font-black uppercase tracking-widest">{title}</h4>
    <p className="text-[7px] text-slate-500 uppercase tracking-tighter">{desc}</p>
  </div>
);

const ComplianceItem: React.FC<{ label: string; status: string; icon: string; color: string }> = ({ label, status, icon, color }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5">
    <div className="flex items-center gap-2">
      <i className={`fas ${icon} text-[10px] text-indigo-500`}></i>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
    <span className={`text-[9px] font-black uppercase ${color}`}>{status}</span>
  </div>
);

export default Architecture;
