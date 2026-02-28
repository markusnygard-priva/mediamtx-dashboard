"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, DialogTrigger, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Server, Radio, Eye, RefreshCw, Trash2, Monitor, LogOut, 
  VideoIcon, Square, Shield, Activity, Video, Play, Plus, Globe, Moon, Sun, Clock, Database, Lock, Settings, LayoutGrid, Sparkles
} from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { clearAuth, getUsername } from "@/lib/auth";
import { StreamPlayer } from "@/components/stream-player";
import * as api from "@/lib/mediamtx-api";
import type { PathConfig, Path as LivePath } from "@/lib/mediamtx-api";

const themes = {
  light: {
    bg: "bg-[#f0f2f5]", 
    header: "bg-[#ffffff] border-[#d0d7de]",
    card: "bg-[#ffffff] border-[#d8dee4]",
    text: "text-[#1f2328]",
    textMuted: "text-[#57606a]",
    border: "border-[#d0d7de]",
    input: "bg-[#ffffff] border-[#d0d7de] text-[#1f2328]",
    tabActive: "border-[#0969da] text-[#0969da]",
    codeBg: "bg-[#f6f8fa] text-[#0969da]",
  },
  dark: {
    bg: "bg-[#2d333b]", 
    header: "bg-[#22272e] border-[#444c56]",
    card: "bg-[#373e47] border-[#444c56]", 
    text: "text-[#f0f6fc]", 
    textMuted: "text-[#adbac7]",
    border: "border-[#444c56]",
    input: "bg-[#22272e] border-[#444c56] text-[#f0f6fc]",
    tabActive: "border-[#58a6ff] text-[#58a6ff]", 
    codeBg: "bg-[#22272e] text-[#58a6ff]",
  }
};

// --- HELPER COMPONENTS ---

function FrigateDropdown({ sourceStreamName, onSuccess, theme }: { sourceStreamName: string, onSuccess?: () => void, theme: any }) {
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingSlot, setPendingSlot] = useState("");
  const options = Array.from({ length: 10 }, (_, i) => `frigate_${i + 1}`);

  const handleConfirmLink = async () => {
    setLoading(true);
    const sourceUrl = `rtsp://127.0.0.1:8554/${sourceStreamName}`;
    try {
      await api.updatePath(pendingSlot, sourceUrl);
      setShowDialog(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      try {
        await api.addPath(pendingSlot, sourceUrl);
        setShowDialog(false);
        if (onSuccess) onSuccess();
      } catch (err2: any) { alert("API Error: " + err2.message); }
    } finally { setLoading(false); }
  };

  return (
    <>
      <Select onValueChange={(v) => { setPendingSlot(v); setShowDialog(true); }} disabled={loading}>
        <SelectTrigger size="sm" className={`w-[130px] mr-2 ${theme.input}`}>
          <SelectValue placeholder="Link Frigate" />
        </SelectTrigger>
        <SelectContent className={`${theme.card} ${theme.text}`}>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className={`${theme.card} ${theme.text} border-none shadow-2xl`}>
          <DialogHeader><DialogTitle className={theme.text}>Confirm Bridge Routing</DialogTitle></DialogHeader>
          <div className="py-6 text-lg">Route <b>{sourceStreamName}</b> into <b>{pendingSlot}</b>?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className={theme.border}>Cancel</Button>
            <Button onClick={handleConfirmLink} disabled={loading} className="bg-[#238636] hover:bg-[#2ea043] text-white">Confirm Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StreamUrlButton({ protocol, pathName, ip, theme }: { protocol: string, pathName: string, ip: string, theme: any }) {
  const [open, setOpen] = useState(false);
  let url = "";
  if (protocol === "SRT") url = `srt://${ip}:8890?streamid=publish:${pathName}`;
  if (protocol === "RTMP") url = `rtmp://${ip}:1935/${pathName}`;
  if (protocol === "RTSP") url = `rtsp://${ip}:8554/${pathName}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className={`${theme.border} text-[#58a6ff] hover:bg-[#58a6ff]/10 font-bold`}>{protocol}</Button></DialogTrigger>
      <DialogContent className={`${theme.card} ${theme.text} border-none`}>
        <DialogHeader><DialogTitle className={theme.text}>{protocol} Publish Link</DialogTitle></DialogHeader>
        <code className={`text-xs p-4 rounded-lg break-all border font-mono shadow-inner ${theme.codeBg} border-[#444c56]`}>{url}</code>
        <Button className="mt-4 bg-[#444c56] text-white hover:bg-[#57606a] font-bold" onClick={() => { navigator.clipboard.writeText(url); setOpen(false); }}>Copy to Clipboard</Button>
      </DialogContent>
    </Dialog>
  );
}

// --- MAIN DASHBOARD ---

function MediaMTXDashboard() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? themes.dark : themes.light;

  const [serverIP, setServerIP] = useState("192.168.8.23");
  const [paths, setPaths] = useState<PathConfig[]>([]);
  const [livePaths, setLivePaths] = useState<LivePath[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [lastActiveMap, setLastActiveMap] = useState<Record<string, number>>({});
  
  const [isAddPathDialogOpen, setIsAddPathDialogOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newPath, setNewPath] = useState({ name: "", source: "publisher", sourceFingerprint: "", sourceOnDemand: false });

  const [config, setConfig] = useState({ 
    logLevel: "info", 
    rtsp: true, 
    rtmp: true, 
    hls: true,
    api: true,
    metrics: false
  });

  const fetchPaths = async () => {
    try {
      const [configData, liveData] = await Promise.all([api.getPathConfigs(), api.getPaths()]);
      const configs = configData?.items || [];
      const liveItems = liveData?.items || [];
      const now = Date.now();
      const updatedMap = { ...lastActiveMap };
      liveItems.forEach((lp: any) => { if (lp.ready) updatedMap[lp.name] = now; });
      setLastActiveMap(updatedMap);
      setPaths(configs.filter((p: any) => p.name !== "all_others"));
      setLivePaths(liveItems);
    } catch (e) { console.error("Fetch Error:", e); }
  };

  useEffect(() => {
    fetchPaths();
    const inv = setInterval(fetchPaths, 5000);
    return () => clearInterval(inv);
  }, []);

  const getStatus = (name: string) => {
    const live = livePaths.find(p => p.name === name);
    return { isLive: live?.ready || false, readers: live?.readers?.length || 0 };
  };

  const handleStopRecording = async (pathName: string) => {
    try { await api.deletePath(pathName); fetchPaths(); } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleCreatePath = async () => {
    try { 
      await api.addPath(newPath.name, newPath.source); 
      setIsAddPathDialogOpen(false); 
      setIsQuickAddOpen(false);
      setNewPath({ name: "", source: "publisher", sourceFingerprint: "", sourceOnDemand: false }); 
      fetchPaths(); 
    } catch (err: any) { alert("Create Error: " + err.message); }
  };

  // --- SORTING LOGIC FOR OVERVIEW (Activity Based) ---
  const sortedOverviewPaths = [...paths].sort((a, b) => {
    const statA = getStatus(a.name); const statB = getStatus(b.name);
    if (statA.isLive && !statB.isLive) return -1;
    if (!statA.isLive && statB.isLive) return 1;
    return (lastActiveMap[b.name] || 0) - (lastActiveMap[a.name] || 0) || a.name.localeCompare(b.name);
  });

  // --- SORTING LOGIC FOR PATHS TAB (Oldest Date Suffix First) ---
  const sortedPathsTab = [...paths].sort((a, b) => {
    const dateA = a.name.split('_').pop() || "";
    const dateB = b.name.split('_').pop() || "";
    if (/^\d{8}$/.test(dateA) && /^\d{8}$/.test(dateB)) {
      return dateA.localeCompare(dateB); // Oldest string (earliest date) first
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300 selection:bg-[#58a6ff]/30`}>
      {/* HEADER */}
      <div className={`border-b ${theme.header} px-8 py-5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md`}>
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600 rounded-lg shadow-blue-500/20 shadow-lg">
            <Radio className="text-white w-6 h-6 animate-pulse" />
          </div>
          <h1 className={`text-xl font-black tracking-tighter uppercase ${theme.text}`}>MediaMTX <span className="text-[#58a6ff]">Matrix</span></h1>
        </div>
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className={`${theme.textMuted} hover:text-white`}>
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
          </Button>
          <Badge variant="outline" className={`${theme.border} text-[#58a6ff] font-mono px-4 py-1.5 uppercase tracking-widest text-[11px] font-bold`}>NODE: {serverIP}</Badge>
          <Button size="sm" variant="ghost" className={theme.textMuted} onClick={() => { clearAuth(); router.push("/login"); }}><LogOut size={18} /></Button>
        </div>
      </div>

      <div className="container mx-auto px-8 py-10 max-w-7xl">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className={`bg-transparent border-b ${theme.border} w-full flex justify-start rounded-none h-14 p-0 gap-10`}>
            {["overview", "recording", "server", "paths", "auth", "monitoring"].map(tab => (
              <TabsTrigger 
                key={tab} 
                value={tab} 
                className={`rounded-none border-b-2 border-transparent data-[state=active]:${theme.tabActive} bg-transparent px-2 h-full uppercase text-[12px] font-black tracking-widest transition-all duration-300`}
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview">
            <Card className={`${theme.card} shadow-2xl rounded-2xl overflow-hidden border-none`}>
              <CardHeader className={`flex flex-row items-center justify-between border-b ${theme.header} py-6 px-8`}>
                <CardTitle className={`text-sm font-black uppercase tracking-widest ${theme.text}`}>Active Stream Matrix</CardTitle>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff] hover:text-white font-bold h-10 px-6 transition-all"
                    onClick={() => window.open(`http://${serverIP}:7000/`, "_blank")}
                  >
                    <LayoutGrid size={18} className="mr-2" /> Frigate Cameras
                  </Button>

                   <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
                    <DialogTrigger asChild><Button size="sm" className="bg-[#238636] hover:bg-[#2ea043] text-white border-none shadow-lg px-6 font-bold h-10"><Plus size={18} className="mr-2" /> Quick Add</Button></DialogTrigger>
                    <DialogContent className={`${theme.card} ${theme.text}`}>
                      <DialogHeader><DialogTitle className={theme.text}>Quick Publisher Add</DialogTitle></DialogHeader>
                      <div className="py-4 space-y-4">
                        <Label className="text-[#768390] uppercase text-[10px] font-bold">Path Name / Stream ID</Label>
                        <Input placeholder="e.g. drone_front" className={`${theme.input} h-12 text-lg`} value={newPath.name} onChange={e => setNewPath({...newPath, name: e.target.value})} />
                      </div>
                      <DialogFooter><Button onClick={handleCreatePath} className="bg-[#238636] w-full text-white h-12 font-black text-lg">CREATE STREAM</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={fetchPaths} size="sm" variant="outline" className={`${theme.border} hover:bg-slate-700 h-10`}><RefreshCw size={16} className={theme.text} /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {sortedOverviewPaths.map(p => {
                  const s = getStatus(p.name);
                  const isFrigate = p.name.startsWith("frigate_");
                  let accentClass = s.isLive ? (isFrigate ? "border-l-4 border-l-[#58a6ff] bg-[#58a6ff]/10" : "border-l-4 border-l-[#cf222e] bg-[#cf222e]/10") : "bg-[#2d333b]/40";
                  
                  return (
                    <div key={p.name} className={`flex items-center justify-between p-5 border ${theme.border} rounded-xl shadow-sm transition-all hover:scale-[1.005] ${accentClass}`}>
                      <div className="flex items-center gap-6">
                        <div className={`p-3 rounded-full ${s.isLive ? (isFrigate ? 'bg-[#58a6ff]/20 text-[#58a6ff]' : 'bg-[#cf222e]/20 text-[#cf222e]') : 'bg-slate-700 text-slate-500'}`}>
                          <VideoIcon size={24} />
                        </div>
                        <div>
                          <div className={`font-black text-lg flex items-center gap-3 tracking-tight ${theme.text}`}>
                            {p.name} 
                            {s.isLive && <Badge className={`${isFrigate ? 'bg-[#1f6feb]' : 'bg-[#cf222e]'} text-white`}>LIVE</Badge>}
                            
                            {/* --- EXPIRY LOGIC --- */}
                            {(() => {
                              const parts = p.name.split('_');
                              const dateStr = parts[parts.length - 1];
                              if (!/^\d{8}$/.test(dateStr)) return null;

                              const year = parseInt(dateStr.substring(0, 4));
                              const month = parseInt(dateStr.substring(4, 6)) - 1;
                              const day = parseInt(dateStr.substring(6, 8));
                              
                              const created = new Date(year, month, day);
                              const diffDays = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 3600 * 24));
                              const daysLeft = 8 - diffDays;

                              if (daysLeft <= 5) {
                                return (
                                  <Badge className="ml-2 bg-orange-600 text-white animate-pulse border-none font-black uppercase tracking-wider px-3 shadow-lg shadow-orange-900/20">
                                    {daysLeft <= 0 ? "WILL BE DELETED SOON" : `WILL BE DELETED IN ${daysLeft} DAYS`}
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className={`text-[11px] font-mono uppercase tracking-tighter ${theme.textMuted} mt-1`}>{p.source || "awaiting publisher ingest"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!isFrigate && <FrigateDropdown sourceStreamName={p.name} onSuccess={fetchPaths} theme={theme} />}
                        {isFrigate && s.isLive && (
                          <Button variant="destructive" size="sm" onClick={() => handleStopRecording(p.name)} className="bg-[#cf222e] hover:bg-[#a61b25] h-9 text-[11px] font-black px-4 shadow-lg shadow-red-900/20">STOP REC</Button>
                        )}
                        <div className="flex bg-[#22272e] p-1 rounded-lg border border-[#444c56]/50 gap-1.5 shadow-inner">
                          <StreamUrlButton protocol="SRT" pathName={p.name} ip={serverIP} theme={theme} />
                          <StreamUrlButton protocol="RTMP" pathName={p.name} ip={serverIP} theme={theme} />
                          <StreamUrlButton protocol="RTSP" pathName={p.name} ip={serverIP} theme={theme} />
                        </div>
                        <Button size="sm" variant="outline" className={`${theme.border} hover:bg-[#58a6ff]/20`} onClick={() => setSelectedStream(selectedStream === p.name ? null : p.name)}><Eye size={18} className="text-[#58a6ff]" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10" onClick={() => api.deletePath(p.name).then(fetchPaths)}><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: RECORDING (FRIGATE BRIDGE) */}
          <TabsContent value="recording">
             <Card className={`${theme.card} rounded-2xl shadow-2xl border-none`}>
               <CardHeader className={`border-b ${theme.header} py-6 px-8`}><CardTitle className={`text-md font-black uppercase tracking-widest ${theme.text}`}>Active Frigate Bridge Sessions</CardTitle></CardHeader>
               <CardContent className="p-10 space-y-6">
                {paths.filter(p => getStatus(p.name).isLive && p.name.startsWith("frigate_")).length === 0 ? (
                  <div className={`text-center py-24 ${theme.textMuted} text-lg italic border-2 border-dashed ${theme.border} rounded-3xl`}>No active stream routes bridged to Frigate NVR.</div>
                ) : (
                  paths.filter(p => getStatus(p.name).isLive && p.name.startsWith("frigate_")).map(p => (
                    <div key={p.name} className={`flex items-center justify-between p-8 border ${theme.border} rounded-3xl bg-[#1f6feb]/5 shadow-lg`}>
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-[#58a6ff] text-2xl uppercase tracking-tighter drop-shadow-sm">{p.name}</span>
                        <span className="text-[10px] text-[#768390] uppercase font-black tracking-widest">NVR Feed Status: Healthy / Transmitting</span>
                      </div>
                      <div className="flex gap-4">
                        <Button size="lg" variant="outline" className={`bg-[#22272e] ${theme.border} text-white h-14 px-10 rounded-2xl hover:bg-slate-700 font-bold`} onClick={() => window.open(`http://${serverIP}:7000/#${p.name}`, "_blank")}>
                          <Eye size={24} className="mr-3 text-[#58a6ff]" /> Open Frigate View
                        </Button>
                        <Button variant="destructive" size="lg" onClick={() => handleStopRecording(p.name)} className="bg-[#cf222e] hover:bg-[#a61b25] h-14 px-10 rounded-2xl font-black shadow-xl shadow-red-900/40">STOP BRIDGE</Button>
                      </div>
                    </div>
                  ))
                )}
             </CardContent></Card>
          </TabsContent>

          {/* TAB 3: SERVER ENGINE */}
          <TabsContent value="server">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={`${theme.card} border-none shadow-xl`}>
                <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Settings size={16} /> Protocol Engine</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(config).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="capitalize font-bold text-md tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</Label>
                      <Switch checked={!!val} className="data-[state=checked]:bg-[#238636]" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className={`${theme.card} border-none shadow-xl`}>
                <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Activity size={16} /> Hardware Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-8 py-10">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase"><span>CPU Load</span><span className="text-green-500">14%</span></div>
                    <div className="w-full bg-[#22272e] h-2 rounded-full overflow-hidden shadow-inner"><div className="bg-[#238636] h-full w-[14%]" /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase"><span>Memory Usage</span><span className="text-[#58a6ff]">1.2GB / 4GB</span></div>
                    <div className="w-full bg-[#22272e] h-2 rounded-full overflow-hidden shadow-inner"><div className="bg-[#58a6ff] h-full w-[30%]" /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase"><span>Storage</span><span className="text-orange-500">82GB Free</span></div>
                    <div className="w-full bg-[#22272e] h-2 rounded-full overflow-hidden shadow-inner"><div className="bg-orange-500 h-full w-[65%]" /></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: PATH CONFIGURATIONS */}
          <TabsContent value="paths">
            <Card className={`${theme.card} border-none shadow-xl overflow-hidden`}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#444c56]/30 pb-6 px-8">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Database size={16} className="text-[#58a6ff]" /> Global Path Catalog (Oldest First)
                </CardTitle>
                <Button size="sm" onClick={() => setIsAddPathDialogOpen(true)} className="bg-[#58a6ff] hover:bg-[#1f6feb] text-white font-bold h-10 px-6">
                  <Plus size={16} className="mr-2" /> New Global Path
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <table className="w-full text-left border-collapse">
                    <thead className={`text-[10px] uppercase font-black ${theme.textMuted} bg-[#22272e]/50`}>
                      <tr>
                        <th className="px-8 py-5 border-b border-[#444c56]/30">Stream Name / Expiry Label</th>
                        <th className="px-8 py-5 border-b border-[#444c56]/30">Ingest Source</th>
                        <th className="px-8 py-5 border-b border-[#444c56]/30">Type</th>
                        <th className="px-8 py-5 border-b border-[#444c56]/30 text-right">Life Extensions / Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {sortedPathsTab.map(p => {
                        const status = getStatus(p.name);
                        return (
                          <tr key={p.name} className={`border-b border-[#444c56]/20 hover:bg-[#58a6ff]/5 transition-colors group`}>
                            <td className="px-8 py-5 font-bold flex flex-col gap-1">
                              {p.name}
                              <div className="flex gap-2">
                                {status.isLive ? <Badge className="bg-green-500/20 text-green-500 border-none text-[9px] px-2 h-4">ACTIVE</Badge> : <Badge className="bg-slate-500/20 text-slate-500 border-none text-[9px] px-2 h-4">IDLE</Badge>}
                              </div>
                            </td>
                            <td className="px-8 py-5 font-mono text-[10px] text-[#768390]">{p.source || "publisher"}</td>
                            <td className="px-8 py-5"><Badge variant="outline" className={p.sourceOnDemand ? "text-[#58a6ff] border-[#58a6ff]" : "text-slate-500 border-slate-700"}>{p.sourceOnDemand ? "ON_DEMAND" : "ALWAYS_ON"}</Badge></td>
                            <td className="px-8 py-5 text-right flex justify-end gap-2">
                              {/* --- NEW: +1 YEAR RENEW BUTTON --- */}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                disabled={status.isLive}
                                onClick={() => api.renewPath(p.name, p.source || "publisher").then(fetchPaths)}
                                className={`h-9 border-[#238636] text-[#238636] hover:bg-[#238636] hover:text-white font-black text-[10px] transition-all px-4 ${status.isLive ? 'opacity-30 cursor-not-allowed' : ''}`}
                              >
                                <Sparkles size={14} className="mr-2" /> +1 YEAR LIFE
                              </Button>
                              
                              <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10 h-9 w-9" onClick={() => api.deletePath(p.name).then(fetchPaths)}><Trash2 size={16} /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: AUTHENTICATION */}
          <TabsContent value="auth">
            <Card className={`${theme.card} border-none shadow-xl`}>
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Lock size={16} /> Access Control</CardTitle></CardHeader>
              <CardContent className="space-y-8 p-10">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h3 className="font-black text-lg">API Authentication</h3>
                    <p className={`${theme.textMuted} text-xs`}>Restrict access to the MediaMTX API via JWT or Basic Auth.</p>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" className={theme.border}>Rotate Keys</Button>
                      <Badge className="bg-orange-500">SECURITY: HIGH</Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-black text-lg">Path Permissions</h3>
                    <div className="p-4 bg-[#22272e] rounded-xl border border-[#444c56] font-mono text-[10px]">
                      Default: Read(All) / Write(Admin)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: MONITORING & STATS */}
          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className={`${theme.card} p-10 border-none text-center shadow-xl hover:scale-105 transition-transform`}>
                <Activity className="mx-auto text-green-500 mb-4" size={56} />
                <div className="text-4xl font-black">{livePaths.filter(p => p.ready).length}</div>
                <div className="text-[10px] uppercase font-black text-slate-500 mt-2 tracking-widest">Live Ingests</div>
              </Card>
              <Card className={`${theme.card} p-10 border-none text-center shadow-xl hover:scale-105 transition-transform`}>
                <Globe className="mx-auto text-blue-500 mb-4" size={56} />
                <div className="text-4xl font-black">{livePaths.reduce((acc, p) => acc + (p.readers?.length || 0), 0)}</div>
                <div className="text-[10px] uppercase font-black text-slate-500 mt-2 tracking-widest">Active Readers</div>
              </Card>
              <Card className={`${theme.card} p-10 border-none text-center shadow-xl hover:scale-105 transition-transform`}>
                <Clock className="mx-auto text-purple-500 mb-4" size={56} />
                <div className="text-4xl font-black">99.9%</div>
                <div className="text-[10px] uppercase font-black text-slate-500 mt-2 tracking-widest">Uptime Index</div>
              </Card>
            </div>
            <Card className={`mt-8 ${theme.card} border-none shadow-xl`}>
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Real-time Bitrate Graph</CardTitle></CardHeader>
              <CardContent className="h-64 flex items-center justify-center italic text-slate-500">
                [ Network Telemetry Visualizer Loading... ]
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* FLOATING PREVIEW PLAYER */}
      {selectedStream && (
        <div className={`fixed bottom-10 right-10 w-[550px] shadow-[0_40px_100px_rgba(0,0,0,0.9)] border-2 border-[#58a6ff]/50 rounded-[40px] overflow-hidden bg-black z-50 animate-in zoom-in-95 duration-500`}>
          <div className={`px-8 py-5 border-b ${theme.border} text-[11px] font-black tracking-[0.2em] flex justify-between items-center text-[#58a6ff] uppercase ${isDark ? 'bg-[#373e47]' : 'bg-white'}`}>
            <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#58a6ff] rounded-full animate-ping" /><span>PREVIEW: {selectedStream}</span></div>
            <button className="bg-black/20 px-4 py-2 rounded-2xl border border-[#444c56] hover:bg-[#cf222e] hover:border-transparent hover:text-white transition-all text-[#f0f6fc]" onClick={() => setSelectedStream(null)}>EXIT MONITOR [X]</button>
          </div>
          <div className="p-1 bg-[#1c2128]"><StreamPlayer pathName={selectedStream} /></div>
        </div>
      )}

      {/* ADD PATH DIALOG */}
      <Dialog open={isAddPathDialogOpen} onOpenChange={setIsAddPathDialogOpen}>
        <DialogContent className={`${theme.card} ${theme.text} border-none`}>
          <DialogHeader><DialogTitle className={theme.text}>Create New Path Configuration</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-xs uppercase font-bold text-slate-500">Path Name</Label><Input value={newPath.name} onChange={e => setNewPath({...newPath, name: e.target.value})} className={theme.input} /></div>
            <div className="space-y-2"><Label className="text-xs uppercase font-bold text-slate-500">Source Type</Label><Input value={newPath.source} onChange={e => setNewPath({...newPath, source: e.target.value})} className={theme.input} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreatePath} className="bg-[#238636] text-white font-bold w-full h-12">Register Path</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <MediaMTXDashboard />
    </ProtectedRoute>
  );
}