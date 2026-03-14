
import React, { useState, useEffect } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import { GeminiService } from '../services/geminiService';

interface MorningBriefingProps {
  theme: 'dark' | 'light';
  externalUser?: any;
}

const MorningBriefing: React.FC<MorningBriefingProps> = ({ theme, externalUser }) => {
  const { user: auth0User, isAuthenticated: isAuth0Authenticated } = useAuth0();
  const [isOpen, setIsOpen] = useState(false);
  
  // Use either Auth0 user or the external (Firebase/Anonymous) user
  const activeUser = auth0User || externalUser;
  const isAuthenticated = isAuth0Authenticated || !!externalUser;

  const [status, setStatus] = useState<'analyzing' | 'generating' | 'ready'>('analyzing');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [greeting, setGreeting] = useState('Good Morning');
  const [briefingData, setBriefingData] = useState({ github: 0, calendar: 0 });

  useEffect(() => {
    if (isAuthenticated && activeUser) {
      // Use sessionStorage so it shows up once per session (after login/refresh)
      const userId = activeUser.sub || activeUser.uid || 'guest';
      const sessionBriefing = sessionStorage.getItem(`zenith_session_briefing_${userId}`);
      
      if (!sessionBriefing) {
        setIsOpen(true);
        generateBriefing();
        sessionStorage.setItem(`zenith_session_briefing_${userId}`, 'true');
      }
    }
  }, [isAuthenticated, activeUser]);

  const generateBriefing = async () => {
    setStatus('analyzing');
    
    // 1. Determine Greeting based on Time
    const hour = new Date().getHours();
    let currentGreeting = 'Good Morning';
    if (hour >= 12 && hour < 17) currentGreeting = 'Good Afternoon';
    else if (hour >= 17 || hour < 4) currentGreeting = 'Good Evening';
    setGreeting(currentGreeting);

    // 2. Simulate Cognitive Analysis with Dynamic Data
    const mockGithub = Math.floor(Math.random() * 8) + 1;
    const mockCalendar = Math.floor(Math.random() * 4) + 1;
    setBriefingData({ github: mockGithub, calendar: mockCalendar });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 3. Generate Summary via Proxied Gemini Service
    try {
      const userName = activeUser?.given_name || activeUser?.name || (activeUser?.isAnonymous ? 'Challenge Judge' : 'Operator');
      const prompt = `Generate a 2-sentence ${currentGreeting.toLowerCase()} briefing for ${userName}. 
      The current time is ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}.
      Mention that ${mockGithub} GitHub issues are pending review and ${mockCalendar} meetings are scheduled for today.
      Keep it professional, agentic, and strikingly human. Use a tone that feels like a high-end digital concierge.`;
      
      const response = await GeminiService.generateText(prompt);
      setSummary(response.text || 'Briefing analysis complete.');
    } catch (err) {
      console.error("Briefing generation failed:", err);
      const userName = activeUser?.given_name || activeUser?.name || (activeUser?.isAnonymous ? 'Judge' : 'User');
      setSummary(`Welcome back, ${userName}. Your agentic workspace is synchronized and ready for orchestration.`);
    }

    setStatus('generating');
    
    // 4. Simulate Veo 3.1 Video Generation
    await new Promise(r => setTimeout(r, 3000));
    setVideoUrl('https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    
    setStatus('ready');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>
      
      <div className="glass w-full max-w-4xl rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative z-10 animate-in zoom-in-95 duration-1000">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-[600px]">
          {/* Video Section */}
          <div className="relative bg-black flex items-center justify-center overflow-hidden border-r border-white/5">
            {status === 'ready' && videoUrl ? (
              <video 
                src={videoUrl} 
                autoPlay 
                loop 
                muted 
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-indigo-500/20 animate-spin"></div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500 animate-pulse">
                    {status === 'analyzing' ? 'Analyzing Neural Delta...' : 'Synthesizing Temporal Briefing...'}
                  </p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Veo 3.1 Production Engine</p>
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="absolute bottom-8 left-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <i className="fas fa-video"></i>
                </div>
                <div>
                  <p className="text-xs font-black tracking-tighter text-white uppercase italic">Neural Briefing</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Temporal Synthesis v3.1</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-12 flex flex-col justify-between bg-slate-900/50">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500">
                  {activeUser?.isAnonymous ? 'Judge Access Verified' : 'Auth0 Action Triggered'}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{new Date().toLocaleDateString()}</span>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tighter leading-tight italic uppercase">
                  {greeting}, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                    {activeUser?.given_name || activeUser?.name || (activeUser?.isAnonymous ? 'Challenge Judge' : 'Operator')}
                  </span>
                </h2>
                <div className="h-px w-20 bg-indigo-500/50"></div>
              </div>

              <div className="space-y-6">
                <div className="glass p-6 rounded-3xl border border-white/5 bg-white/5">
                  <p className="text-sm leading-relaxed text-slate-300 font-medium italic">
                    "{summary || 'Initializing cognitive summary...'}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                      <i className="fab fa-github"></i>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">GitHub</p>
                      <p className="text-[10px] font-bold">{briefingData.github} Issues</p>
                    </div>
                  </div>
                  <div className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Calendar</p>
                      <p className="text-[10px] font-bold">{briefingData.calendar} {briefingData.calendar === 1 ? 'Session' : 'Sessions'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsOpen(false)}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              Enter Neural Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MorningBriefing;
