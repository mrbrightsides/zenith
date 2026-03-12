
import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import * as d3 from 'd3';

interface GovernanceStudioProps {
  theme: 'dark' | 'light';
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: 'user' | 'resource' | 'action';
  label: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  relation: string;
}

interface Tuple {
  id: string;
  user: string;
  relation: string;
  object: string;
}

const GovernanceStudio: React.FC<GovernanceStudioProps> = ({ theme }) => {
  const { user, isAuthenticated, loginWithRedirect, getIdTokenClaims } = useAuth0();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string, visible: boolean }>({ x: 0, y: 0, content: '', visible: false });
  
  const [tuples, setTuples] = useState<Tuple[]>([
    { id: 't-1', user: 'Agent: Zenith', relation: 'can_read', object: 'GitHub: zenith-core' },
    { id: 't-2', user: 'Agent: Zenith', relation: 'can_write', object: 'Google: Neural Schedule' },
    { id: 't-3', user: 'Agent: Zenith', relation: 'can_delete', object: 'Spotify: Audio Stream' },
    { id: 't-4', user: 'System: Admin', relation: 'is_admin', object: 'GitHub: zenith-core' },
  ]);

  const [newTuple, setNewTuple] = useState({ user: '', relation: '', object: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [alert, setAlert] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  const [authModel, setAuthModel] = useState(`Loading OpenFGA Model...`);
  const [isStepUpRequired, setIsStepUpRequired] = useState(false);
  const [stepUpStatus, setStepUpStatus] = useState<'idle' | 'requesting' | 'verified'>('idle');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingOp, setPendingOp] = useState<{ id: string, label: string } | null>(null);

  const commonRelations = ['viewer', 'editor', 'admin', 'reader', 'writer', 'owner'];
  const commonObjects = ['GitHub: zenith-core', 'Google: Neural Schedule', 'Spotify: Audio Stream', 'Vault: Secrets'];

  const [policies, setPolicies] = useState([
    { id: 'pol-1', resource: 'GitHub Repo', action: 'viewer', status: 'allowed', level: 'Standard' },
    { id: 'pol-2', resource: 'GitHub Repo', action: 'admin', status: 'denied', level: 'Critical' },
    { id: 'pol-3', resource: 'Google Calendar', action: 'editor', status: 'allowed', level: 'Standard' },
    { id: 'pol-4', resource: 'Google Calendar', action: 'owner', status: 'denied', level: 'Critical' },
  ]);

  const addTuple = async () => {
    if (!newTuple.user || !newTuple.relation || !newTuple.object) return;

    // Policy Enforcement Simulation
    const isCriticalViolation = policies.some(p => 
      p.level === 'Critical' && 
      p.status === 'denied' && 
      newTuple.relation === p.action && 
      newTuple.object.toLowerCase().includes(p.resource.toLowerCase().split(' ')[0])
    );

    if (isCriticalViolation) {
      setAlert({ message: 'CRITICAL SECURITY VIOLATION: This relationship violates immutable governance policies.', type: 'error' });
      setTimeout(() => setAlert(null), 4000);
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/fga/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTuple)
      });

      if (!response.ok) throw new Error('Failed to write tuple');

      const id = `t-${Date.now()}`;
      setTuples([...tuples, { id, ...newTuple }]);
      setNewTuple({ user: '', relation: '', object: '' });
      setAlert({ message: 'Tuple injected successfully into OpenFGA.', type: 'success' });
      
      // Re-verify ownership if the user just updated themselves
      // (Handled by useEffect on tuples change)
    } catch (err: any) {
      setAlert({ message: `Injection Failed: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setAlert(null), 2000);
    }
  };

  const syncWithOpenFGA = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/fga/tuples');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tuples');
      }
      const data = await response.json();
      
      const mappedTuples: Tuple[] = data.map((t: any, idx: number) => ({
        id: `fga-${idx}`,
        user: t.key.user,
        relation: t.key.relation,
        object: t.key.object
      }));

      setTuples(mappedTuples);
      setAlert({ message: `Successfully synchronized ${mappedTuples.length} tuples from OpenFGA.`, type: 'success' });
      setConnectionFailed(false);
    } catch (err: any) {
      setAlert({ message: `Sync Error: ${err.message}`, type: 'error' });
      setConnectionFailed(true);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const fetchModel = async () => {
    try {
      const response = await fetch('/api/fga/model');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch model');
      }
      const model = await response.json();
      
      // Simple DSL representation for display
      let dsl = `model\n  schema ${model.schema_version}\n\n`;
      model.type_definitions.forEach((td: any) => {
        dsl += `type ${td.type}\n`;
        if (td.relations) {
          dsl += `  relations\n`;
          Object.keys(td.relations).forEach(rel => {
            dsl += `    define ${rel}\n`;
          });
        }
        dsl += `\n`;
      });
      setAuthModel(dsl);
      setConnectionFailed(false);
    } catch (err: any) {
      setAuthModel(`ERROR: ${err.message}`);
      setConnectionFailed(true);
    }
  };

  const checkOwnership = async () => {
    if (!user?.sub) return;
    const checkPayload = {
      user: `user:${user.sub}`,
      relation: 'owner',
      object: 'workspace:zenith-live'
    };

    console.log("[FGA] Checking Ownership:", checkPayload);

    try {
      const response = await fetch('/api/fga/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkPayload)
      });
      const data = await response.json();
      console.log("[FGA] Check Response:", data);
      setIsOwner(data.allowed);
    } catch (err) {
      console.error("Ownership check failed:", err);
    }
  };

  const checkMFAStatus = async () => {
    if (!isAuthenticated) return;
    try {
      const claims = await getIdTokenClaims();
      console.log("[AUTH] ID Token Claims:", claims);
      
      // Check for MFA in acr or amr claims (ensure boolean result)
      const acrClaim = claims?.acr;
      const amrClaim = (claims as any)?.amr || [];
      
      const hasMFA = !!(
        acrClaim === 'http://schemas.openid.net/pape/policies/2007/06/multi-factor' || 
        amrClaim.includes('mfa') ||
        amrClaim.includes('otp') ||
        amrClaim.includes('duo')
      );
      
      console.log("[AUTH] MFA Status Check:", { acr: acrClaim, amr: amrClaim, verified: hasMFA });
      
      if (hasMFA) {
        setStepUpStatus('verified');
        
        // Check for pending operation in session storage
        const savedOp = sessionStorage.getItem('zenith_pending_op');
        if (savedOp) {
          const op = JSON.parse(savedOp);
          console.log(`[GOVERNANCE] ${op.label} Initiated by ${user?.sub} (MFA VERIFIED)`);
          setAlert({ message: `Executing ${op.label}... Agentic action authorized via MFA.`, type: 'success' });
          sessionStorage.removeItem('zenith_pending_op');
          setTimeout(() => setAlert(null), 5000);
        }
      } else {
        // If we have a pending op but no MFA, it means the redirect happened but MFA wasn't satisfied
        const savedOp = sessionStorage.getItem('zenith_pending_op');
        if (savedOp) {
          console.warn("[AUTH] Returned from Auth0 but MFA claim is missing. Ensure Auth0 Action is configured.");
          setAlert({ 
            message: "MFA challenge was not triggered. Please verify your Auth0 'Post-Login' Action is enforcing MFA for Step-up.", 
            type: 'error' 
          });
          sessionStorage.removeItem('zenith_pending_op');
          setTimeout(() => setAlert(null), 6000);
        }
      }
    } catch (err) {
      console.error("Failed to check MFA status:", err);
    }
  };

  const handleStepUpTrigger = async () => {
    if (!isOwner) {
      setAlert({ message: "UNAUTHORIZED: Only Workspace Owners can initiate high-stakes operations.", type: 'error' });
      setIsStepUpRequired(false);
      setTimeout(() => setAlert(null), 5000);
      return;
    }

    // Save pending operation to session storage before redirect
    if (pendingOp) {
      sessionStorage.setItem('zenith_pending_op', JSON.stringify(pendingOp));
    }

    setStepUpStatus('requesting');
    setIsVerifying(true);

    // Trigger Auth0 Step-up MFA
    loginWithRedirect({
      authorizationParams: {
        acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor'
      }
    });
  };

  useEffect(() => {
    syncWithOpenFGA();
    fetchModel();
    checkMFAStatus();
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (user?.sub) {
      checkOwnership();
    }
  }, [user, tuples]);

  useEffect(() => {
    if (!svgRef.current) return;

    // Build Graph Data from Tuples
    const nodes: Node[] = [];
    const links: Link[] = [];

    tuples.forEach(t => {
      if (!nodes.find(n => n.id === t.user)) nodes.push({ id: t.user, type: 'user', label: t.user });
      if (!nodes.find(n => n.id === t.relation)) nodes.push({ id: t.relation, type: 'action', label: t.relation });
      if (!nodes.find(n => n.id === t.object)) nodes.push({ id: t.object, type: 'resource', label: t.object });

      links.push({ source: t.user, target: t.relation, relation: 'granted' });
      links.push({ source: t.relation, target: t.object, relation: 'on' });
    });

    const width = 800;
    const height = 400;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Adjust label size based on zoom
        g.selectAll("text")
          .style("font-size", `${9 / event.transform.k}px`);
      });

    svg.call(zoom);

    // Add glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "glow");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "coloredBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke", d => {
        if (d.relation === 'denied') return "#ef4444";
        if (d.relation === 'pending') return "#f59e0b";
        return "#6366f1";
      })
      .attr("stroke-opacity", 0.4)
      .attr("stroke-dasharray", d => d.relation === 'pending' ? "5,5" : "0");

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d.id === selectedNode ? null : d.id);
      })
      .on("mouseover", (event, d) => {
        setTooltip({
          x: event.pageX,
          y: event.pageY - 40,
          content: `${d.type.toUpperCase()}: ${d.label}`,
          visible: true
        });
      })
      .on("mouseout", () => setTooltip(prev => ({ ...prev, visible: false })))
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", d => d.type === 'user' ? 18 : 12)
      .attr("fill", d => {
        if (selectedNode && d.id !== selectedNode) {
          const isConnected = links.some(l => 
            ((l.source as Node).id === selectedNode && (l.target as Node).id === d.id) ||
            ((l.target as Node).id === selectedNode && (l.source as Node).id === d.id)
          );
          if (!isConnected) return "#1e293b";
        }
        if (d.type === 'user') return "#6366f1";
        if (d.type === 'resource') return "#10b981";
        return "#f59e0b";
      })
      .attr("filter", d => (selectedNode === d.id) ? "url(#glow)" : "none")
      .attr("stroke", d => selectedNode === d.id ? "#fff" : "rgba(255,255,255,0.2)")
      .attr("stroke-width", d => selectedNode === d.id ? 3 : 2);

    node.append("text")
      .text(d => d.label)
      .attr("x", 20)
      .attr("y", 4)
      .attr("fill", theme === 'dark' ? "#94a3b8" : "#475569")
      .style("font-size", "9px")
      .style("font-weight", "900")
      .style("text-transform", "uppercase")
      .style("letter-spacing", "0.1em")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [theme, user, tuples, selectedNode]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Neural Governance</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500">OpenFGA Fine-Grained Authorization</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Engine Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Authorization Model DSL */}
        <div className="lg:col-span-1 glass rounded-[2.5rem] border border-white/10 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Auth Model (DSL)</h3>
            <i className="fas fa-code text-indigo-500/50"></i>
          </div>
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 h-[300px] overflow-y-auto">
            <pre className="text-[9px] font-mono text-indigo-300 leading-relaxed">
              {authModel}
            </pre>
          </div>
          <button className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            Update Schema
          </button>
        </div>

        {/* Policy List */}
        <div className="lg:col-span-3 glass rounded-[2.5rem] border border-white/10 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <i className="fas fa-fingerprint text-9xl"></i>
          </div>

          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                isOwner ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-white/10'
              }`}>
                <i className={`fas ${isOwner ? 'fa-shield-check' : 'fa-shield-virus'}`}></i>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Agent Identity</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isAuthenticated ? (
                    <>
                      ID: <span className="text-indigo-400">{user?.sub}</span> • 
                      STATUS: <span className={isOwner ? "text-emerald-500" : "text-amber-500"}>
                        {isOwner ? "LIVE NEURAL CORE" : "SANDBOX"}
                      </span>
                    </>
                  ) : 'Awaiting Governance Handshake'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <div key={policy.id} className={`glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-slate-900/50'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        policy.level === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      }`}>
                        {policy.level}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{policy.resource}</span>
                    </div>
                    <h4 className="font-bold text-sm">{policy.action}</h4>
                  </div>

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                    policy.status === 'allowed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    <i className={`fas ${policy.status === 'allowed' ? 'fa-check' : 'fa-times'}`}></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Governance Stats */}
        <div className="space-y-6">
          <div className="glass rounded-[2.5rem] border border-white/10 p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">FGA Diagnostics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Connection Status</span>
                <span className={connectionFailed ? "text-red-500" : "text-emerald-500"}>
                  {connectionFailed ? "Connection Failed" : "Active"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Tuples Loaded</span>
                <span className="text-white">{tuples.length}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Decision Mode</span>
                <span className="text-indigo-500">Strict</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-[2.5rem] border border-white/10 p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-500">Tuple Creator</h3>
            <div className="space-y-4">
              {alert && (
                <div className={`p-3 rounded-xl text-[9px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2 ${
                  alert.type === 'error' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                }`}>
                  {alert.message}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 ml-2">User/Agent</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newTuple.user}
                    onChange={e => setNewTuple({...newTuple, user: e.target.value})}
                    placeholder="agent:khudri"
                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-indigo-500 transition-colors"
                  />
                  {user?.sub && newTuple.user !== user.sub && (
                    <button 
                      onClick={() => setNewTuple({...newTuple, user: user.sub || ''})}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-indigo-400 hover:text-white"
                    >
                      Use My ID
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1 relative">
                <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Relation</label>
                <input 
                  type="text" 
                  value={newTuple.relation}
                  onChange={e => setNewTuple({...newTuple, relation: e.target.value})}
                  placeholder="can_read"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-indigo-500 transition-colors"
                />
                {newTuple.relation && commonRelations.some(r => r.startsWith(newTuple.relation) && r !== newTuple.relation) && (
                  <div className="absolute z-50 top-full left-0 w-full glass border border-white/10 rounded-xl mt-1 overflow-hidden">
                    {commonRelations.filter(r => r.startsWith(newTuple.relation)).map(r => (
                      <button 
                        key={r}
                        onClick={() => setNewTuple({...newTuple, relation: r})}
                        className="w-full text-left px-4 py-2 text-[9px] font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1 relative">
                <label className="text-[8px] font-black uppercase text-slate-500 ml-2">Object/Resource</label>
                <input 
                  type="text" 
                  value={newTuple.object}
                  onChange={e => setNewTuple({...newTuple, object: e.target.value})}
                  placeholder="repo:zenith"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-indigo-500 transition-colors"
                />
                {newTuple.object && commonObjects.some(o => o.toLowerCase().includes(newTuple.object.toLowerCase()) && o !== newTuple.object) && (
                  <div className="absolute z-50 top-full left-0 w-full glass border border-white/10 rounded-xl mt-1 overflow-hidden">
                    {commonObjects.filter(o => o.toLowerCase().includes(newTuple.object.toLowerCase())).map(o => (
                      <button 
                        key={o}
                        onClick={() => setNewTuple({...newTuple, object: o})}
                        className="w-full text-left px-4 py-2 text-[9px] font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={addTuple}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Inject Tuple
                </button>
                <button 
                  onClick={syncWithOpenFGA}
                  disabled={isSyncing}
                  className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-indigo-400 hover:bg-slate-700 transition-all"
                  title="Sync with OpenFGA Store"
                >
                  <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High-Stakes Operations & Step-up Auth */}
      <div className="glass rounded-[2.5rem] border border-red-500/20 bg-red-500/5 p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
              <i className="fas fa-biohazard"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">High-Stakes Agentic Operations</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60">Requires Auth0 Step-up Authentication</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${stepUpStatus === 'verified' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {stepUpStatus === 'verified' ? 'MFA Verified' : 'MFA Required'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'wipe', label: 'Wipe Repository', icon: 'fa-eraser', color: 'red' },
            { id: 'deploy', label: 'Production Deploy', icon: 'fa-rocket', color: 'amber' },
            { id: 'revoke', label: 'Revoke All Tokens', icon: 'fa-user-slash', color: 'red' }
          ].map(op => (
            <button 
              key={op.id}
              onClick={() => {
                if (stepUpStatus !== 'verified') {
                  setPendingOp(op);
                  setIsStepUpRequired(true);
                } else {
                  console.log(`[GOVERNANCE] ${op.label} Initiated by ${user?.sub}`);
                  setAlert({ message: `Executing ${op.label}... Agentic action authorized.`, type: 'success' });
                  setTimeout(() => setAlert(null), 3000);
                }
              }}
              className={`p-6 rounded-3xl glass border border-white/5 hover:border-${op.color}-500/30 transition-all flex flex-col items-center gap-3 group`}
            >
              <i className={`fas ${op.icon} text-2xl text-${op.color}-500 group-hover:scale-110 transition-transform`}></i>
              <span className="text-[9px] font-black uppercase tracking-widest">{op.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step-up MFA Modal */}
      {isStepUpRequired && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          {isVerifying ? (
            <div className="text-center space-y-12 relative">
              {/* Neural Core Pulse Overlay */}
              <div className="absolute inset-0 -z-10 flex items-center justify-center">
                <div className="w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
              </div>
              
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 scale-150 animate-ping"></div>
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 scale-125 animate-pulse"></div>
                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full border-t-indigo-500 animate-spin"></div>
                
                {/* Inner Pulsing Core */}
                <div className="absolute inset-4 bg-gradient-to-br from-indigo-600 to-violet-900 rounded-full shadow-[0_0_50px_rgba(79,70,229,0.4)] flex items-center justify-center text-4xl text-white">
                  <i className="fas fa-fingerprint animate-pulse"></i>
                </div>
                
                {/* Orbiting Particles */}
                <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(129,140,248,0.8)]"></div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-3xl font-black tracking-tighter uppercase italic text-white">Neural MFA Handshake</h3>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500 animate-pulse">Redirecting to Secure Identity Core</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass max-w-md w-full p-12 rounded-[3rem] border border-indigo-500/30 shadow-[0_0_100px_rgba(79,70,229,0.2)] space-y-8 text-center animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-4xl text-indigo-500 border border-indigo-500/20 mx-auto">
                <i className="fas fa-shield-check"></i>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tighter uppercase italic">Step-up Required</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500">Auth0 MFA Handshake</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The operation <span className="text-white font-bold">{pendingOp?.label}</span> is marked as <span className="text-red-500 font-bold">CRITICAL</span>. 
                Zenith requires a secondary biometric or MFA verification via Auth0 to proceed with agentic execution.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={handleStepUpTrigger}
                  className="w-full py-4 rounded-2xl bg-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                >
                  <i className="fas fa-fingerprint"></i>
                  Verify with Auth0 MFA
                </button>
                <button 
                  onClick={() => {
                    setIsStepUpRequired(false);
                    setPendingOp(null);
                  }}
                  className="w-full py-4 rounded-2xl bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Cancel Operation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Relationship Graph Visualization */}
      <div className="glass rounded-[2.5rem] border border-white/10 p-8 relative">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Policy Relationship Graph</h3>
          <div className="flex items-center gap-4">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Scroll to Zoom • Drag to Explore</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Real-time OpenFGA Visualization</span>
          </div>
        </div>
        <div className="h-[400px] flex items-center justify-center border border-dashed border-white/5 rounded-3xl bg-slate-900/20 overflow-hidden relative">
          <svg ref={svgRef} width="800" height="400" className="w-full h-full"></svg>
          
          {/* Tooltip */}
          {tooltip.visible && (
            <div 
              className="fixed z-[200] pointer-events-none glass px-3 py-2 rounded-lg border border-indigo-500/30 shadow-xl animate-in fade-in duration-200"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap">{tooltip.content}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GovernanceStudio;
