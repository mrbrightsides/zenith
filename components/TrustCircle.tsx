
import React from 'react';
import { useAuth0 } from "@auth0/auth0-react";

interface TrustCircleUser {
  id: string;
  name: string;
  picture: string;
  color: string;
  isInteracting?: boolean;
}

interface TrustCircleProps {
  users: TrustCircleUser[];
  theme: 'dark' | 'light';
}

const TrustCircle: React.FC<TrustCircleProps> = ({ users, theme }) => {
  const { user } = useAuth0();

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-3">
      <div className="flex -space-x-3 hover:space-x-1 transition-all duration-500">
        {users.map((u) => (
          <div 
            key={u.id}
            className="relative group"
          >
            <div 
              className={`w-12 h-12 rounded-2xl border-2 p-0.5 transition-all duration-300 group-hover:-translate-y-2 cursor-pointer shadow-xl relative ${
                u.isInteracting ? 'scale-110' : ''
              }`}
              style={{ borderColor: u.color, backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }}
            >
              {/* Interaction Pulse */}
              {u.isInteracting && (
                <div 
                  className="absolute inset-0 rounded-2xl animate-ping opacity-40"
                  style={{ backgroundColor: u.color }}
                ></div>
              )}

              <img 
                src={u.picture} 
                alt={u.name} 
                className="w-full h-full rounded-xl object-cover relative z-10"
                referrerPolicy="no-referrer"
              />

              {/* Interaction Icon Overlay */}
              {u.isInteracting && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-indigo-600 border border-indigo-400 flex items-center justify-center text-[10px] text-white z-20 shadow-lg animate-bounce">
                  <i className="fas fa-brain"></i>
                </div>
              )}

              <div 
                className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 animate-pulse z-20"
                style={{ backgroundColor: u.color }}
              ></div>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="glass px-4 py-2 rounded-xl border border-white/10 whitespace-nowrap">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                  {u.name} {u.id === user?.sub ? '(You)' : ''}
                </p>
                <p className={`text-[8px] font-black uppercase tracking-widest ${u.isInteracting ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {u.isInteracting ? 'Neural Processing Active' : 'Neural Link Idle'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass px-6 py-3 rounded-3xl border border-white/10 flex items-center gap-4 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Trust Circle</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{users.length} Agents Online</span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
          <i className="fas fa-users"></i>
        </div>
      </div>
    </div>
  );
};

export default TrustCircle;
