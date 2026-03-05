
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  theme?: 'dark' | 'light';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 40, showText = false, theme = 'dark' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Outer Glow */}
        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-xl animate-pulse"></div>
        
        {/* Logo Shape */}
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 w-full h-full drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Stylized Z */}
          <path 
            d="M25 25H75L25 75H75" 
            stroke="url(#logo-gradient)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="animate-in fade-in zoom-in duration-1000"
          />
          
          {/* Neural Connection Points */}
          <circle cx="25" cy="25" r="5" fill="#818cf8" />
          <circle cx="75" cy="25" r="5" fill="#60a5fa" />
          <circle cx="25" cy="75" r="5" fill="#60a5fa" />
          <circle cx="75" cy="75" r="5" fill="#818cf8" />
          
          {/* Live Indicator */}
          <circle 
            cx="85" 
            cy="15" 
            r="6" 
            fill="#10b981" 
            className="animate-pulse"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`text-xl font-black tracking-tighter leading-none ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            ZENITH <span className="text-indigo-500">LIVE</span>
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Agentic Orchestrator</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
