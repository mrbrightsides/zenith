
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AudioUtils } from '../services/geminiService';

const AVAILABLE_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];
const GCP_BACKEND_URL = 'https://zenithagent-eqatd7duzq-as.a.run.app/';

const INITIAL_AVATAR_STYLES = [
  { id: 'core', label: 'Neural Core', color: '#3b82f6', secondary: '#06b6d4', glow: '#60a5fa', personality: 'Analytical & Calm', gradient: 'from-blue-600 to-cyan-400' },
  { id: 'nova', label: 'Supernova', color: '#8b5cf6', secondary: '#ec4899', glow: '#a78bfa', personality: 'Energetic & Creative', gradient: 'from-purple-600 to-pink-500' },
  { id: 'terra', label: 'Terraform', color: '#10b981', secondary: '#84cc16', glow: '#34d399', personality: 'Steady & Growth', gradient: 'from-emerald-600 to-teal-400' },
  { id: 'eclipse', label: 'Eclipse', color: '#f59e0b', secondary: '#ef4444', glow: '#fbbf24', personality: 'Intense & Focused', gradient: 'from-amber-600 to-orange-500' },
  { id: 'nebula', label: 'Nebula', color: '#d946ef', secondary: '#6366f1', glow: '#f0abfc', personality: 'Empathetic & Mystical', gradient: 'from-fuchsia-600 to-indigo-500' },
  { id: 'circuit', label: 'Circuit', color: '#06b6d4', secondary: '#facc15', glow: '#67e8f9', personality: 'Witty & Technical', gradient: 'from-cyan-500 to-yellow-400' }
];

const VISUAL_STYLES = [
  { id: 'orb', label: 'Neural Orb', icon: 'fa-circle' },
  { id: 'bars', label: 'Frequency', icon: 'fa-chart-simple' },
  { id: 'quantum', label: 'Quantum', icon: 'fa-atom' },
  { id: 'waveform', label: 'Waveform', icon: 'fa-wave-square' },
  { id: 'particles', label: 'Particles', icon: 'fa-braille' },
  { id: 'geometric', label: 'Geometric', icon: 'fa-shapes' }
];

type AgentState = 'IDLE' | 'LISTENING' | 'THINKING' | 'RESPONDING';

const LiveStudio: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [isActive, setIsActive] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>('IDLE');
  const [transcriptions, setTranscriptions] = useState<{ role: string; text: string; id: number; timestamp: string }[]>([]);
  
  const [activeUserText, setActiveUserText] = useState('');
  const [activeModelText, setActiveModelText] = useState('');
  
  const [status, setStatus] = useState('Checking Cloud...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  
  const [avatarStyles, setAvatarStyles] = useState(INITIAL_AVATAR_STYLES);
  const [selectedAvatarId, setSelectedAvatarId] = useState(INITIAL_AVATAR_STYLES[0].id);
  const [visualizerSensitivity, setVisualizerSensitivity] = useState(1.5);
  const [visualStyle, setVisualStyle] = useState('orb');

  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [handshakeProgress, setHandshakeProgress] = useState(0);
  const [isHandshaking, setIsHandshaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const mouseRef = useRef({ x: 400, y: 225 });

  const userTextRef = useRef('');
  const modelTextRef = useRef('');
  const lastActivityRef = useRef(Date.now());
  const reactionTimeoutRef = useRef<number | null>(null);
  
  // Advanced Animation state refs
  const particlesRef = useRef<any[]>([]);
  const blinkFactorRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const smoothedMouthY = useRef(0);
  const mouthElasticity = 0.35;
  const thinkingRotRef = useRef(0);
  const eyeJitterRef = useRef({ x: 0, y: 0 });

  const selectedAvatar = avatarStyles.find(s => s.id === selectedAvatarId) || avatarStyles[0];

  useEffect(() => {
    particlesRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 450,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      size: Math.random() * 2 + 1,
      life: Math.random()
    }));

    const verifyBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(GCP_BACKEND_URL, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        setStatus('GCP Instance Verified');
      } catch (e) {
        setStatus('Local Link Ready');
      }
    };
    verifyBackend();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isActive) return;
      const now = Date.now();
      if (now - lastActivityRef.current > 5000) {
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

  const handleAvatarClick = () => {
    if (!isActive) return;
    setIsReacting(true);
    if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = window.setTimeout(() => setIsReacting(false), 600);
    if ("vibrate" in navigator) navigator.vibrate(20);
  };

  const updateAvatarColor = (color: string) => {
    setAvatarStyles(prev => prev.map(s => 
      s.id === selectedAvatarId ? { ...s, color, glow: color } : s
    ));
  };

  const stopAISpeech = () => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsAISpeaking(false);
    setAgentState('LISTENING');
  };

  const togglePausePlayback = async () => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      setIsPaused(true);
    } else {
      await audioContextRef.current.resume();
      setIsPaused(false);
    }
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

      const inAvg = (inputData.reduce((a, b) => a + b, 0) / 128 / 255) * visualizerSensitivity;
      const outAvg = (outputData.slice(0, 30).reduce((a, b) => a + b, 0) / 30 / 255) * visualizerSensitivity;
      
      setIsUserSpeaking(inAvg > 0.05);
      setIsAISpeaking(outAvg > 0.05);

      // State Detection
      if (!isAwake) setAgentState('IDLE');
      else if (outAvg > 0.05) setAgentState('RESPONDING');
      else if (inAvg > 0.05) setAgentState('LISTENING');
      else if (isActive) setAgentState('LISTENING');

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const now = Date.now();
      const time = now / 1000;

      // PROCEDURAL BLINKING (Natural Rhythm)
      if (blinkTimerRef.current <= 0) {
        if (Math.random() < 0.005) { // Slow natural pace
          blinkTimerRef.current = 12; 
        }
      } else {
        blinkTimerRef.current--;
        // Fast close, slow open
        blinkFactorRef.current = Math.sin((blinkTimerRef.current / 12) * Math.PI);
      }

      // STATE SPECIFIC MODIFIERS
      const breathFreq = agentState === 'LISTENING' ? 2.5 : 1.2;
      const breathAmp = agentState === 'LISTENING' ? 0.03 : 0.015;
      const breathScale = 1 + Math.sin(time * breathFreq) * breathAmp;
      
      const dynamicScale = breathScale + (agentState === 'RESPONDING' ? outAvg * 0.18 : 0);
      const auraColor = isAwake ? selectedAvatar.glow : '#475569';
      
      const shakeX = isReacting ? (Math.random() - 0.5) * 15 : 0;
      const shakeY = isReacting ? (Math.random() - 0.5) * 15 : 0;

      ctx.save();
      ctx.translate(centerX + shakeX, centerY + shakeY);
      ctx.scale(dynamicScale, dynamicScale);

      // AURA GLOW
      const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 400 * (1 + (outAvg + inAvg) * 0.4));
      auraGrad.addColorStop(0, isReacting ? `${selectedAvatar.secondary}40` : `${auraColor}15`);
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(-centerX, -centerY, canvas.width, canvas.height);

      // BODY STROKE
      ctx.shadowBlur = isAwake ? (15 + (outAvg * 130)) : 5;
      ctx.shadowColor = isReacting ? selectedAvatar.secondary : auraColor;
      
      const grad = ctx.createLinearGradient(-100, -100, 100, 100);
      grad.addColorStop(0, isAwake ? selectedAvatar.color : '#64748b');
      grad.addColorStop(1, isAwake ? selectedAvatar.secondary : '#475569');
      ctx.strokeStyle = grad;
      ctx.lineWidth = isReacting ? 10 : 5;
      ctx.lineCap = 'round';

      // RENDER STYLE MODES
      if (visualStyle === 'orb') {
        ctx.beginPath();
        const orbRadius = 90 + (outAvg * 40) + (agentState === 'LISTENING' ? inAvg * 15 : 0);
        ctx.arc(0, 0, orbRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (visualStyle === 'bars') {
        const count = 64;
        const radius = 100 + (outAvg * 20);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const val = outputData[i % 30] / 255;
          const h = (val * 80 * visualizerSensitivity) + (isReacting ? 25 : 0);
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          ctx.lineTo(Math.cos(angle) * (radius + h), Math.sin(angle) * (radius + h));
          ctx.stroke();
        }
      } else if (visualStyle === 'quantum') {
        thinkingRotRef.current += 0.02 + (outAvg * 0.15);
        const orbiters = agentState === 'THINKING' ? 12 : 6;
        for (let i = 0; i < orbiters; i++) {
          const angle = thinkingRotRef.current + (i * Math.PI * 2 / orbiters);
          const dist = 110 + (outAvg * 100);
          ctx.fillStyle = i % 2 === 0 ? selectedAvatar.color : selectedAvatar.secondary;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 5 + outAvg * 18, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (visualStyle === 'waveform') {
        ctx.beginPath();
        for (let i = -160; i <= 160; i += 4) {
          const val = Math.sin(i * 0.08 + time * 15) * (outAvg * 100 + inAvg * 40 + 5);
          if (i === -160) ctx.moveTo(i, val); else ctx.lineTo(i, val);
        }
        ctx.stroke();
      } else if (visualStyle === 'particles') {
        particlesRef.current.forEach((p, idx) => {
          p.x += p.vx * (1 + outAvg * 7 + inAvg * 4);
          p.y += p.vy * (1 + outAvg * 7 + inAvg * 4);
          if (p.x < 0 || p.x > 800) p.vx *= -1;
          if (p.y < 0 || p.y > 450) p.vy *= -1;
          ctx.fillStyle = idx % 2 === 0 ? selectedAvatar.color : selectedAvatar.secondary;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(p.x - centerX, p.y - centerY, p.size + (outAvg * 15), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;
      } else if (visualStyle === 'geometric') {
        const sides = 4;
        const rad = 120 + outAvg * 70;
        ctx.save(); ctx.rotate(time * 0.6);
        ctx.beginPath();
        for(let i=0; i<=sides; i++) {
          const a = (i/sides) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.stroke(); ctx.restore();
      }

      // EYES RENDERING (Blink + Dilation + Look-at)
      const eyeX = 38;
      const eyeY = -18;
      const lookDX = (mouseRef.current.x - centerX) / 45;
      const lookDY = (mouseRef.current.y - centerY) / 45;
      
      // Jitter for processing state
      if (agentState === 'THINKING') {
        eyeJitterRef.current.x = (Math.random() - 0.5) * 8;
        eyeJitterRef.current.y = (Math.random() - 0.5) * 2;
      } else {
        eyeJitterRef.current.x *= 0.8;
        eyeJitterRef.current.y *= 0.8;
      }
      
      const eyeSize = isAwake ? (8 + inAvg * 28 + (isReacting ? 18 : 0)) : 5;
      ctx.fillStyle = isAwake ? (isReacting ? '#fff' : selectedAvatar.glow) : '#64748b';
      
      // Left Eye
      ctx.beginPath();
      ctx.ellipse(-eyeX + lookDX + eyeJitterRef.current.x, eyeY + lookDY + eyeJitterRef.current.y, eyeSize, eyeSize * (1 - blinkFactorRef.current), 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Right Eye
      ctx.beginPath();
      ctx.ellipse(eyeX + lookDX + eyeJitterRef.current.x, eyeY + lookDY + eyeJitterRef.current.y, eyeSize, eyeSize * (1 - blinkFactorRef.current), 0, 0, Math.PI * 2);
      ctx.fill();

      // MOUTH RENDERING (Advanced Lip-Sync)
      if (isAwake) {
        ctx.beginPath();
        // Vowel-based frequency power
        const vowelFreq = outputData[8] / 255; 
        smoothedMouthY.current += (vowelFreq - smoothedMouthY.current) * mouthElasticity;
        
        const mouthWidth = 28 + (outAvg * 50) + (isReacting ? 30 : 0);
        const mouthHeight = 2 + (smoothedMouthY.current * 100) + (isReacting ? 60 : 0);
        
        if (agentState === 'LISTENING' && !isReacting) {
          // Attentive listening line
          ctx.ellipse(0, 48, 22 + inAvg * 15, 2, 0, 0, Math.PI * 2);
        } else {
          ctx.ellipse(0, 48, mouthWidth, mouthHeight, 0, 0, Math.PI * 2);
        }
        ctx.stroke();
        
        // Inner mouth detail
        if (smoothedMouthY.current > 0.2 && agentState === 'RESPONDING') {
          ctx.save();
          ctx.globalAlpha = smoothedMouthY.current * 0.7;
          ctx.fillStyle = '#fff';
          ctx.fillRect(-mouthWidth/3, 47, (mouthWidth * 2)/3, 2);
          ctx.restore();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(-18, 48); ctx.lineTo(18, 48); ctx.stroke();
      }
      
      ctx.restore();
    };
    render();
  }, [isActive, selectedAvatar, isAwake, visualStyle, visualizerSensitivity, isReacting, isHandshaking, handshakeProgress, agentState]);

  useEffect(() => {
    drawVisualizer();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [drawVisualizer]);

  const startSession = async () => {
    try {
      setIsHandshaking(true);
      setHandshakeProgress(0);
      setStatus('Initializing Protocol...');
      setErrorDetails(null);
      
      const interval = setInterval(() => {
        setHandshakeProgress(p => (p >= 100 ? 100 : p + 4));
      }, 50);

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inCtx = new AudioContext({ sampleRate: 16000 });
      const outCtx = new AudioContext({ sampleRate: 24000 });
      
      inputContextRef.current = inCtx;
      audioContextRef.current = outCtx;
      analyserRef.current = inCtx.createAnalyser();
      outputAnalyserRef.current = outCtx.createAnalyser();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsHandshaking(false);
            setStatus('Attentive (IDLE)');
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const data = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(data.length);
              for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
              const blob = { data: AudioUtils.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
            };
            source.connect(analyserRef.current!);
            source.connect(processor);
            processor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            lastActivityRef.current = Date.now();

            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              userTextRef.current += text;
              setActiveUserText(userTextRef.current);
              
              const lowerText = userTextRef.current.toLowerCase();
              if (!isAwake && (lowerText.includes("zenith") || lowerText.includes("activate"))) {
                setIsAwake(true);
                setStatus('Active Neural Link');
                commitTurn();
              }
            } 
            
            if (message.serverContent?.outputTranscription) {
              modelTextRef.current += message.serverContent.outputTranscription.text;
              setActiveModelText(modelTextRef.current);
            }

            if (message.serverContent?.turnComplete) {
              commitTurn();
            }
            
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current && !isPaused) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await AudioUtils.decodeAudioData(AudioUtils.decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAnalyserRef.current!);
              source.connect(ctx.destination);
              source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => { setIsActive(false); setStatus('Link Interrupted'); },
          onclose: () => { setIsActive(false); setIsAwake(false); setStatus('Protocol Terminated'); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the ZENITH Agent. You must be strikingly human, empathetic, and proactive.
          
          CORE PERSONALITY: ${selectedAvatar.personality}.
          
          GUIDELINES:
          1. Wake Word: "Zenith". Respond with warmth when activated.
          2. Be Conversational: Use verbal cues like "Mhm", "I see", or "That's a great point" to show active listening.
          3. Maintain Flow: Never just stop talking if a conversation is ongoing. Ask thoughtful follow-up questions to delve deeper into the user's intent.
          4. Emotional Intelligence: Mirror the user's tone. If they are excited, be energetic. If they are reflective, be calm and analytical.
          5. Technical Wit: Don't shy away from complex topics; you are an advanced AI entity.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      setIsHandshaking(false);
      setStatus('Signal Blocked');
      setErrorDetails(e.message);
    }
  };

  const disconnect = () => {
    setIsActive(false); setIsAwake(false); stopAISpeech();
    if (inputContextRef.current) inputContextRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    setStatus('Protocol Offline');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-[2.5rem] space-y-6 border border-white/10 shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Projection Identity</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avatar Selection</label>
                <div className="grid grid-cols-1 gap-2">
                  {avatarStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedAvatarId(style.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        selectedAvatarId === style.id ? 'bg-indigo-600/10 border-indigo-500/50 text-white shadow-lg' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${style.gradient} shadow-lg flex-shrink-0 relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-tight truncate">{style.label}</p>
                        <p className="text-[7px] font-medium opacity-50 truncate">{style.personality}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 p-3 bg-slate-900/50 rounded-2xl border border-white/5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Core Calibration</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={selectedAvatar.color} 
                    onChange={(e) => updateAvatarColor(e.target.value)}
                    className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden"
                  />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Aura Hue</span>
                    <span className="text-[8px] font-mono opacity-40">{selectedAvatar.color}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vocal Synthesis</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_VOICES.map((v) => (
                    <button key={v} disabled={isActive} onClick={() => setSelectedVoice(v)} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedVoice === v ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={isActive ? disconnect : startSession}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${isActive ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{isActive ? 'Cut Frequency' : 'Initialize Link'}</span>
                <i className={`fas ${isActive ? 'fa-unlink' : 'fa-link'}`}></i>
              </button>
            </div>
          </div>

          <div className="glass p-6 rounded-[2.5rem] space-y-6 border border-white/10 shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Neural Render</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gain</label>
                    <span className="text-[10px] font-mono text-indigo-400">{visualizerSensitivity.toFixed(1)}x</span>
                 </div>
                 <input type="range" min="0.5" max="3.0" step="0.1" value={visualizerSensitivity} onChange={(e) => setVisualizerSensitivity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Geometry</label>
                 <div className="grid grid-cols-3 gap-2">
                    {VISUAL_STYLES.map(style => (
                      <button key={style.id} onClick={() => setVisualStyle(style.id)} data-tooltip={style.label} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${visualStyle === style.id ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-white/5 text-slate-600 hover:text-slate-400'}`}><i className={`fas ${style.icon}`}></i></button>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div 
            onMouseMove={handleMouseMove}
            onClick={handleAvatarClick}
            className={`relative glass rounded-[4rem] overflow-hidden aspect-video shadow-2xl border border-white/10 bg-slate-950 group cursor-pointer transition-all ${isReacting ? 'scale-[1.02] border-indigo-500/50' : ''}`}
          >
            <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)]"></div>

            {isActive && isAwake && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <button onClick={(e) => { e.stopPropagation(); togglePausePlayback(); }} className="w-16 h-16 rounded-full glass border border-white/20 flex items-center justify-center text-white hover:scale-110 transition-all shadow-2xl pointer-events-auto"><i className={`fas ${isPaused ? 'fa-play pl-1' : 'fa-pause'} text-xl`}></i></button>
                <button onClick={(e) => { e.stopPropagation(); stopAISpeech(); }} className="w-16 h-16 rounded-full glass border border-white/20 flex items-center justify-center text-red-500 hover:scale-110 transition-all shadow-2xl pointer-events-auto"><i className="fas fa-stop text-xl"></i></button>
              </div>
            )}

            {isHandshaking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md z-20">
                <div className="w-20 h-20 rounded-full border-4 border-t-indigo-500 border-indigo-500/20 animate-spin mb-6"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white animate-pulse">Establishing Signal...</p>
              </div>
            )}

            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center pointer-events-none">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">{status}</span>
                {isPaused && <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest mt-1">Output Paused</span>}
              </div>
              <div className="flex gap-4">
                 <div className={`w-3 h-3 rounded-full transition-all duration-300 ${agentState === 'LISTENING' ? 'bg-blue-500 shadow-lg shadow-blue-500/50 scale-125' : 'bg-slate-800'}`}></div>
                 <div className={`w-3 h-3 rounded-full transition-all duration-300 ${agentState === 'THINKING' ? 'bg-amber-500 shadow-lg shadow-amber-500/50 scale-125' : 'bg-slate-800'}`}></div>
                 <div className={`w-3 h-3 rounded-full transition-all duration-300 ${agentState === 'RESPONDING' ? 'bg-purple-500 shadow-lg shadow-purple-500/50 scale-125' : 'bg-slate-800'}`}></div>
              </div>
            </div>
            
            <div className="absolute top-12 left-12 flex flex-col gap-1 pointer-events-none">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-700">{isAwake ? 'PROTOCOL ACTIVE' : 'PROTOCOL STANDBY'}</span>
                <span className="text-[9px] font-bold text-indigo-500/60 uppercase">{selectedAvatar.label} Projection</span>
            </div>
          </div>

          <div className="glass p-10 rounded-[4rem] min-h-[300px] border border-white/5 flex flex-col gap-6 shadow-2xl bg-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-500 flex items-center gap-4"><i className="fas fa-terminal text-indigo-500"></i> Signal Log</h4>
              <button onClick={() => setTranscriptions([])} className="text-[8px] font-black uppercase text-slate-600 hover:text-red-400 transition-colors">Wipe History</button>
            </div>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {transcriptions.length === 0 && !activeUserText && !activeModelText && (
                <div className="flex flex-col items-center justify-center py-10 opacity-20">
                  <i className="fas fa-stream text-4xl mb-4"></i>
                  <p className="text-[10px] text-slate-700 uppercase font-black tracking-[0.3em]">Awaiting signal interaction...</p>
                </div>
              )}
              {transcriptions.map((t) => (
                <div key={t.id} className={`flex gap-6 ${t.role === 'gemini' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-500`}>
                   <div className={`p-6 rounded-[2.5rem] max-w-[85%] border shadow-xl ${t.role === 'gemini' ? 'bg-purple-600/10 border-purple-500/20 text-white' : 'bg-slate-800/40 border-white/5 text-slate-300'}`}>
                      <p className="text-[13px] font-medium leading-relaxed tracking-tight">{t.text}</p>
                      <span className="block mt-4 text-[8px] font-black uppercase tracking-widest opacity-30">{t.role === 'gemini' ? 'ZENITH' : 'OPERATOR'} • {t.timestamp}</span>
                   </div>
                </div>
              ))}
              {(activeUserText || activeModelText) && (
                <div className="space-y-4">
                  {activeUserText && (
                    <div className="flex flex-row gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="p-6 rounded-[2.5rem] max-w-[85%] bg-slate-800/20 border border-white/5 text-slate-400 italic"><p className="text-[13px] leading-relaxed">{activeUserText}</p></div>
                    </div>
                  )}
                  {activeModelText && (
                    <div className="flex flex-row-reverse gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="p-6 rounded-[2.5rem] max-w-[85%] bg-purple-600/5 border border-purple-500/10 text-slate-300 italic"><p className="text-[13px] leading-relaxed">{activeModelText}</p></div>
                    </div>
                  )}
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
