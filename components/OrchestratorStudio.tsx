
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { GoogleCloudService, synchronizeCloudConfig } from '../services/firebaseService';

interface OrchestrationResult {
  text: string;
  imageUrl: string;
  videoUrl: string;
}

interface Task {
  id: string;
  agent: 'copywriter' | 'illustrator' | 'animator' | 'researcher';
  fallbackAgent?: 'copywriter' | 'illustrator' | 'animator' | 'researcher';
  prompt: string;
  dependencies: string[];
  status: 'queued' | 'active' | 'done' | 'failed';
  priority: 'low' | 'medium' | 'high';
  result?: string;
}

interface OrchestratorStudioProps {
  theme: 'dark' | 'light';
  initialItem?: any;
  onMounted?: () => void;
  onInteraction?: (active: boolean) => void;
}

const OrchestratorStudio: React.FC<OrchestratorStudioProps> = ({ theme, initialItem, onMounted, onInteraction }) => {
  const [goal, setGoal] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0); 
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', agent: 'researcher', prompt: 'Gather industry trends for the objective', dependencies: [], status: 'queued', priority: 'high' },
    { id: 't2', agent: 'copywriter', prompt: 'Write a brand vision narrative based on research', dependencies: ['t1'], status: 'queued', priority: 'medium' },
    { id: 't3', agent: 'illustrator', prompt: 'Generate a hero visual for the narrative', dependencies: ['t2'], status: 'queued', priority: 'medium', fallbackAgent: 'copywriter' },
    { id: 't4', agent: 'animator', prompt: 'Create a product reveal animation', dependencies: ['t3'], status: 'queued', priority: 'low' },
  ]);

  // Use a ref to track task statuses to avoid closure staleness in the orchestration loop
  const taskStatusRef = React.useRef<{ [key: string]: string }>({});

  useEffect(() => {
    const statuses: { [key: string]: string } = {};
    tasks.forEach(t => {
      statuses[t.id] = t.status;
    });
    taskStatusRef.current = statuses;
  }, [tasks]);

  const fetchGithubData = async () => {
    // Simulating real-time GitHub data fetch
    // In a real app, this would use the GitHub API with a token from the Vault
    return {
      issues: [
        { title: "Optimize neural rendering pipeline", state: "open" },
        { title: "Fix memory leak in agent delegation", state: "closed" }
      ],
      pullRequests: [
        { title: "Feat: Add OpenFGA governance layer", author: "zenith-bot" }
      ]
    };
  };

  useEffect(() => {
    onInteraction?.(isProcessing);
  }, [isProcessing]);

  useEffect(() => {
    const init = async () => {
      await synchronizeCloudConfig();
      loadHistory();
    };
    init();
    
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
      // Reset tasks
      setTasks(prev => prev.map(t => ({ ...t, status: 'queued', result: undefined })));

      // Execute tasks based on dependencies
      const executeTask = async (task: Task, isFallback = false) => {
        console.log(`ZENITH: Starting task ${task.id} (${task.agent})`);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'active' } : t));
        
        // Wait for dependencies
        if (task.dependencies.length > 0) {
          console.log(`ZENITH: Task ${task.id} waiting for dependencies: ${task.dependencies.join(', ')}`);
          for (const depId of task.dependencies) {
            while (true) {
              const status = taskStatusRef.current[depId];
              if (status === 'done') break;
              if (status === 'failed') throw new Error(`Dependency ${depId} failed`);
              await new Promise(r => setTimeout(r, 1000));
            }
          }
          console.log(`ZENITH: Task ${task.id} dependencies cleared.`);
        }

        try {
          let taskResult = '';
          const currentAgent = isFallback && task.fallbackAgent ? task.fallbackAgent : task.agent;

          if (currentAgent === 'researcher') {
            setCurrentStage(1);
            const githubData = await fetchGithubData();
            const githubContext = `\nGitHub Context: Issues: ${githubData.issues.map(i => i.title).join(', ')}. PRs: ${githubData.pullRequests.map(p => p.title).join(', ')}.`;
            const res = await GeminiService.generateText(`Research: ${task.prompt} for ${goal}.${githubContext}`, true);
            taskResult = res.text;
          } else if (currentAgent === 'copywriter') {
            setCurrentStage(2);
            const res = await GeminiService.generateText(`Write narrative: ${task.prompt}. Context: ${goal}`, false);
            taskResult = res.text;
          } else if (currentAgent === 'illustrator') {
            setCurrentStage(3);
            taskResult = await GeminiService.generateImage(`${task.prompt} for ${goal}`, 'gemini-3-pro-image-preview');
          } else if (currentAgent === 'animator') {
            setCurrentStage(4);
            taskResult = await GeminiService.generateVideo(`${task.prompt} for ${goal}`, '16:9', '720p', 5, 'Cinematic');
          }

          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done', result: taskResult } : t));
          console.log(`ZENITH: Task ${task.id} completed.`);
          return taskResult;
        } catch (err) {
          console.error(`ZENITH: Task ${task.id} failed`, err);
          if (!isFallback && task.fallbackAgent) {
            console.log(`Switching to fallback agent for ${task.id}`);
            return executeTask(task, true);
          }
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
          throw err;
        }
      };

      // Start all tasks that have no dependencies
      const taskPromises = tasks.map(t => executeTask(t));
      await Promise.all(taskPromises);

      const finalResult = {
        text: tasks.find(t => t.agent === 'copywriter')?.result || '',
        imageUrl: tasks.find(t => t.agent === 'illustrator')?.result || '',
        videoUrl: tasks.find(t => t.agent === 'animator')?.result || ''
      };

      setResult(finalResult);
      
      // Save to Google Cloud (Firestore)
      await GoogleCloudService.saveCampaign(goal, finalResult.text, finalResult.imageUrl, finalResult.videoUrl);
      loadHistory();
    } catch (error: any) {
      console.error("Orchestration failed", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes("503") || errorMsg.includes("high demand")) {
        alert("The Neural Grid is currently overloaded (High Demand). ZENITH is attempting to stabilize, but the chain was interrupted. Please wait 30 seconds and try again.");
      } else {
        alert("Neural chain interrupted. Check your API key or connection.");
      }
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
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Agent Delegation</h3>
                <button 
                  onClick={() => setTasks([...tasks, { id: `t${tasks.length + 1}`, agent: 'copywriter', prompt: 'New sub-task', dependencies: [], status: 'queued', priority: 'medium' }])}
                  className="text-[8px] font-black uppercase text-indigo-500 hover:text-indigo-400"
                >
                  + Add Agent
                </button>
              </div>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className={`p-4 rounded-2xl border transition-all ${
                    task.status === 'active' ? 'bg-indigo-600/10 border-indigo-500/30' : 
                    task.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20 opacity-50' : 
                    task.status === 'failed' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-white/5'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black border ${
                          task.status === 'active' ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse' :
                          task.status === 'done' ? 'bg-emerald-600 border-emerald-400 text-white' : 
                          task.status === 'failed' ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                          {task.status === 'done' ? <i className="fas fa-check"></i> : task.id.toUpperCase()}
                        </div>
                        <select 
                          value={task.agent}
                          onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, agent: e.target.value as any } : t))}
                          className="bg-transparent text-[9px] font-black uppercase tracking-widest text-slate-400 outline-none border-none cursor-pointer"
                        >
                          <option value="researcher">Researcher</option>
                          <option value="copywriter">Copywriter</option>
                          <option value="illustrator">Illustrator</option>
                          <option value="animator">Animator</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={task.priority}
                          onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, priority: e.target.value as any } : t))}
                          className={`text-[7px] font-black uppercase px-1 rounded border border-white/10 bg-slate-900 ${
                            task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Med</option>
                          <option value="high">High</option>
                        </select>
                        <div className="flex items-center gap-1">
                          {task.dependencies.map(depId => (
                            <span key={depId} className="text-[7px] font-black bg-slate-800 px-1 rounded text-slate-500">DEP: {depId.toUpperCase()}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input 
                        type="text"
                        value={task.prompt}
                        onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, prompt: e.target.value } : t))}
                        className="w-full bg-transparent text-[10px] text-slate-300 outline-none border-none placeholder:text-slate-700"
                        placeholder="Task parameters..."
                      />
                      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                        <span className="text-[7px] font-black uppercase text-slate-600">Fallback:</span>
                        <select 
                          value={task.fallbackAgent || ''}
                          onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, fallbackAgent: (e.target.value || undefined) as any } : t))}
                          className="bg-transparent text-[7px] font-black uppercase text-slate-500 outline-none border-none cursor-pointer"
                        >
                          <option value="">None</option>
                          <option value="researcher">Researcher</option>
                          <option value="copywriter">Copywriter</option>
                          <option value="illustrator">Illustrator</option>
                          <option value="animator">Animator</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
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

        <div className="lg:col-span-8 space-y-12">
          {/* Dependency Graph Visualization */}
          <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <i className="fas fa-microchip text-8xl"></i>
            </div>
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Dependency Graph</h3>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">OpenClaw Architecture</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 relative py-4">
              {tasks.map((task, idx) => (
                <React.Fragment key={task.id}>
                  <div className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    task.status === 'active' ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20' :
                    task.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-white/5'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${
                      task.status === 'active' ? 'bg-indigo-600 text-white animate-pulse' :
                      task.status === 'done' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      <i className={`fas ${
                        task.agent === 'researcher' ? 'fa-search' :
                        task.agent === 'copywriter' ? 'fa-pen-nib' :
                        task.agent === 'illustrator' ? 'fa-paint-brush' : 'fa-film'
                      }`}></i>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">{task.agent}</span>
                    <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase border ${
                      task.priority === 'high' ? 'bg-red-500/20 border-red-500 text-red-500' :
                      task.priority === 'medium' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-slate-800 border-white/5 text-slate-500'
                    }`}>
                      {task.priority}
                    </div>
                  </div>
                  {idx < tasks.length - 1 && (
                    <div className="flex flex-col items-center">
                      <i className={`fas fa-long-arrow-alt-right text-xl ${
                        tasks[idx].status === 'done' ? 'text-emerald-500' : 'text-slate-800'
                      }`}></i>
                      <span className="text-[6px] font-black uppercase text-slate-700">Sequence</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

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
