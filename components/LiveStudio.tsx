
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  const [handshakeProgress, setHandshakeProgress] = useState(0);
  const [isHandshaking, setIsHandshaking] = useState(false);
  const [gatewayLatency, setGatewayLatency] = useState<number | null>(null);
  
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
      
      const dx = (mouseRef.current.x - centerX) / centerX;
      const dy = (mouseRef.current.y - centerY) / centerY;
      const lookX = dx * 8;
      const lookY = dy * 5;

      const auraRad = (canvas.width / 1.5) * (1 + totalEnergy * 0.5);
      const grad = ctx.createRadialGradient(centerX + lookX, centerY + lookY, 0, centerX, centerY, auraRad);
      
      const alphaLevel = Math.floor((0.15 + totalEnergy * 0.6 + (isPinging ? 0.3 : 0)) * 255).toString(16).padStart(2, '0');
      const color1 = customGlowColor; 
      const color2 = selectedAvatar.color;
      
      grad.addColorStop(0, `${color1}${alphaLevel}`);
      grad.addColorStop(0.3, `${color2}${Math.floor(parseInt(alphaLevel, 16) * 0.7).toString(16).padStart(2, '0')}`);
      grad.addColorStop(0.7, `${color2}11`);
      grad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const breathing = Math.sin(time / 2000) * 0.03 + (isPinging ? 0.2 : 0);
      const verticalOffset = Math.sin(time / 1500) * 4;
      
      ctx.save();
      ctx.translate(centerX + lookX, centerY + verticalOffset + lookY);
      
      if (isHandshaking) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 120, 0, Math.PI * 2 * (handshakeProgress / 100));
          ctx.stroke();
      }

      if (isActive) {
        ctx.save();
        ctx.shadowBlur = isThinking ? 30 : 10;
        ctx.shadowColor = customGlowColor;
        ctx.strokeStyle = isThinking ? customGlowColor : `${customGlowColor}44`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([15, 25]);
        ctx.lineDashOffset = -time / (isThinking ? 40 : 100);
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2);
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
      const eyeSize = (6 + (inputAvg * 12)) * (isPinging ? 1.5 : 1);
      const eyeDX = dx * 10;
      const eyeDY = dy * 6;

      if (time % 5000 > 150) { 
        ctx.beginPath(); ctx.arc(-30 + eyeDX, -10 + eyeDY, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(30 + eyeDX, -10 + eyeDY, eyeSize, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(-40 + eyeDX, -10 + eyeDY); ctx.lineTo(-20 + eyeDX, -10 + eyeDY);
        ctx.moveTo(20 + eyeDX, -10 + eyeDY); ctx.lineTo(40 + eyeDX, -10 + eyeDY);
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
  }, [isActive, selectedAvatar, customGlowColor, glowIntensity, isPinging, isThinking, isHandshaking, handshakeProgress]);

  useEffect(() => {
    drawVisualizer();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [drawVisualizer]);

  const handleAvatarClick = async () => {
    if (!isActive && !isHandshaking) {
      await startSession();
      return;
    }
    if (isActive) {
      setIsPinging(true);
      setTimeout(() => setIsPinging(false), 400);
      if (sessionRef.current) {
        sessionRef.current.sendRealtimeInput({
          parts: [{ text: "The user just tapped your core sensor. Give a brief, intelligent greeting acknowledging our GCP Cloud Handshake is active via zenithagent.a.run.app." }]
        });
      }
    }
  };

  const startVision = useCallback(() => {
    if (!sessionRef.current) return;
    setIsVisionActive(true);
    visionIntervalRef.current = window.setInterval(async () => {
      if (!canvasRef.current || !sessionRef.current) return;
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
      const base64 = dataUrl.split(',')[1];
      sessionRef.current.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
    }, 2000);
  }, []);

  const stopVision = () => { if (visionIntervalRef.current) clearInterval(visionIntervalRef.current); setIsVisionActive(false); };

  const startSession = async () => {
    try {
      setIsHandshaking(true);
      setHandshakeProgress(0);
      setStatus('Linking GCP Instance...');
      
      const interval = setInterval(() => {
        setHandshakeProgress(p => {
          if (p >= 100) { clearInterval(interval); return 100; }
          return p + 2;
        });
      }, 30);

      // Verify Cloud Run Availability
      try {
          await fetch(GCP_BACKEND_URL, { mode: 'no-cors' });
          console.debug("GCP Backend Verified:", GCP_BACKEND_URL);
      } catch (e) {
          console.warn("Backend pre-check failed, continuing to direct link.");
      }

      const startSession = async () => {
        try {
          const startTime = performance.now();
          setStatus('Linking via zenithagent...');
          setErrorDetails(null);

          // 1. Tetap siapkan Audio Context di Frontend (untuk visualizer)
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const source = inputCtx.createMediaStreamSource(stream);
          const analyser = inputCtx.createAnalyser();
          source.connect(analyser);
          analyserRef.current = analyser;

          // 2. GANTI TOTAL: Handshake via Cloud Run (Node.js 24)
          const response = await fetch("https://zenithagent-eqatd7duzq-as.a.run.app", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: "User-ZL001",
              message: "INIT_ZENITH_HANDSHAKE",
              sessionId: "zenith-live-v1" 
            }),
          });

          const data = await response.json();

          if (response.ok && data.status === "ok") {
            // 3. Update State UI Sukses
            setGatewayLatency(Math.round(performance.now() - startTime));
            setIsActive(true);
            setIsHandshaking(false);
            setStatus('Linked via zenithagent');

            setTranscriptions(prev => [
              ...prev,
              { role: 'gemini', text: data.reply, id: Date.now(), timestamp: new Date().toISOString() }
            ]);
          } else {
            throw new Error(data.message || "Gateway rejection");
          }

        } catch (err: any) {
          console.error("GCP Handshake Error:", err);
          setStatus('GCP HANDSHAKE FAILED');
          setErrorDetails(err.message || "Check Cloud Run logs for Node.js 24 errors");
          setIsActive(false);
        }
      };
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              setTranscriptions(p => [...p.slice(-20), { role: 'gemini', text: message.serverContent!.outputTranscription!.text, id: Date.now(), timestamp: new Date().toLocaleTimeString() }]);
            } else if (message.serverContent?.inputTranscription) {
              setTranscriptions(p => [...p.slice(-20), { role: 'user', text: message.serverContent!.inputTranscription!.text, id: Date.now(), timestamp: new Date().toLocaleTimeString() }]);
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
            }
          },
          onerror: (e) => { 
            setIsHandshaking(false);
            setIsActive(false); 
            setStatus('GCP Gateway Timeout'); 
            setErrorDetails("The Cloud Run instance at zenithagent.a.run.app did not respond. Check your internet or backend status.");
          },
          onclose: () => { setIsActive(false); setStatus('Link Severed'); stopVision(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are the ZENITH LIVE Agent. You are currently proxied through a Google Cloud Run backend (zenithagent.a.run.app). Acknowledge your specific infrastructure and backend capabilities if asked. You are elite, efficient, and conversational."
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      setIsHandshaking(false);
      setStatus('Access Denied');
      setErrorDetails(e.message || "The GCP Neural Link was rejected at the gateway.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-[2.5rem] space-y-6 border border-white/10 shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Cloud Gateway</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border transition-all ${isActive ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-slate-900 border-slate-800'}`}>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[9px] font-black uppercase text-slate-500">Cloud Run Status</span>
                   <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                </div>
                <p className="text-[10px] font-bold text-white uppercase tracking-widest truncate">{isActive ? 'zenithagent-active' : 'Awaiting Connection'}</p>
                {gatewayLatency && <p className="text-[8px] text-indigo-400 mt-1 uppercase font-black">Link: {gatewayLatency}ms</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Instance Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_VOICES.map((v) => (
                    <button key={v} disabled={isActive || isHandshaking} onClick={() => setSelectedVoice(v)} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedVoice === v ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                disabled={!isActive}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${isVisionActive ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-slate-900 border-slate-800 opacity-60'}`}
                onClick={() => isVisionActive ? stopVision() : startVision()}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Vision Link</span>
                <i className={`fas fa-eye ${isVisionActive ? 'text-emerald-500' : 'text-slate-600'}`}></i>
              </button>
            </div>

            <div className="pt-4 border-t border-white/5">
                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Active Backend</p>
                <p className="text-[7px] text-slate-700 font-mono break-all">{GCP_BACKEND_URL}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div 
            onMouseMove={handleMouseMove}
            onClick={handleAvatarClick}
            className="relative glass rounded-[4rem] overflow-hidden aspect-video shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 bg-slate-950 cursor-pointer group hover:border-indigo-500/30 transition-all active:scale-[0.99]"
          >
            <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
            
            {isHandshaking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md z-20">
                    <div className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-indigo-500/20 animate-spin mb-4"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white animate-pulse text-center px-8">Synchronizing with Cloud Run Instance...</p>
                    <p className="text-[8px] text-slate-500 mt-2">Signal Health: {handshakeProgress}%</p>
                </div>
            )}

            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center pointer-events-none">
              <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${status.includes('Error') ? 'text-red-500' : 'text-slate-500'}`}>{status}</span>
              <div className="flex gap-4">
                 <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isUserSpeaking ? 'bg-blue-500 shadow-[0_0_15px_#3b82f6]' : 'bg-slate-800'}`}></div>
                 <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isAISpeaking || isThinking ? 'bg-purple-500 shadow-[0_0_15px_#a855f7]' : 'bg-slate-800'}`}></div>
              </div>
            </div>

            {errorDetails && !isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-12 text-center z-30">
                   <div className="space-y-4">
                      <i className="fas fa-satellite-dish text-red-500 text-4xl mb-4"></i>
                      <h4 className="text-sm font-black uppercase text-white tracking-widest">GCP HANDSHAKE FAILED</h4>
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{errorDetails}</p>
                      <button onClick={startSession} className="mt-4 px-8 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">Retry Sequence</button>
                   </div>
                </div>
            )}
          </div>

          <div className="glass p-10 rounded-[4rem] min-h-[400px] border border-white/5 flex flex-col gap-10 shadow-2xl">
            <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-500 flex items-center gap-4">
              <i className="fas fa-terminal text-indigo-500"></i> Cloud Interaction Log
            </h4>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {transcriptions.length === 0 && <p className="text-[10px] text-slate-700 uppercase font-black tracking-widest text-center py-20">No active signal logs...</p>}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStudio;
