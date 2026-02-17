
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';

interface ImageHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: number;
}

const STYLE_TAGS = [
  { id: 'none', label: 'Default', suffix: '', tooltip: 'Standard model output' },
  { id: 'photorealistic', label: 'Photorealistic', suffix: ', highly detailed photorealistic style, 8k resolution, cinematic lighting', tooltip: 'Cinematic photography look' },
  { id: 'cartoon', label: 'Cartoon', suffix: ', vibrant cartoon illustration, bold lines, expressive characters', tooltip: 'Stylized animated look' },
  { id: 'abstract', label: 'Abstract', suffix: ', abstract expressionism, geometric patterns, bold color palette', tooltip: 'Modern art interpretation' },
  { id: 'cyberpunk', label: 'Cyberpunk', suffix: ', cyberpunk aesthetic, neon lights, futuristic city vibes, synthwave', tooltip: 'Neon/Futuristic aesthetic' },
  { id: 'watercolor', label: 'Watercolor', suffix: ', soft watercolor painting style, delicate textures, bleeding colors', tooltip: 'Hand-painted effect' },
  { id: 'sketch', label: 'Pencil Sketch', suffix: ', hand-drawn pencil sketch, charcoal textures, artistic shading', tooltip: 'Fine art pencil drawing' },
  { id: '3d', label: '3D Render', suffix: ', octane render, 3D character design, soft shadows, claymorphism', tooltip: 'Octane/Clay render style' }
];

interface ImageStudioProps {
  theme: 'dark' | 'light';
  initialItem?: any;
  onMounted?: () => void;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ theme, initialItem, onMounted }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLE_TAGS[0]);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [highRes, setHighRes] = useState(false);
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('image_studio_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load image history", e);
      }
    }

    if (initialItem) {
      setPrompt(initialItem.prompt || '');
      setImage(initialItem.imageUrl || null);
      onMounted?.();
    }
  }, [initialItem]);

  const saveToHistory = (newItem: ImageHistoryItem) => {
    const updated = [newItem, ...history].slice(0, 15);
    setHistory(updated);
    localStorage.setItem('image_studio_history', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    
    if (highRes) {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }
    }

    setLoading(true);
    try {
      const finalPrompt = prompt + selectedStyle.suffix;
      const model = highRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      const url = await GeminiService.generateImage(finalPrompt, model);
      setImage(url);
      saveToHistory({
        id: Date.now().toString(),
        prompt: finalPrompt,
        imageUrl: url,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(error);
      alert('Image generation failed');
    } finally {
      setLoading(false);
    }
  };

  const recallImage = (item: ImageHistoryItem) => {
    setPrompt(item.prompt);
    setImage(item.imageUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (confirm('Clear image history?')) {
      setHistory([]);
      localStorage.removeItem('image_studio_history');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-3xl space-y-4 sticky top-24">
            <h2 className="text-2xl font-bold">Image Studio</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Artistic Style</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAGS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    data-tooltip={style.tooltip}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border uppercase tracking-wider ${
                      selectedStyle.id === style.id 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : theme === 'light' ? 'bg-slate-200 border-slate-300 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Visual Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                data-tooltip="Describe the subject, environment, and mood"
                placeholder="A majestic lion on a futuristic throne..."
                className={`w-full ${theme === 'light' ? 'bg-white/50 border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'} rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all`}
              />
            </div>

            <div 
              className={`flex items-center justify-between p-3 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/50 border-slate-700'} rounded-2xl border`}
              data-tooltip="Unlock Gemini 3.0 Ultra-High Quality output (Paid Key Required)"
            >
              <span className="text-sm font-medium">Ultra High Quality</span>
              <input 
                type="checkbox" 
                checked={highRes}
                onChange={(e) => setHighRes(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 cursor-pointer"
              />
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={loading}
              data-tooltip="Synthesize image pixels via Imagen 3 Architecture"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
            >
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
              Generate Masterpiece
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {image ? (
            <div className="glass p-4 rounded-3xl overflow-hidden group relative animate-in zoom-in-95 duration-500 shadow-2xl">
              <img src={image} alt="Generated" className="w-full h-auto rounded-2xl shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]" />
              <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={image} 
                  download={`gemini-creation-${Date.now()}.png`}
                  data-tooltip="Download full-resolution PNG"
                  className="bg-black/60 backdrop-blur-md text-white hover:bg-black/80 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-xl"
                >
                  <i className="fas fa-download"></i> Export
                </a>
              </div>
            </div>
          ) : (
            <div className={`h-[500px] border-2 border-dashed ${theme === 'light' ? 'border-slate-300' : 'border-slate-800'} rounded-3xl flex flex-col items-center justify-center text-slate-500 gap-4`}>
              <i className="far fa-image text-6xl opacity-10"></i>
              <p className="font-medium opacity-50 uppercase tracking-widest text-xs">Canvas Empty</p>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <i className="fas fa-images"></i> Recent Gallery
                </h3>
                <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-tighter">
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {history.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 group">
                    <button
                      onClick={() => recallImage(item)}
                      data-tooltip={`Recall: ${item.prompt.substring(0, 30)}...`}
                      className={`aspect-square rounded-xl overflow-hidden glass border ${theme === 'light' ? 'border-slate-200 shadow-sm' : 'border-slate-800'} hover:border-blue-500 transition-all group relative`}
                    >
                      <img src={item.imageUrl} alt="Recent" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i className="fas fa-redo-alt text-white shadow-sm"></i>
                      </div>
                    </button>
                    <div className="px-1">
                      <p className={`text-[9px] line-clamp-2 leading-tight opacity-60 group-hover:opacity-100 transition-opacity ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {item.prompt}
                      </p>
                      <span className="text-[8px] opacity-40 uppercase tracking-tighter">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
