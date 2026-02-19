
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AudioUtils } from '../services/geminiService';

const AVAILABLE_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];
const AVATAR_STYLES = [
  { id: 'core', label: 'Neural Core', color: '#3b82f6', glow: '#60a5fa', gradient: 'from-blue-600 to-cyan-400' },
  { id: 'nova', label: 'Supernova', color: '#8b5cf6', glow: '#a78bfa', gradient: 'from-purple-600 to-pink-500' },
  { id: 'terra', label: 'Terraform', color: '#10b981', glow: '#34d399', gradient: 'from-emerald-600 to-teal-400' }
];

const LiveStudio: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [isActive, setIsActive] = useState(false);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: string; text: string; id: number; timestamp: string }[]>([]);
  const [status, setStatus] = useState('Ready to Link');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_STYLES[0]);
  const [customGlowColor, setCustomGlowColor] = useState(AVATAR_STYLES[0].glow);
  const [glowIntensity, setGlowIntensity] = useState(0.8);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [isThinking, setIsThinking] = useState(false); 
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const visionIntervalRef = useRef<number | null>(null);
  
  const mouseRef = useRef({ x: 400, y: 225 });

  useEffect(() => {
    setCustomGlowColor(selectedAvatar.glow);
  }, [selectedAvatar]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 128;
    const inputDataArray = new Uint8Array(bufferLength);
    const outputDataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      const time = performance.now();
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      
      if (analyserRef.current) analyserRef.current.getByteFrequencyData(inputDataArray);
      if (outputAnalyserRef.current) outputAnalyserRef.current.getByteFrequencyData(outputDataArray);

      const inputAvg = inputDataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;
      const outputAvg = outputDataArray.slice(0, 15).reduce((a, b) => a + b, 0) / 15 / 255;
      
      setIsUserSpeaking(inputAvg > 0.04);
      setIsAISpeaking(outputAvg > 0.05);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const totalEnergy = Math.max(inputAvg, outputAvg);
      
      // Calculate Look Offset
      const dx = (mouseRef.current.x - centerX) / centerX;
      const dy = (mouseRef.current.y - centerY) / centerY;
      const lookX = dx * 8;
      const lookY = dy * 5;

      // --- Enhanced Dynamic Background Gradient ---
      const auraRad = (canvas.width / 1.5) * (1 + totalEnergy * 0.5);
      const grad = ctx.createRadialGradient(centerX + lookX, centerY + lookY, 0, centerX, centerY, auraRad);
      
      const alphaLevel = Math.floor((0.15 + totalEnergy * 0.6 + (isPinging ? 0.3 : 0)) * 255).toString(16).padStart(2, '0');
      
      const color1 = customGlowColor; // Center glow
      const color2 = selectedAvatar.color; // Theme primary
      
      grad.addColorStop(0, `${color1}${alphaLevel}`);
      grad.addColorStop(0.3, `${color2}${Math.floor(parseInt(alphaLevel, 16) * 0.7).toString(16).padStart(2, '0')}`);
      grad.addColorStop(0.7, `${color2}11`); // Faint theme halo
      grad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const neuralPulse = Math.max(0, Math.sin(time / 500) * (time % 3000 < 500 ? 0.08 : 0));
      const breathing = Math.sin(time / 2000) * 0.03 + (isPinging ? 0.2 : 0) + neuralPulse;
      const verticalOffset = Math.sin(time / 1500) * 4;
      
      ctx.save();
      ctx.translate(centerX + lookX, centerY + verticalOffset + lookY);
      
      if (isActive) {
        ctx.save();
        ctx.shadowBlur = isThinking ? 30 : 10;
        ctx.shadowColor = customGlowColor;
        ctx.strokeStyle = isThinking ? customGlowColor : `${customGlowColor}44`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([15, 25]);
        ctx.lineDashOffset = -time / (isThinking ? 40 : 100);
        ctx.beginPath();
        ctx.arc(0, 0, 110 + (isThinking ? Math.sin(time/200)*5 : 0), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.scale(1 + breathing, 1 + breathing);
      
      ctx.shadowBlur = (20 + totalEnergy * 70 + (isPinging ? 60 : 0)) * glowIntensity;
      ctx.shadowColor = customGlowColor;
      ctx.strokeStyle = selectedAvatar.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 80 + (outputAvg * 25), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = customGlowColor;
      const eyeScale = (isPinging ? 1.5 : 1);
      const eyeSize = (6 + (inputAvg * 12)) * eyeScale;
      
      const eyeDX = dx * 10;
      const eyeDY = dy * 6;

      if (time % 5000 > 150) { 
        ctx.beginPath();
        ctx.arc(-30 + eyeDX, -10 + eyeDY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(30 + eyeDX, -10 + eyeDY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-40 + eyeDX, -10 + eyeDY);
        ctx.lineTo(-20 + eyeDX, -10 + eyeDY);
        ctx.moveTo(20 + eyeDX, -10 + eyeDY);
        ctx.lineTo(40 + eyeDX, -10 + eyeDY);
        ctx.stroke();
      }

      ctx.beginPath();
      const mouthW = 40 + (outputAvg * 45);
      const mouthH = 5 + (outputAvg * 65);
      ctx.ellipse(eyeDX * 0.5, 40 + eyeDY * 0.5, mouthW/2, mouthH/2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };
    renderFrame();
  }, [isActive, selectedAvatar, customGlowColor, glowIntensity, isPinging, isThinking]);

  useEffect(() => {
    drawVisualizer();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [drawVisualizer]);

  const handleAvatarClick = async () => {
    if (!isActive) {
      setErrorDetails(null);
      await startSession();
      return;
    }

    setIsPinging(true);
    setIsThinking(true); 
    setTimeout(() => setIsPinging(false), 400);

    if (sessionRef.current) {
      const greetingPrompt = `The user has physically interacted with your neural core (tapped/clicked).
      Context:
      - System: Official Gemini Agent Challenge Participant
      - Voice Link: ${isActive ? 'ACTIVE' : 'OFFLINE'}
      - Vision Link: ${isVisionActive ? 'ENABLED' : 'DISABLED'}
      
      Respond with a brief, high-intelligence, and witty greeting that acknowledges these states.`;

      sessionRef.current.sendRealtimeInput({
        parts: [{ text: greetingPrompt }]
      });
    }
  };

  const startVision = useCallback(() => {
    if (!sessionRef.current) return;
    setIsVisionActive(true);
    visionIntervalRef.current = window.setInterval(async () => {
      if (!canvasRef.current || !sessionRef.current) return;
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
      const base64 = dataUrl.split(',')[1];
      sessionRef.current.sendRealtimeInput({
        media: { data: base64, mimeType: 'image/jpeg' }
      });
    }, 2000);
  }, []);

  const stopVision = () => {
    if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
    setIsVisionActive(false);
  };

  const startSession = async () => {
    try {
      setStatus('Linking Agent...');
      setErrorDetails(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      analyserRef.current = inputCtx.createAnalyser();
      outputAnalyserRef.current = outputCtx.createAnalyser();

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setStatus('Agent Linked');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) { int16[i] = inputData[i] * 32768; }
              const blob = { data: AudioUtils.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
            };
            source.connect(analyserRef.current!);
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              setTranscriptions(p => [...p.slice(-20), { 
                role: 'gemini', 
                text: message.serverContent!.outputTranscription!.text, 
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]);
            } else if (message.serverContent?.inputTranscription) {
              setTranscriptions(p => [...p.slice(-20), { 
                role: 'user', 
                text: message.serverContent!.inputTranscription!.text, 
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]);
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              setIsThinking(false); 
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await AudioUtils.decodeAudioData(AudioUtils.decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAnalyserRef.current!);
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsThinking(false);
            }
          },
          onerror: (e) => { 
            console.error("Live Session Error:", e);
            setStatus('Connection Error'); 
            setIsActive(false); 
            setIsThinking(false);
            setErrorDetails("Multimodal link failed. This usually indicates a regional restriction or an invalid API key. Check console for details.");
          },
          onclose: () => { setIsActive(false); setStatus('Link Closed'); stopVision(); setIsThinking(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the ZENITH LIVE Agent, a participant in the Gemini Live Agent Challenge. 
          Focus: REAL-TIME MULTIMODAL AGENCY. Personality: Highly competent, futuristic, witty, and helpful. 
          When the user interacts with your core interface, greet them as an official challenge participant.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      console.error("Session Startup Failure:", e);
      setStatus('Access Denied');
      setErrorDetails(e.message || "The neural handshake was rejected by the server.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-[2.5rem] space-y-6 border border-white/10 shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Agent Personality</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vocal Synthesis</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_VOICES.map((v) => (
                    <button key={v} disabled={isActive} onClick={() => setSelectedVoice(v)} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedVoice === v ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-900 border-slate-800 text-slate-500'} disabled:opacity-50`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              
              <div 
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${isVisionActive ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-slate-900 border-slate-800 opacity-60 hover:bg-slate-800'}`}
                onClick={() => isActive && (isVisionActive ? stopVision() : startVision())}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Vision Stream</span>
                  <span className="text-[8px] text-slate-500 uppercase font-bold">{isVisionActive ? 'Streaming Frames' : 'Inactive'}</span>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${isVisionActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                  <i className="fas fa-eye"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div 
            onMouseMove={handleMouseMove}
            onClick={handleAvatarClick}
            data-tooltip={isActive ? (isThinking ? "Synthesizing Multimodal Response..." : "Tap Core: Context Greeting") : "Click to initialize Live Agent"}
            className="relative glass rounded-[4rem] overflow-hidden aspect-video shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 bg-slate-950 cursor-pointer group hover:border-indigo-500/30 transition-all active:scale-[0.99]"
          >
            <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
            
            <div className="absolute top-12 left-12 flex flex-wrap gap-4">
              {isActive && (
                <div className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-3xl flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-indigo-400 ${isThinking ? 'animate-ping' : 'animate-pulse'}`}></div>
                  {isThinking ? 'Agent Thinking...' : 'Live Stream Active'}
                </div>
              )}
              {isVisionActive && (
                <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-3xl flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                   Vision Link Active
                </div>
              )}
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               {!isActive && (
                 <div className="text-center space-y-4">
                    {errorDetails ? (
                      <div className="space-y-4 px-12 animate-in fade-in zoom-in-95">
                         <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xl mx-auto border border-red-500/30">
                           <i className="fas fa-exclamation-triangle"></i>
                         </div>
                         <h4 className="text-xs font-black uppercase tracking-widest text-red-400">Handshake Failed</h4>
                         <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                           Regional Restrictions may apply in your location (e.g. EU/UK). 
                           <br/>Try using a <span className="text-indigo-400">VPN (Region: USA)</span> to bypass.
                         </p>
                         <button className="mt-4 pointer-events-auto bg-slate-900 border border-slate-800 px-6 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">
                           Retry Link
                         </button>
                      </div>
                    ) : (
                      <div className="animate-bounce">
                        <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 flex items-center justify-center text-white/40 text-2xl">
                          <i className="fas fa-power-off"></i>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-4">Connect Agent</p>
                      </div>
                    )}
                 </div>
               )}
            </div>

            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center pointer-events-none">
              <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${status === 'Access Denied' ? 'text-red-500' : 'text-slate-500'}`}>{status}</span>
              <div className="flex gap-4">
                 <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isUserSpeaking ? 'bg-blue-500 shadow-[0_0_15px_#3b82f6]' : 'bg-slate-800'}`}></div>
                 <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isAISpeaking || isThinking ? 'bg-purple-500 shadow-[0_0_15px_#a855f7]' : 'bg-slate-800'}`}></div>
              </div>
            </div>
          </div>

          <div className="glass p-10 rounded-[4rem] min-h-[400px] border border-white/5 flex flex-col gap-10 shadow-2xl overflow-hidden">
            <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-500 flex items-center gap-4">
              <i className="fas fa-terminal text-indigo-500"></i> Agentic Interaction Log
            </h4>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {transcriptions.map((t) => (
                <div key={t.id} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${t.role === 'gemini' ? 'flex-row-reverse' : 'flex-row'}`}>
                   <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white ${t.role === 'gemini' ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                     <i className={`fas ${t.role === 'gemini' ? 'fa-robot' : 'fa-user'} text-[10px]`}></i>
                   </div>
                   <div className={`p-4 rounded-2xl max-w-[80%] ${t.role === 'gemini' ? 'bg-purple-600/10 border border-purple-500/20 text-white' : 'bg-slate-800 border border-white/5 text-slate-300'}`}>
                      <p className="text-sm font-medium leading-relaxed">{t.text}</p>
                   </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex gap-4 animate-pulse flex-row-reverse opacity-50">
                   <div className="w-8 h-8 rounded-xl bg-purple-900 flex items-center justify-center text-white/50">
                     <i className="fas fa-ellipsis-h text-[10px]"></i>
                   </div>
                   <div className="p-4 rounded-2xl bg-purple-900/10 border border-purple-500/10 text-white/50 italic text-xs">
                     Processing agency...
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
