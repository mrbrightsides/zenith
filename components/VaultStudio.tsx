
import React, { useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";

interface VaultStudioProps {
  theme: 'dark' | 'light';
}

const VaultStudio: React.FC<VaultStudioProps> = ({ theme }) => {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const [isRequesting, setIsRequesting] = useState(false);
  
  const [connections, setConnections] = useState(() => {
    const saved = localStorage.getItem('zenith_vault_connections');
    if (saved) return JSON.parse(saved);
    
    return [
      { id: 'github', name: 'GitHub', icon: 'fa-github', status: 'authorized', scope: 'repo, user', lastUsed: '2 mins ago', connection: 'github' },
      { id: 'google', name: 'Google Calendar', icon: 'fa-calendar-alt', status: 'pending', scope: 'calendar.events', lastUsed: 'Never', connection: 'google-oauth2' },
      { id: 'spotify', name: 'Spotify', icon: 'fa-spotify', status: 'disconnected', scope: 'playlist-read-private', lastUsed: 'Never', connection: 'spotify' },
    ];
  });

  // Persist changes
  React.useEffect(() => {
    localStorage.setItem('zenith_vault_connections', JSON.stringify(connections));
  }, [connections]);

  // Auto-authorize if we return authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      // If we are authenticated, we assume the pending connection (usually Google in this demo flow) is now authorized
      setConnections(prev => prev.map(c => 
        (c.id === 'google' && c.status === 'pending') ? { ...c, status: 'authorized', lastUsed: 'Just now' } : c
      ));
    }
  }, [isAuthenticated]);

  const handleAuthorize = (id: string, connection?: string) => {
    if (connection) {
      loginWithRedirect({
        authorizationParams: {
          connection: connection,
          prompt: 'consent'
        }
      });
      return;
    }
    
    setIsRequesting(true);
    setTimeout(() => {
      setConnections(prev => prev.map(c => c.id === id ? { ...c, status: 'authorized', lastUsed: 'Just now' } : c));
      setIsRequesting(false);
    }, 1500);
  };

  const handleDisconnect = (id: string) => {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, status: 'disconnected', lastUsed: 'Never' } : c));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Vault Studio</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500">Auth0 Token Vault Intermediary</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vault Secure</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Vault Display */}
        <div className="lg:col-span-2 glass rounded-[2.5rem] border border-white/10 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <i className="fas fa-shield-alt text-9xl"></i>
          </div>

          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                <i className="fas fa-key"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Active Credentials</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isAuthenticated ? `Authorized for ${user?.name}` : 'Awaiting Agent Authentication'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {connections.map((conn) => (
                <div key={conn.id} className={`glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-slate-900/50'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                      conn.status === 'authorized' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      conn.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      'bg-slate-800 text-slate-500 border-white/5'
                    } border transition-colors`}>
                      <i className={`fab ${conn.icon}`}></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold">{conn.name}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          conn.status === 'authorized' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          conn.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-slate-800 text-slate-500 border-white/5'
                        }`}>
                          {conn.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Scope: {conn.scope}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Last Handshake</p>
                      <p className="text-[10px] font-bold text-slate-400">{conn.lastUsed}</p>
                    </div>
                    <button 
                      disabled={isRequesting}
                      onClick={() => conn.status === 'authorized' ? handleDisconnect(conn.id) : handleAuthorize(conn.id, conn.connection)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        conn.status === 'authorized' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 
                        isRequesting ? 'bg-slate-800 text-slate-600 animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                      }`}
                    >
                      <i className={`fas ${conn.status === 'authorized' ? 'fa-unlink' : (isRequesting ? 'fa-spinner fa-spin' : 'fa-link')}`}></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vault Stats & Logs */}
        <div className="space-y-6">
          <div className="glass rounded-[2.5rem] border border-white/10 p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Vault Diagnostics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Security Layer</span>
                <span className="text-emerald-500">AES-256-GCM</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Token Rotation</span>
                <span className="text-emerald-500">Enabled</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Active Sessions</span>
                <span className="text-white">04</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[85%]"></div>
              </div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mt-2 text-center">Vault Integrity: 98.4%</p>
            </div>
          </div>

          <div className="glass rounded-[2.5rem] border border-white/10 p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-500">Audit Trail</h3>
            <div className="space-y-4 font-mono text-[9px]">
              {connections.filter(c => c.status === 'authorized').map((c, idx) => (
                <React.Fragment key={c.id}>
                  <div className="flex gap-3 text-slate-500">
                    <span className="text-indigo-400">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    <span>{c.id.toUpperCase()}_TOKEN_REQUESTED</span>
                  </div>
                  <div className="flex gap-3 text-slate-500">
                    <span className="text-indigo-400">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    <span className="text-emerald-400">AUTH0_VAULT_HANDSHAKE_OK</span>
                  </div>
                </React.Fragment>
              ))}
              {connections.some(c => c.status === 'pending') && (
                <div className="flex gap-3 text-slate-500">
                  <span className="text-indigo-400">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <span className="text-amber-400">CONSENT_PENDING_USER_ACTION</span>
                </div>
              )}
              {connections.every(c => c.status === 'disconnected') && (
                <div className="flex gap-3 text-slate-500 italic opacity-50">
                  <span>No active handshakes recorded...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultStudio;
