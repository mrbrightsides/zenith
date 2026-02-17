
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { GroundingSource } from '../types';

interface TextHistoryItem {
  id: string;
  prompt: string;
  text: string;
  sources: GroundingSource[];
  timestamp: number;
}

const TEMPLATES = [
  { id: 'summary', label: 'Summarize Article', icon: 'fa-compress-alt', text: 'Please summarize the following article into 5 key bullet points, highlighting the most important findings:\n\n[Paste Content Here]' },
  { id: 'blog', label: 'Blog Outline', icon: 'fa-list-ol', text: 'Create a comprehensive blog post outline for the topic: "[Insert Topic]". Include an introduction, 3-5 main sections with sub-points, and a conclusion with a call to action.' },
  { id: 'marketing', label: 'Marketing Copy', icon: 'fa-ad', text: 'Write three catchy marketing slogans and a 50-word product description for a new [Insert Product Name] that solves [Insert Problem]. Target audience: [Insert Audience].' },
  { id: 'email', label: 'Professional Email', icon: 'fa-envelope', text: 'Draft a professional email to [Recipient Name] regarding [Topic]. The tone should be [Polite/Urgent/Formal] and the goal is to [Goal].' }
];

interface TextStudioProps {
  theme: 'dark' | 'light';
  initialItem?: any;
  onMounted?: () => void;
}

const TextStudio: React.FC<TextStudioProps> = ({ theme, initialItem, onMounted }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [result, setResult] = useState<{ text: string; sources: GroundingSource[] } | null>(null);
  const [history, setHistory] = useState<TextHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('text_studio_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    
    if (initialItem) {
      setPrompt(initialItem.prompt || '');
      setResult({ text: initialItem.text || '', sources: initialItem.sources || [] });
      onMounted?.();
    }
  }, [initialItem]);

  const applyTemplate = (text: string) => {
    setPrompt(text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveToHistory = (newItem: TextHistoryItem) => {
    const updated = [newItem, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem('text_studio_history', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const data = await GeminiService.generateText(prompt, useSearch);
      setResult(data);
      saveToHistory({
        id: Date.now().toString(),
        prompt,
        text: data.text,
        sources: data.sources,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(error);
      alert('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const recallHistory = (item: TextHistoryItem) => {
    setPrompt(item.prompt);
    setResult({ text: item.text, sources: item.sources });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (confirm('Clear all text history?')) {
      setHistory([]);
      localStorage.removeItem('text_studio_history');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Template Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
          <i className="fas fa-layer-group text-blue-500"></i> Prompt Templates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATES.map(temp => (
            <button
              key={temp.id}
              onClick={() => applyTemplate(temp.text)}
              data-tooltip={`Apply the "${temp.label}" template structure`}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl glass border transition-all text-center hover:border-blue-500 group ${theme === 'light' ? 'hover:bg-white' : 'hover:bg-slate-900'}`}
            >
              <i className={`fas ${temp.icon} text-lg text-blue-400 group-hover:scale-110 transition-transform`}></i>
              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70 group-hover:opacity-100">{temp.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Text Studio</h2>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            data-tooltip="View and recall previous text generations"
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${showHistory ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <i className="fas fa-history"></i>
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>
        
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            data-tooltip="Enter your writing prompt or search query"
            placeholder="Describe what you want to write or ask a question..."
            className={`w-full ${theme === 'light' ? 'bg-white/50' : 'bg-slate-900/50'} border border-slate-700/50 rounded-2xl p-4 min-h-[160px] focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all text-sm leading-relaxed`}
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-4">
            <label 
              className="flex items-center gap-2 cursor-pointer select-none"
              data-tooltip="Allow Gemini to browse the live web for factual accuracy"
            >
              <input 
                type="checkbox" 
                checked={useSearch} 
                onChange={(e) => setUseSearch(e.target.checked)} 
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500">Google Search</span>
            </label>
            <button
              onClick={handleGenerate}
              disabled={loading}
              data-tooltip="Process request via Gemini 3.0 Pro"
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              Generate
            </button>
          </div>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="glass p-6 rounded-3xl animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Recent Prompts</h3>
            <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <i className="fas fa-trash-alt"></i> Clear
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => recallHistory(item)}
                className={`text-left p-4 rounded-2xl ${theme === 'light' ? 'bg-white/50 border-slate-200' : 'bg-slate-900/40 border-slate-800'} border hover:border-blue-500/50 hover:bg-slate-800/60 transition-all group`}
              >
                <p className="text-xs text-slate-500 mb-1">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className={`text-sm font-medium line-clamp-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'} group-hover:text-blue-400 transition-colors`}>{item.prompt}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="glass p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
          <div className="prose prose-invert max-w-none">
            <div className={`whitespace-pre-wrap leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
              {result.text}
            </div>
          </div>
          
          {result.sources.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-700/30">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Verified Sources</h3>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${theme === 'light' ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors`}
                  >
                    <i className="fas fa-link text-blue-400"></i>
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextStudio;
