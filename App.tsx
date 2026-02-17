
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TextStudio from './components/TextStudio';
import ImageStudio from './components/ImageStudio';
import VideoStudio from './components/VideoStudio';
import LiveStudio from './components/LiveStudio';
import OrchestratorStudio from './components/OrchestratorStudio';
import Architecture from './components/Architecture';
import LandingPage from './components/LandingPage';
import { StudioTab } from './types';
import { auth, GoogleCloudService } from './services/firebaseService';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTab>(StudioTab.ORCHESTRATOR);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLanding, setIsLanding] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [forceSandbox, setForceSandbox] = useState(() => localStorage.getItem('zenith_force_sandbox') === 'true');
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [recallItem, setRecallItem] = useState<any>(null);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => 
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsLanding(false); // Auto-transition if already logged in
      }
    });
    return () => unsubscribe();
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const aggregatedHistory = useMemo(() => {
    const textHistory = JSON.parse(localStorage.getItem('text_studio_history') || '[]').map((item: any) => ({ ...item, tab: StudioTab.TEXT, icon: 'fa-pen-nib' }));
    const imageHistory = JSON.parse(localStorage.getItem('image_studio_history') || '[]').map((item: any) => ({ ...item, tab: StudioTab.IMAGE, icon: 'fa-image' }));
    const videoHistory = JSON.parse(localStorage.getItem('video_studio_history_v2') || '[]').map((item: any) => ({ ...item, tab: StudioTab.VIDEO, icon: 'fa-video' }));
    const orchHistory = JSON.parse(localStorage.getItem('zenith_campaign_fallback') || '[]').map((item: any) => ({ ...item, prompt: item.goal, tab: StudioTab.ORCHESTRATOR, icon: 'fa-project-diagram' }));
    
    return [...textHistory, ...imageHistory, ...videoHistory, ...orchHistory].sort((a, b) => (b.timestamp || b.createdAt) - (a.timestamp || a.createdAt));
  }, [isSearchOpen]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return aggregatedHistory.filter(item => 
      item.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8);
  }, [searchQuery, aggregatedHistory]);

  const handleSelectSearchResult = (item: any) => {
    setRecallItem(item);
    setActiveTab(item.tab);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleAnonymousLogin = async () => {
    if (!auth) {
      setAuthError("Auth system not initialized. Launch in Sandbox instead.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInAnonymously(auth);
      setIsLanding(false);
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!auth) {
      setAuthError("Auth system not initialized. Launch in Sandbox instead.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!auth) {
      setAuthError("Auth system not initialized. Launch in Sandbox instead.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setForceSandbox(false);
    localStorage.removeItem('zenith_force_sandbox');
    setIsProfileModalOpen(false);
    setIsLanding(true);
  };

  const toggleSandbox = () => {
    const newState = !forceSandbox;
    setForceSandbox(newState);
    if (newState) {
      localStorage.setItem('zenith_force_sandbox', 'true');
    } else {
      localStorage.removeItem('zenith_force_sandbox');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const renderContent = () => {
    const commonProps = { theme, initialItem: recallItem };
    const onComponentMounted = () => setRecallItem(null);

    switch (activeTab) {
      case StudioTab.ORCHESTRATOR: return <OrchestratorStudio {...commonProps} onMounted={onComponentMounted} />;
      case StudioTab.TEXT: return <TextStudio {...commonProps} onMounted={onComponentMounted} />;
      case StudioTab.IMAGE: return <ImageStudio {...commonProps} onMounted={onComponentMounted} />;
      case StudioTab.VIDEO: return <VideoStudio {...commonProps} onMounted={onComponentMounted} />;
      case StudioTab.LIVE: return <LiveStudio theme={theme} />;
      case StudioTab.ARCHITECTURE: return <Architecture theme={theme} />;
      default: return <OrchestratorStudio {...commonProps} onMounted={onComponentMounted} />;
    }
  };

  const isGCPConfigured = GoogleCloudService.isConfigured() && !forceSandbox;

  if (isLanding && (!isGCPConfigured || !user)) {
    return <LandingPage theme={theme} onEnter={() => isGCPConfigured ? handleAnonymousLogin() : setIsLanding(false)} />;
  }

  // If GCP is configured but user isn't logged in AND we aren't forcing sandbox mode
  if (isGCPConfigured && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="glass p-12 rounded-[3rem] w-full max-w-md border border-white/10 space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white italic">Neural Portal</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Identity Verification Protocol</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-[11px] text-red-400 font-medium animate-in slide-in-from-top-2">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {authError}
            </div>
          )}

          <div className="space-y-4">
             <button 
              onClick={handleAnonymousLogin} 
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 flex flex-col items-center gap-2 active:scale-95"
             >
                <div className="flex items-center gap-3">
                  <i className={`fas ${authLoading ? 'fa-circle-notch fa-spin' : 'fa-rocket'}`}></i>
                  Enter Challenge
                </div>
                <span className="text-[8px] opacity-60 tracking-widest font-bold">(Google Cloud Orchestration Active)</span>
             </button>

             <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-600"><span className="bg-slate-950 px-4 tracking-[0.5em]">Advanced Operator Access</span></div>
             </div>

            <input 
              type="email" 
              placeholder="agent@zenith.live" 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <button onClick={handleLogin} disabled={authLoading} className="flex-1 bg-white text-slate-950 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50">Authorize</button>
            <button onClick={handleSignUp} disabled={authLoading} className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">Create ID</button>
          </div>
          <div className="text-center pt-4 space-y-6">
             <button 
              onClick={() => { toggleSandbox(); setIsLanding(false); }} 
              className="w-full py-4 border border-indigo-500/30 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/10 transition-all active:scale-95"
             >
                Launch Sandbox Mode (Local Storage Only)
             </button>
             <button onClick={() => setIsLanding(true)} className="text-[10px] text-slate-600 uppercase tracking-widest hover:text-slate-400 block w-full">Return to Surface</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-500/30 transition-colors duration-300 animate-in fade-in duration-1000 ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-50'}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
      
      <main className="pl-64 min-h-screen relative">
        <header className="h-20 px-10 flex items-center justify-between glass sticky top-0 z-[250] border-b border-white/5 shadow-2xl">
          <div className="flex items-center gap-5 text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isGCPConfigured ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-slate-500 uppercase tracking-widest font-black text-[10px]">
                {isGCPConfigured ? (
                  <span className="flex items-center gap-2 text-indigo-400">
                    Challenge Server Linked <i className="fas fa-check-circle text-[8px]"></i>
                  </span>
                ) : 'Sandbox Environment'}
              </span>
            </div>
            <i className="fas fa-chevron-right text-[8px] text-slate-700"></i>
            <span className="capitalize font-black tracking-[0.3em] text-indigo-500">{activeTab} Modality</span>
          </div>
          
          <div className="flex items-center gap-5 flex-1 max-w-xl mx-10">
            <div className="relative w-full group">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs transition-colors group-focus-within:text-indigo-500"></i>
              <input 
                type="text"
                placeholder="Query agentic history..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${theme === 'light' ? 'bg-slate-200/50' : 'bg-slate-900/50'} border border-transparent focus:border-indigo-500/50 rounded-xl py-2 pl-10 pr-12 text-xs font-medium outline-none transition-all placeholder:text-slate-600`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 pointer-events-none">
                <span className="text-[8px] font-black border border-slate-700 px-1 rounded leading-none">⌘</span>
                <span className="text-[8px] font-black border border-slate-700 px-1 rounded leading-none">K</span>
              </div>

              {isSearchOpen && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 space-y-1">
                    {searchResults.length > 0 ? searchResults.map((result, idx) => (
                      <button 
                        key={`${result.tab}-${idx}`}
                        onClick={() => handleSelectSearchResult(result)}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-800'} text-left group`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${theme === 'light' ? 'bg-slate-300 text-slate-600' : 'bg-slate-900 text-slate-500'} group-hover:text-indigo-400 group-hover:bg-indigo-500/10`}>
                          <i className={`fas ${result.icon}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold truncate ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>{result.prompt}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{result.tab} Production</p>
                        </div>
                        <i className="fas fa-chevron-right text-[8px] text-slate-600 group-hover:translate-x-1 transition-transform"></i>
                      </button>
                    )) : (
                      <div className="p-8 text-center space-y-2">
                        <i className="fas fa-search-minus text-slate-700 text-2xl opacity-20"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No agentic memory found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="h-10 w-[1px] bg-slate-800 mx-1"></div>
            
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 group transition-all hover:opacity-80 active:scale-95"
              data-tooltip="Agent ID Settings"
            >
              <div className="text-right hidden sm:block">
                <p className={`text-[10px] font-black uppercase tracking-tighter truncate max-w-[120px] transition-colors ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {user?.isAnonymous ? 'Challenge Judge' : user?.email || (forceSandbox ? 'Sandbox Agent' : 'Guest Agent')}
                </p>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{forceSandbox ? 'Local Access' : 'Cloud Synchronized'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg border border-indigo-400/30 group-hover:border-indigo-400 transition-colors">
                <i className={`fas ${user?.isAnonymous ? 'fa-user-tie' : 'fa-user-shield'} text-white text-sm`}></i>
              </div>
            </button>
          </div>
        </header>

        <div className="p-10 pb-20 relative z-10">
          <div className="mb-16 animate-in fade-in slide-in-from-left-6 duration-1000">
            <h1 className="text-6xl font-black tracking-tighter text-white flex items-center gap-6">
              ZENITH LIVE
              <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/40 to-transparent"></div>
              <span className="text-[10px] font-black uppercase tracking-[1em] text-indigo-500/40">Challenge v1.0.0</span>
            </h1>
          </div>
          
          <div className="animate-in fade-in zoom-in-95 duration-1000 delay-200">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Profile Modal & Search Overlay Click-Away */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[200] bg-transparent" onClick={() => setIsSearchOpen(false)}></div>
      )}

      {/* Operator Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)}></div>
          <div className="glass w-full max-w-lg rounded-[3rem] border border-white/10 p-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative z-10 animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center gap-8">
              <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-4xl text-white shadow-2xl border border-indigo-400/30">
                <i className={`fas ${user?.isAnonymous ? 'fa-user-tie' : 'fa-user-shield'}`}></i>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black tracking-tighter uppercase italic">Agent Identity</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500">
                  {user?.isAnonymous ? 'Anonymous Judge ID' : 'Participant Signature Verified'}
                </p>
              </div>

              <div className="w-full space-y-6">
                <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Authorized Entity</span>
                    <span className="text-xs font-bold">{user?.isAnonymous ? 'Judge Access' : user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Connection</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isGCPConfigured ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isGCPConfigured ? 'Challenge Native (Cloud)' : 'Sandbox Mode (Local)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Agent UID</span>
                    <span className="text-[8px] font-mono opacity-50">{user?.uid || 'LOCAL_AGENT_SANDBOX'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={toggleTheme}
                    className="p-6 rounded-3xl glass border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col items-center gap-2 group"
                  >
                    <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xl text-indigo-400 group-hover:scale-110 transition-transform`}></i>
                    <span className="text-[9px] font-black uppercase tracking-widest">UI Mode</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-6 rounded-3xl glass border border-white/5 hover:border-red-500/30 transition-all flex flex-col items-center gap-2 group"
                  >
                    <i className="fas fa-sign-out-alt text-xl text-red-500 group-hover:scale-110 transition-transform"></i>
                    <span className="text-[9px] font-black uppercase tracking-widest">Terminate Session</span>
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] hover:text-white transition-colors"
              >
                Return to Agentic Control
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
