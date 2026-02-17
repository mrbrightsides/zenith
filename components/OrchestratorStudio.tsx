
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { GoogleCloudService } from '../services/firebaseService';

interface OrchestrationResult {
  text: string;
  imageUrl: string;
  videoUrl: string;
}

interface OrchestratorStudioProps {
  theme: 'dark' | 'light';
  initialItem?: any;
  onMounted?: () => void;
}

const OrchestratorStudio: React.FC<OrchestratorStudioProps> = ({ theme, initialItem, onMounted }) => {
  const [goal, setGoal] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0); 
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
    
    if (initialItem) {
      setGoal(initialItem.goal || initialItem.prompt || '');
      setResult({ 
        text: initialItem.narrative || initialItem.text || '', 
        imageUrl: initialItem.imageUrl || '', 
        videoUrl: initialItem.videoUrl || '' 
      });
      onMounted?.();
    }
  }, [initialItem]);

  const loadHistory = async () => {
    try {
      const data = await GoogleCloudService.getCampaigns();
      setHistory(data || []);
    } catch (e) {
      console.warn("History fetch failed - Check Google Cloud credentials");
    }
  };

  const runOrchestration = async () => {
    if (!goal) return;
    
    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio?.openSelectKey();
    }

    setIsProcessing(true);
    setResult(null);

    try {
      // Stage 1: Text Narrative
      setCurrentStage(1);
      const textResponse = await GeminiService.generateText(
        `You are a high-end Creative Director. Generate a detailed, factual, and visionary brand vision report for: "${goal}". 
        ${useSearch ? "Use Google Search to gather the latest industry trends, competitor insights, and cultural relevance." : ""}
        Include a punchy headline, a strategic executive summary, and specific descriptions of the visual assets we are synthesizing today.
        Respond with ONLY the markdown-formatted report.`,
        useSearch
      );
      const generatedText = textResponse.text;

      // Stage 2: Visual Synthesis
      setCurrentStage(2);
      const imagePrompt = `Masterpiece luxury commercial shot for ${goal}. Aesthetic: 8k, hyper-detailed, ray-traced lighting. Style: Premium cinematic.`;
      const imageUrl = await GeminiService.generateImage(imagePrompt, 'gemini-3-pro-image-preview');

      // Stage 3: Temporal Synthesis
      setCurrentStage(3);
      const videoPrompt = `Cinematic 5-second product reveal for ${goal}. Slow motion, fluid transitions, high production value.`;
      const videoUrl = await GeminiService.generateVideo(videoPrompt, '16:9', '720p', 5, 'Cinematic');

      const orchestrationResult = {
        text: generatedText,
        imageUrl,
        videoUrl
      };

      setResult(orchestrationResult);
      setCurrentStage(4); 

      // Save to Google Cloud (Firestore)
      await GoogleCloudService.saveCampaign(goal, generatedText, imageUrl, videoUrl);
      loadHistory();
    } catch (error) {
      console.error("Orchestration failed", error);
      alert("Neural chain interrupted. Check your API key or connection.");
      setCurrentStage(0);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-3xl text-white shadow-2xl shadow-indigo-500/20">
          <i className="fas fa-project-diagram"></i>
        </div>
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 uppercase italic">Command Center</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Google Cloud Interleaved Output</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Campaign Objective</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe your creative vision..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 min-h-[160px] focus:ring-4 focus:ring-indigo-500/20 outline-none resize-none transition-all text-sm font-medium leading-relaxed"
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-4 px-2">
              <label className="flex items-center justify-between cursor-pointer group" data-tooltip="Enable Google Search to ground the narrative in real-world facts">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${useSearch ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                    <i className="fas fa-search text-[10px]"></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ground with Search</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={useSearch} 
                  onChange={(e) => setUseSearch(e.target.checked)} 
                  className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  disabled={isProcessing}
                />
              </label>
            </div>

            <button
              onClick={runOrchestration}
              disabled={isProcessing || !goal}
              className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 ${
                isProcessing ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-500/20'
              }`}
            >
              {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>}
              {isProcessing ? 'Syncing with GCP...' : 'Execute Sequence'}
            </button>

            <div className="space-y-6 pt-4">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Sequence Status</h3>
              <div className="space-y-4">
                <PipelineStep number={1} label="Narrative Engineering" status={currentStage > 1 ? 'done' : currentStage === 1 ? 'active' : 'queued'} />
                <PipelineStep number={2} label="Visual Synthesis" status={currentStage > 2 ? 'done' : currentStage === 2 ? 'active' : 'queued'} />
                <PipelineStep number={3} label="Temporal Synthesis" status={currentStage > 3 ? 'done' : currentStage === 3 ? 'active' : 'queued'} />
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Firestore Archives</h3>
              <div className="space-y-3">
                {history.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setResult({ text: item.narrative, imageUrl: item.imageUrl, videoUrl: item.videoUrl })}
                    className="w-full glass p-4 rounded-2xl border border-white/5 text-left hover:border-indigo-500/40 transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden flex-shrink-0">
                      <img src={item.imageUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-200 truncate">{item.goal}</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest">
                        {item.createdAt instanceof Date ? item.createdAt.toLocaleDateString() : 'Syncing...'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {result ? (
            <div className="space-y-12 animate-in fade-in zoom-in-95 duration-1000">
              <div className="glass p-12 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl bg-white/5">
                <div className="text-center space-y-2 border-b border-white/10 pb-10">
                   <h3 className="text-5xl font-black tracking-tighter uppercase italic">Vision Report</h3>
                   <p className="text-[10px] font-black tracking-[0.8em] text-indigo-500 uppercase">Cloud Firestore Verified Production</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Executive Strategy</span>
                    <div className="prose prose-invert prose-sm">
                      <p className="text-slate-300 leading-relaxed font-medium first-letter:text-5xl first-letter:font-black first-letter:text-indigo-500 first-letter:mr-3 first-letter:float-left whitespace-pre-wrap">
                        {result.text}
                      </p>
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src={result.imageUrl} className="relative w-full rounded-[2.5rem] shadow-2xl border border-white/10" alt="Hero Asset" />
                  </div>
                </div>

                <div className="space-y-8 pt-10 border-t border-white/10">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Temporal Asset Reveal</span>
                     <span className="text-[8px] text-slate-500 uppercase font-bold">GCP Hosted Native Video</span>
                   </div>
                   <div className="glass p-2 rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl">
                     <video src={result.videoUrl} controls autoPlay loop className="w-full h-auto rounded-[3rem]" />
                   </div>
                </div>

                <div className="flex justify-center pt-8">
                  <button 
                    onClick={() => window.print()}
                    className="px-10 py-4 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl"
                  >
                    Export Synthesis PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[700px] border-4 border-dashed border-slate-900 rounded-[5rem] flex flex-col items-center justify-center text-slate-800 gap-8">
              <i className="fas fa-layer-group text-[120px] opacity-10"></i>
              <p className="text-[11px] uppercase font-black tracking-[1em] opacity-40">Awaiting Neural Signal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PipelineStep: React.FC<{ number: number; label: string; status: 'queued' | 'active' | 'done' }> = ({ number, label, status }) => {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${
      status === 'active' ? 'bg-indigo-600/10 border-indigo-500/30' : 
      status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20 opacity-50' : 'bg-slate-900/50 border-transparent opacity-30'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${
        status === 'active' ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse' :
        status === 'done' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'
      }`}>
        {status === 'done' ? <i className="fas fa-check"></i> : number}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'active' ? 'text-white' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
};

export default OrchestratorStudio;
