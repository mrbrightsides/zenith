
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AudioUtils } from '../services/geminiService';

const AVAILABLE_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];
const GCP_BACKEND_URL = 'https://zenithagent-eqatd7duzq-as.a.run.app/';

const AVATAR_STYLES = [
  { id: 'core', label: 'Neural Core', color: '#3b82f6', glow: '#60a5fa', gradient: 'from-blue-600 to-cyan-400' },
  { id: 'nova', label: 'Supernova', color: '#8b5cf6', glow: '#a78bfa', gradient: 'from-purple-600 to-pink-500' },
  { id: 'terra', label: 'Terraform', color: '#10b981', glow: '#34d399', gradient: 'from-emerald-600 to-teal-400' }
];

const LiveStudio: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: string; text: string; id: number; timestamp: string }[]>([]);
  
  // Real-time active turn states for paragraph display
  const [activeUserText, setActiveUserText] = useState('');
  const [activeModelText, setActiveModelText] = useState('');
  
  const [status, setStatus] = useState('Checking Cloud...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_STYLES[0]);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [handshakeProgress, setHandshakeProgress] = useState(0);
  const [isHandshaking, setIsHandshaking] = useState(false);
  const [instanceHealthy, setInstanceHealthy] = useState<boolean | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const mouseRef = useRef({ x: 400, y: 225 });

  // Refs for logic to avoid stale closures in callbacks
  const userTextRef = useRef('');
  const modelTextRef = useRef('');
  const lastActivityRef = useRef(Date.now());

  // Cloud Run Health Verification
  useEffect(() => {
    const verifyBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(GCP_BACKEND_URL, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        setInstanceHealthy(true);
        setStatus('GCP Instance Verified');
      } catch (e) {
        setInstanceHealthy(false);
        setStatus('Local Link Ready');
      }
    };
    verifyBackend();
  }, []);

  // Timer-based buffer flush for long pauses
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isActive) return;
      const now = Date.now();
      if (now - lastActivityRef.current > 5000) { // 5 seconds of silence
        commitTurn();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const commitTurn = useCallback(() => {
    const uText = userTextRef.current.trim();
    const mText = modelTextRef.current.trim();
    
    if (uText || mText) {
      setTranscriptions(prev => [
        ...prev.slice(-15),
        ...(uText ? [{ role: 'user', text: uText, id: Date.now(), timestamp: new Date().toLocaleTimeString() }] : []),
        ...(mText ? [{ role: 'gemini', text: mText, id: Date.now() + 1, timestamp: new Date().toLocaleTimeString() }] : [])
      ]);
      // Clear refs and state
      userTextRef.current = '';
      modelTextRef.current = '';
      setActiveUserText('');
      setActiveModelText('');
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const inputData = new Uint8Array(128);
    const outputData = new Uint8Array(128);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      if (analyserRef.current) analyserRef.current.getByteFrequencyData(inputData);
      if (outputAnalyserRef.current) outputAnalyserRef.current.getByteFrequencyData(outputData);

      const inAvg = inputData.reduce((a, b) => a + b, 0) / 128 / 255;
      const outAvg = outputData.slice(0, 20).reduce((a, b) => a + b, 0) / 20 / 255;
      
      setIsUserSpeaking(inAvg > 0.05);
      setIsAISpeaking(outAvg > 0.05);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const totalEnergy = Math.max(inAvg, outAvg);
      const auraGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300 * (1 + totalEnergy));
      auraGrad.addColorStop(0, `${selectedAvatar.glow}22`);
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(centerX, centerY);
      
      if (isHandshaking) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2 * (handshakeProgress / 100));
        ctx.stroke();
      }

      ctx.shadowBlur = 20 + totalEnergy * 100;
      ctx.shadowColor = selectedAvatar.glow;
      ctx.strokeStyle = selectedAvatar.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 80 + (outAvg * 40), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = selectedAvatar.glow;
      const eyeDX = (mouseRef.current.x - centerX) / 40;
      const eyeDY = (mouseRef.current.y - centerY) / 40;
      ctx.beginPath(); ctx.arc(-30 + eyeDX, -10 + eyeDY, 6 + (inAvg * 10), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(30 + eyeDX, -10 + eyeDY, 6 + (inAvg * 10), 0, Math.PI * 2); ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 40, 20 + outAvg * 40, 2 + outAvg * 30, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    render();
  }, [isActive, selectedAvatar, isHandshaking, handshakeProgress]);

  useEffect(() => {
    drawVisualizer();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [drawVisualizer]);

  const startSession = async () => {
    try {
      setIsHandshaking(true);
      setHandshakeProgress(0);
      setStatus('Linking GCP Instance...');
      setErrorDetails(null);
      
      const interval = setInterval(() => {
        setHandshakeProgress(p => {
          if (p >= 100) { clearInterval(interval); return 100; }
          return p + 4;
        });
      }, 40);

      // Initialize AI instance right before connection as per guidelines
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      if (!ai.live) {
        throw new Error("SDK Version Error: 'ai.live' is not available. Ensure @google/genai is >= v0.4.0.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inCtx = new AudioContext({ sampleRate: 16000 });
      const outCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outCtx;
      analyserRef.current = inCtx.createAnalyser();
      outputAnalyserRef.current = outCtx.createAnalyser();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsHandshaking(false);
            setStatus('Active Signal');
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const data = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(data.length);
              for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
              const blob = { data: AudioUtils.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              // Ensure data is sent only after the session promise resolves
              sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
            };
            source.connect(analyserRef.current!);
            source.connect(processor);
            processor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            lastActivityRef.current = Date.now();

            // Handle Input Transcription (User)
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              userTextRef.current += text;
              setActiveUserText(userTextRef.current);
              
              // WAKE WORD DETECTION: "ZENITH, stop"
              if (userTextRef.current.toLowerCase().includes("zenith stop") || 
                  userTextRef.current.toLowerCase().includes("zenith, stop")) {
                
                // 1. Instant local silence
                sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;

                /**
                 * NOTE: sendRealtimeInput only supports media (audio/image) in this SDK version.
                 * Text-based cancellation is primarily handled via systemInstruction cues and the audio stream.
                 * Step 1 handles the immediate UI/Playback silence.
                 */

                setStatus('Override Activated');
                setTimeout(() => setStatus('Active Signal'), 2000);
                
                // Clear buffers after a stop
                userTextRef.current = '';
                setActiveUserText('');
              }
            } 
            
            // Handle Output Transcription (Model)
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              modelTextRef.current += text;
              setActiveModelText(modelTextRef.current);
            }

            // COMMIT ON TURN COMPLETE
            if (message.serverContent?.turnComplete) {
              commitTurn();
            }
            
            // Handle Audio Playback
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await AudioUtils.decodeAudioData(AudioUtils.decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAnalyserRef.current!);
              source.connect(ctx.destination);
              
              // Correctly track and cleanup active sources
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            
            // Handle interruption signal from server
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { 
            setIsActive(false); 
            setStatus('Link Failed'); 
            setErrorDetails("Network handshake failed. Ensure regional support."); 
          },
          onclose: () => { setIsActive(false); setStatus('Disconnected'); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the ZENITH Agent. Be concise and intelligent. 
          If you hear the word 'stop' combined with 'Zenith', acknowledge the user's override and halt production immediately.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      setIsHandshaking(false);
      setStatus('Access Denied');
      setErrorDetails(e.message || "Unknown neural link error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-[2.5rem] space-y-6 border border-white/10 shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Infrastructure</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border transition-all ${instanceHealthy ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-slate-900 border-slate-800'}`}>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[9px] font-black uppercase text-slate-500">Instance Status</span>
                   <div className={`w-2 h-2 rounded-full ${instanceHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                </div>
                <p className="text-[10px] font-bold text-white uppercase truncate">zenithagent-run</p>
                <p className="text-[7px] text-slate-500 font-mono mt-1 break-all">{GCP_BACKEND_URL}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_VOICES.map((v) => (
                    <button key={v} disabled={isActive} onClick={() => setSelectedVoice(v)} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedVoice === v ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={isActive ? () => setIsActive(false) : startSession}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${isActive ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{isActive ? 'Terminate Link' : 'Establish Link'}</span>
                <i className={`fas ${isActive ? 'fa-unlink' : 'fa-link'}`}></i>
              </button>
            </div>
          </div>

          <div className="glass p-4 rounded-2xl border border-white/5 bg-slate-900/40">
            <p className="text-[8px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Wake Word Active</p>
            <p className="text-[10px] text-slate-500 leading-tight">Say <span className="text-white font-black italic">"ZENITH, stop"</span> to instantly cancel and override the agent's current task.</p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div 
            onMouseMove={handleMouseMove}
            className="relative glass rounded-[4rem] overflow-hidden aspect-video shadow-2xl border border-white/10 bg-slate-950"
          >
            <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
            
            {isHandshaking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md z-20">
                <div className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-indigo-500/20 animate-spin mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white animate-pulse">Synchronizing Cloud Proxy...</p>
              </div>
            )}

            {errorDetails && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-xl z-30 p-12 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-6 border border-red-500/30">
                   <i className="fas fa-satellite-dish animate-pulse"></i>
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">GCP Handshake Failed</h3>
                <p className="text-[10px] font-bold text-red-200/60 mb-6 max-w-xs">{errorDetails}</p>
                <button onClick={startSession} className="px-8 py-3 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-slate-950 transition-all">Retry Sequence</button>
              </div>
            )}

            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">{status}</span>
              <div className="flex gap-4">
                 <div className={`w-3 h-3 rounded-full transition-all ${isUserSpeaking ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-slate-800'}`}></div>
                 <div className={`w-3 h-3 rounded-full transition-all ${isAISpeaking ? 'bg-purple-500 shadow-lg shadow-purple-500/50' : 'bg-slate-800'}`}></div>
              </div>
            </div>
            
            <div className="absolute top-12 left-12 text-[8px] font-black uppercase tracking-[0.5em] text-slate-700">
               ACCESS DENIED
            </div>
          </div>

          <div className="glass p-10 rounded-[4rem] min-h-[300px] border border-white/5 flex flex-col gap-6 shadow-2xl">
            <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-500 flex items-center gap-4">
              <i className="fas fa-terminal text-indigo-500"></i> Interaction Logs
            </h4>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {transcriptions.length === 0 && !activeUserText && !activeModelText && (
                <p className="text-[10px] text-slate-700 uppercase font-black text-center py-10 tracking-[0.3em]">Awaiting signal...</p>
              )}
              
              {/* Historical Log */}
              {transcriptions.map((t) => (
                <div key={t.id} className={`flex gap-4 ${t.role === 'gemini' ? 'flex-row-reverse' : 'flex-row'}`}>
                   <div className={`p-4 rounded-2xl max-w-[85%] ${t.role === 'gemini' ? 'bg-purple-600/10 border border-purple-500/20 text-white' : 'bg-slate-800 border border-white/5 text-slate-300'}`}>
                      <p className="text-xs font-medium leading-relaxed">{t.text}</p>
                   </div>
                </div>
              ))}

              {/* Active Paragraphs (Live Updates) */}
              {activeUserText && (
                <div className="flex flex-row gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="p-4 rounded-2xl max-w-[85%] bg-slate-800 border border-white/5 text-slate-300">
                    <p className="text-xs font-medium leading-relaxed italic">{activeUserText}</p>
                  </div>
                </div>
              )}

              {activeModelText && (
                <div className="flex flex-row-reverse gap-4 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="p-4 rounded-2xl max-w-[85%] bg-purple-600/10 border border-purple-500/20 text-white">
                    <p className="text-xs font-medium leading-relaxed italic">{activeModelText}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStudio;
