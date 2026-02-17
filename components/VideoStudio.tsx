
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from '../services/geminiService';

interface VideoHistoryItem {
  id: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  style: string;
  duration: number;
  videoUrl?: string;
  timestamp: number;
}

interface RenderTask {
  id: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  style: string;
  duration: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  audioFile?: { data: string; mimeType: string };
  videoUrl?: string;
}

const VIDEO_STYLES = [
  { id: 'Cinematic', icon: 'fa-film', desc: 'Movie-grade look', tooltip: 'Cinematic lighting and wide compositions' },
  { id: 'Animated', icon: 'fa-palette', desc: 'Stylized motion', tooltip: '3D Pixar-style animation weights' },
  { id: 'Documentary', icon: 'fa-camera', desc: 'Handheld realism', tooltip: 'Natural lighting and standard frame rates' },
  { id: 'Experimental', icon: 'fa-flask', desc: 'Abstract art', tooltip: 'Surreal motion and artistic filters' }
];

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: 'fa-youtube', aspect: '16:9', res: '1080p', tooltip: 'Lock 16:9 1080p for high-quality widescreen' },
  { id: 'instagram', label: 'Instagram', icon: 'fa-instagram', aspect: '9:16', res: '1080p', tooltip: 'Lock 9:16 1080p for Reels' },
  { id: 'tiktok', label: 'TikTok', icon: 'fa-tiktok', aspect: '9:16', res: '1080p', tooltip: 'Lock 9:16 1080p for vertical discovery' }
];

interface VideoStudioProps {
  theme: 'dark' | 'light';
  initialItem?: any;
  onMounted?: () => void;
}

const VideoStudio: React.FC<VideoStudioProps> = ({ theme, initialItem, onMounted }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [duration, setDuration] = useState(5);
  const [selectedStyle, setSelectedStyle] = useState('Cinematic');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [audioInput, setAudioInput] = useState<{ data: string; mimeType: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [queue, setQueue] = useState<RenderTask[]>([]);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('video_studio_history_v2');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load video history", e);
      }
    }

    if (initialItem) {
      setPrompt(initialItem.prompt || '');
      setAspectRatio(initialItem.aspectRatio || '16:9');
      setResolution(initialItem.resolution || '720p');
      setSelectedStyle(initialItem.style || 'Cinematic');
      setCurrentVideoUrl(initialItem.videoUrl || null);
      onMounted?.();
    }
  }, [initialItem]);

  useEffect(() => {
    const processQueue = async () => {
      const activeTask = queue.find(t => t.status === 'processing');
      if (activeTask) return;

      const nextTask = queue.find(t => t.status === 'queued');
      if (!nextTask) return;

      updateTaskStatus(nextTask.id, 'processing', 2);

      try {
        let finalPrompt = nextTask.prompt;
        
        if (nextTask.audioFile) {
          updateTaskStatus(nextTask.id, 'processing', 10);
          const syncPrompt = await GeminiService.analyzeAudioToVisualPrompt(nextTask.audioFile.data, nextTask.audioFile.mimeType);
          finalPrompt = `${nextTask.prompt ? nextTask.prompt + ". " : ""}${syncPrompt}`;
        }

        const statusInterval = setInterval(() => {
          setQueue(prev => prev.map(t => 
            t.id === nextTask.id ? { ...t, progress: Math.min(t.progress + 3, 98) } : t
          ));
        }, 6000);

        const videoUrl = await GeminiService.generateVideo(
          finalPrompt, 
          nextTask.aspectRatio, 
          nextTask.resolution, 
          nextTask.duration, 
          nextTask.style
        );

        clearInterval(statusInterval);
        
        setQueue(prev => prev.map(t => 
          t.id === nextTask.id ? { ...t, status: 'completed', progress: 100, videoUrl } : t
        ));

        setCurrentVideoUrl(videoUrl);
        saveToHistory({
          id: nextTask.id,
          prompt: finalPrompt,
          aspectRatio: nextTask.aspectRatio,
          resolution: nextTask.resolution,
          style: nextTask.style,
          duration: nextTask.duration,
          videoUrl,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(error);
        updateTaskStatus(nextTask.id, 'failed', 0);
      }
    };

    processQueue();
  }, [queue]);

  const updateTaskStatus = (id: string, status: RenderTask['status'], progress: number) => {
    setQueue(prev => prev.map(t => t.id === id ? { ...t, status, progress } : t));
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSyncing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAudioInput({ data: base64, mimeType: file.type });
        setIsSyncing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addToQueue = async () => {
    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio?.openSelectKey();
    }

    const newTask: RenderTask = {
      id: Date.now().toString(),
      prompt,
      aspectRatio,
      resolution,
      style: selectedStyle,
      duration,
      status: 'queued',
      progress: 0,
      audioFile: audioInput || undefined
    };

    setQueue(prev => [...prev, newTask]);
    setPrompt('');
    setAudioInput(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyPreset = (platform: any) => {
    setAspectRatio(platform.aspect as '16:9' | '9:16');
    setResolution(platform.res as '720p' | '1080p');
    setActivePreset(platform.id);
  };

  const saveToHistory = (newItem: VideoHistoryItem) => {
    const currentSaved = JSON.parse(localStorage.getItem('video_studio_history_v2') || '[]');
    const updated = [newItem, ...currentSaved].slice(0, 10);
    localStorage.setItem('video_studio_history_v2', JSON.stringify(updated));
    setHistory(updated);
  };

  const recallHistory = (item: VideoHistoryItem) => {
    setPrompt(item.prompt);
    setAspectRatio(item.aspectRatio);
    setResolution(item.resolution || '720p');
    setSelectedStyle(item.style || 'Cinematic');
    setCurrentVideoUrl(item.videoUrl || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[3rem] space-y-8 sticky top-24 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">Production</h2>
              <div className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                Veo Nexus
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <i className="fas fa-waveform text-pink-500"></i> Neural Audio Sync
              </label>
              <div className={`relative group border-2 border-dashed rounded-[2rem] p-6 transition-all duration-500 ${audioInput ? 'border-pink-500/50 bg-pink-500/5' : 'border-slate-800 hover:border-slate-600'}`}>
                {audioInput ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/20">
                        <i className="fas fa-volume-up text-pink-500 animate-bounce"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-pink-400 uppercase tracking-widest">Signal Linked</span>
                        <span className="text-[9px] text-slate-500 font-bold">Synchronizing frequencies</span>
                      </div>
                    </div>
                    <button onClick={() => setAudioInput(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-3 py-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-700 group-hover:text-pink-500 transition-colors">
                      <i className={`fas ${isSyncing ? 'fa-circle-notch fa-spin' : 'fa-music'} text-xl`}></i>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] group-hover:text-slate-400 transition-colors text-center leading-relaxed">
                      {isSyncing ? 'Linking Synapses...' : 'Inject Audio Stream\nto Sync Visuals'}
                    </span>
                    <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Platform Presets</label>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    data-tooltip={p.tooltip}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${activePreset === p.id ? 'bg-purple-600 border-purple-400 text-white shadow-xl shadow-purple-500/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                  >
                    <i className={`fab ${p.icon} text-xl`}></i>
                    <span className="text-[8px] font-black uppercase tracking-tighter">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cinematic Script</label>
              <textarea
                value={prompt}
                onChange={(e) => {setPrompt(e.target.value); setActivePreset(null);}}
                placeholder="Describe the cinematic motion..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 min-h-[140px] focus:ring-4 focus:ring-purple-500/20 outline-none resize-none transition-all text-sm font-medium leading-relaxed"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Artistic Modality</label>
              <div className="grid grid-cols-2 gap-3">
                {VIDEO_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-all ${
                      selectedStyle === style.id 
                      ? 'bg-purple-600 border-purple-400 text-white shadow-xl shadow-purple-500/20' 
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    <i className={`fas ${style.icon} text-sm`}></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">{style.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addToQueue}
              disabled={!prompt && !audioInput}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-purple-500/30 transition-all active:scale-95"
            >
              Initialize Production
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-12">
          {currentVideoUrl ? (
            <div className="glass p-3 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden group relative animate-in zoom-in-95 duration-1000">
              <video src={currentVideoUrl} controls autoPlay loop className="w-full h-auto rounded-[3.5rem] object-cover border border-white/5" />
              <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <a href={currentVideoUrl} download={`zenith-core-prod-${Date.now()}.mp4`} className="bg-white text-slate-950 px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:scale-105 shadow-2xl">
                  <i className="fas fa-file-export"></i> Export Core Asset
                </a>
              </div>
            </div>
          ) : (
            <div className="border-4 border-dashed border-slate-900 rounded-[5rem] flex flex-col items-center justify-center text-slate-800 gap-8 aspect-video">
              <div className="relative">
                <i className="fas fa-film text-[120px] opacity-10"></i>
                <div className="absolute inset-0 border-4 border-slate-800/10 rounded-full animate-ping opacity-20"></div>
              </div>
              <p className="text-[11px] uppercase font-black tracking-[1em] opacity-40">Awaiting Signal Input</p>
            </div>
          )}

          {queue.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 flex items-center gap-4">
                <i className="fas fa-microchip text-blue-500 animate-pulse"></i> Neural Render Queue
              </h3>
              <div className="space-y-4">
                {queue.map((task) => (
                  <div key={task.id} className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col gap-6 relative overflow-hidden group transition-all hover:border-white/10">
                    <div className="flex items-center justify-between z-10">
                      <div className="flex items-center gap-6 min-w-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl transition-all ${
                          task.status === 'processing' ? 'bg-blue-600 border-blue-400 text-white animate-pulse' :
                          task.status === 'completed' ? 'bg-emerald-600 border-emerald-400 text-white' :
                          task.status === 'failed' ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-700'
                        }`}>
                          <i className={`fas ${
                            task.status === 'processing' ? 'fa-sync-alt fa-spin' :
                            task.status === 'completed' ? 'fa-check' :
                            task.status === 'failed' ? 'fa-exclamation-triangle' : 'fa-hourglass-half'
                          } text-xl`}></i>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-base font-bold truncate pr-8 text-slate-200">
                            {task.audioFile ? <span className="text-pink-400">Synced: </span> : ''}
                            {task.prompt || "Synthetic Narrative"}
                          </p>
                          <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500 mt-2">
                            <span className={task.status === 'processing' ? 'text-blue-400' : ''}>{task.status}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                            <span>{task.resolution}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                            <span>{task.style}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {task.videoUrl && (
                          <button onClick={() => setCurrentVideoUrl(task.videoUrl!)} className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                            <i className="fas fa-play"></i>
                          </button>
                        )}
                        <button onClick={() => removeFromQueue(task.id)} className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 border border-white/5 hover:bg-red-600 hover:text-white transition-all">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    {task.status === 'processing' && (
                      <div className="space-y-3 z-10 animate-in fade-in duration-500">
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 transition-all duration-1000" style={{ width: `${task.progress}%` }}></div>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-blue-500 text-center animate-pulse">Synthesis in Progress...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 flex items-center gap-4">
                <i className="fas fa-database text-purple-500"></i> Synaptic Archive
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => recallHistory(item)}
                    className="text-left p-6 rounded-[2.5rem] glass border border-white/5 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group flex gap-6 shadow-xl"
                  >
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-700 group-hover:text-purple-400 transition-colors border border-white/5 shadow-inner">
                      <i className={`fas ${item.aspectRatio === '16:9' ? 'fa-desktop' : 'fa-mobile-alt'} text-xl`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">{item.style}</p>
                      <p className="text-sm font-medium text-slate-400 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">{item.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoStudio;
