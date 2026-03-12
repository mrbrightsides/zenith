
import React, { useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";

interface VaultStudioProps {
  theme: 'dark' | 'light';
}

interface Connection {
  id: string;
  name: string;
  icon: string;
  status: 'authorized' | 'pending' | 'disconnected' | 'expired' | 'error';
  scope: string;
  lastUsed: string;
  connection?: string;
  error?: string;
  expiresAt?: number;
}

const VaultStudio: React.FC<VaultStudioProps> = ({ theme }) => {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const [isRequesting, setIsRequesting] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null);
  
  const [connections, setConnections] = useState<Connection[]>(() => {
    const saved = localStorage.getItem('zenith_vault_connections');
    if (saved) return JSON.parse(saved);
    
    return [
      { id: 'github', name: 'GitHub', icon: 'fa-github', status: 'authorized', scope: 'repo, user', lastUsed: '2 mins ago', connection: 'github' },
      { id: 'github-actions', name: 'GitHub Actions', icon: 'fa-play-circle', status: 'disconnected', scope: 'workflow, write:packages', lastUsed: 'Never', connection: 'github' },
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

  const [logs, setLogs] = useState<{ id: string; time: string; type: string; message: string; color: string }[]>([]);

  // MFA Listener for Token Release
  React.useEffect(() => {
    const handleMFAVerified = () => {
      const newLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString([], { hour12: false }),
        type: 'TOKEN_RELEASED',
        message: 'SOVEREIGN_CREDENTIALS_RELEASED_VIA_MFA',
        color: 'text-emerald-400'
      };
      setLogs(prev => [newLog, ...prev].slice(0, 10));
    };

    window.addEventListener('zenith-mfa-verified', handleMFAVerified);
    return () => window.removeEventListener('zenith-mfa-verified', handleMFAVerified);
  }, []);

  // Voice Command Listener
  React.useEffect(() => {
    const handleVoiceCommand = (e: any) => {
      const { action, serviceId } = e.detail;
      console.log(`Vault Voice Command: ${action} ${serviceId}`);
      
      if (action === 'connect') {
        const conn = connections.find(c => c.id === serviceId);
        if (conn) handleAuthorize(serviceId, conn.connection);
      } else if (action === 'disconnect') {
        handleDisconnect(serviceId);
      }
    };

    window.addEventListener('zenith-vault-command', handleVoiceCommand);
    return () => window.removeEventListener('zenith-vault-command', handleVoiceCommand);
  }, [connections]);

  // Token Refresh Simulation Logic
  React.useEffect(() => {
    const interval = setInterval(() => {
      setConnections(prev => prev.map(c => {
        // Randomly simulate an expiration for an authorized connection that doesn't have an error yet
        if (c.status === 'authorized' && !c.error && Math.random() > 0.98) {
          return { 
            ...c, 
            status: 'expired', 
            error: 'OAuth Token Expired',
            expiresAt: Date.now() 
          };
        }
        return c;
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = (id: string) => {
    setIsRequesting(true);
    setTimeout(() => {
      setConnections(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'authorized', error: undefined, lastUsed: 'Just now' } : c
      ));
      setIsRequesting(false);
    }, 2000);
  };

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
    setPendingDisconnect(null);
  };

  const confirmDisconnect = (id: string) => {
    setPendingDisconnect(id);
  };

  const pendingService = connections.find(c => c.id === pendingDisconnect);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Security Confirmation Dialog */}
      {pendingDisconnect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass max-w-md w-full p-8 rounded-[3rem] border border-red-500/20 shadow-2xl space-y-6 animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-2xl text-red-500 border border-red-500/20 mx-auto">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Revoke Access?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are about to disconnect <span className="text-white font-bold">{pendingService?.name}</span>. 
                This will immediately revoke all agentic permissions and stop any active background syncs. 
                You will need to re-authorize through the secure vault to restore functionality.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setPendingDisconnect(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDisconnect(pendingDisconnect)}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Vault Studio</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500">Sovereign AI Bridge & Token Vault</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intermediary Active</span>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-indigo-500/20 bg-indigo-500/5 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-3xl text-indigo-400 border border-indigo-500/30">
            <i className="fas fa-microchip"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">OpenClaw Sovereign Link</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Zenith acts as the secure intermediary for your local <span className="text-indigo-400 font-bold">OpenClaw</span> instance. 
              By keeping your sovereign AI in restricted mode, Zenith handles the "Authorized to Act" flows, 
              managing scoped tokens and consent delegation via the Auth0 Token Vault.
            </p>
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
                      conn.status === 'expired' || conn.status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-slate-800 text-slate-500 border-white/5'
                    } border transition-colors relative`}>
                      <i className={`fab ${conn.icon}`}></i>
                      {(conn.status === 'expired' || conn.status === 'error') && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] text-white">
                          <i className="fas fa-exclamation-triangle"></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold">{conn.name}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          conn.status === 'authorized' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          conn.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          conn.status === 'expired' || conn.status === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          'bg-slate-800 text-slate-500 border-white/5'
                        }`}>
                          {conn.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        {conn.error ? <span className="text-red-400 font-bold">{conn.error}</span> : `Scope: ${conn.scope}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Last Handshake</p>
                      <p className="text-[10px] font-bold text-slate-400">{conn.lastUsed}</p>
                    </div>
                    <button 
                      disabled={isRequesting}
                      onClick={() => {
                        if (conn.status === 'authorized') confirmDisconnect(conn.id);
                        else if (conn.status === 'expired' || conn.status === 'error') handleRefresh(conn.id);
                        else handleAuthorize(conn.id, conn.connection);
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        conn.status === 'authorized' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 
                        conn.status === 'expired' || conn.status === 'error' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white' :
                        isRequesting ? 'bg-slate-800 text-slate-600 animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                      }`}
                    >
                      <i className={`fas ${
                        conn.status === 'authorized' ? 'fa-unlink' : 
                        (conn.status === 'expired' || conn.status === 'error') ? 'fa-sync-alt' :
                        (isRequesting ? 'fa-spinner fa-spin' : 'fa-link')
                      }`}></i>
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
              {logs.map((log) => (
                <div key={log.id} className="space-y-1 animate-in slide-in-from-left-2 duration-300">
                  <div className="flex gap-3 text-slate-500">
                    <span className="text-indigo-400">[{log.time}]</span>
                    <span className={log.color}>{log.type}</span>
                  </div>
                  <div className="pl-6 text-[8px] text-slate-600 opacity-80">
                    {log.message}
                  </div>
                </div>
              ))}
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
