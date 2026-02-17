
import React from 'react';
import { StudioTab } from '../types';

interface SidebarProps {
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  theme: 'dark' | 'light';
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme }) => {
  const items = [
    { id: StudioTab.ORCHESTRATOR, icon: 'fa-project-diagram', label: 'Agent Orchestrator', tooltip: 'Multimodal Interleaved Output: Text + Image + Video' },
    { id: StudioTab.LIVE, icon: 'fa-microphone-alt', label: 'Live Studio', tooltip: 'Real-time Audio & Vision Interaction' },
    { id: StudioTab.TEXT, icon: 'fa-pen-nib', label: 'Cognitive Studio', tooltip: 'Advanced Reasoning & Search Grounding' },
    { id: StudioTab.IMAGE, icon: 'fa-image', label: 'Visual Studio', tooltip: 'Imagen 3 Architecture Synthesis' },
    { id: StudioTab.VIDEO, icon: 'fa-video', label: 'Temporal Studio', tooltip: 'Veo 3.1 Cinematic Production' },
    { id: StudioTab.ARCHITECTURE, icon: 'fa-network-wired', label: 'Agentic Arch', tooltip: 'Challenge Deployment & Logic Flow' },
  ];

  return (
    <aside className="w-64 glass h-full fixed left-0 top-0 flex flex-col p-4 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-500/30">Z</div>
        <h1 className={`text-xl font-bold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>ZENITH LIVE</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            data-tooltip={item.tooltip}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'sidebar-active text-white shadow-lg shadow-blue-500/20' 
                : theme === 'light'
                  ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <i className={`fas ${item.icon} w-5`}></i>
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={`mt-auto p-4 glass rounded-2xl text-[10px] text-center border border-white/5 uppercase tracking-[0.2em] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
        Agent Challenge v1.0
      </div>
    </aside>
  );
};

export default Sidebar;
