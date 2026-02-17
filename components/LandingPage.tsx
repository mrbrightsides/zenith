
import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
  theme: 'dark' | 'light';
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, theme }) => {
  return (
    <div className={`min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Procedural Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 max-w-6xl w-full text-center space-y-12 py-20">
        <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-12 duration-1000">
          <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-5xl font-black text-white shadow-[0_0_60px_rgba(79,70,229,0.5)] mb-4">
            <i className="fas fa-microchip animate-pulse"></i>
          </div>
          <div className="space-y-4">
            <h1 className="text-8xl font-black tracking-tighter leading-none">
              ZENITH <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-500">LIVE</span>
            </h1>
            <p className="text-xl text-slate-500 font-bold tracking-[0.4em] uppercase">The Multimodal Agentic Orchestrator</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <p className="text-2xl text-slate-400 leading-relaxed font-light">
            Built for the <span className="text-white font-semibold">Gemini Live Agent Challenge</span>. ZENITH LIVE unifies <span className="text-white font-semibold">Gemini 3 Pro</span> and <span className="text-white font-semibold">Live Multimodal API</span> into a single, cohesive, real-time agent experience.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-700 delay-500">
          <button 
            onClick={onEnter}
            className="group relative px-16 py-8 rounded-[2.5rem] bg-white text-slate-950 font-black text-xl tracking-[0.4em] uppercase overflow-hidden transition-all hover:scale-110 active:scale-95 shadow-[0_30px_60px_rgba(255,255,255,0.15)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10 group-hover:text-white transition-colors">Launch Agent Control</span>
          </button>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Secure Protocol Established // Gemini Agent Challenge v1.0.0</span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="relative z-10 max-w-7xl w-full grid grid-cols-1 md:grid-cols-5 gap-6 pb-20 px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700">
        <FeatureCard 
          icon="fa-microchip" 
          title="Agent Orchestrator" 
          desc="Unified multi-modal agency. Orchestrate text, images, and video via a single agentic handshake."
          color="indigo"
          isMain
          badge="Core Agent"
        />
        <FeatureCard 
          icon="fa-pen-nib" 
          title="Cognitive Layer" 
          desc="Advanced reasoning and search grounding powered by Gemini 3 Pro with strategic thinking."
          color="blue"
        />
        <FeatureCard 
          icon="fa-image" 
          title="Visual Synthesis" 
          desc="Professional image generation via Imagen 3 architecture for agentic visual responses."
          color="emerald"
        />
        <FeatureCard 
          icon="fa-video" 
          title="Temporal Agency" 
          desc="Veo 3.1 cinematic production with Neural Audio Sync for perfectly timed visual agency."
          color="purple"
          badge="Video Sync"
        />
        <FeatureCard 
          icon="fa-microphone" 
          title="Live Studio" 
          desc="Real-time multimodal agency. Direct voice and vision interaction with spatial awareness."
          color="pink"
          badge="Live Agent"
        />
      </div>

      <footer className="relative z-10 py-10 opacity-30 text-[10px] font-black uppercase tracking-[0.5em] text-center">
        ZENITH LIVE AGENT CHALLENGE © 2025 // AGENTIC INNOVATION PROTOCOL
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string; title: string; desc: string; color: string; isMain?: boolean; badge?: string }> = ({ icon, title, desc, color, isMain, badge }) => {
  const colorMap: any = {
    indigo: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_30px_rgba(79,70,229,0.2)]',
    blue: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
    emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
    pink: 'text-pink-400 border-pink-500/20 bg-pink-500/5',
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border glass transition-all hover:-translate-y-2 hover:border-white/20 group relative ${isMain ? 'ring-1 ring-indigo-500/50 scale-105' : ''}`}>
      {badge && (
        <div className="absolute top-4 right-4 px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[7px] font-black uppercase tracking-widest text-slate-400">
          {badge}
        </div>
      )}
      <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center text-2xl border shadow-lg ${colorMap[color]}`}>
        <i className={`fas ${icon} group-hover:scale-110 transition-transform`}></i>
      </div>
      <h3 className={`text-sm font-black uppercase tracking-widest mb-3 ${isMain ? 'text-indigo-400' : ''}`}>{title}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-3">{desc}</p>
      {isMain && (
        <div className="mt-4 pt-4 border-t border-indigo-500/20">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500">Autonomous Modality</span>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
