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
  VideoIcon, Square, Shield, Activity, Video, Play, Plus, Globe, Moon, Sun
} from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { clearAuth, getUsername } from "@/lib/auth";
import { StreamPlayer } from "@/components/stream-player";
import * as api from "@/lib/mediamtx-api";
import type { PathConfig, Path as LivePath } from "@/lib/mediamtx-api";

// --- THEME TOKENS (GUNMETAL & SILVER) ---
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
    bg: "bg-[#2d333b]", // Gunmetal Slate
    header: "bg-[#22272e] border-[#444c56]",
    card: "bg-[#373e47] border-[#444c56]", // Medium Charcoal
    text: "text-[#f0f6fc]", // Silver
    textMuted: "text-[#adbac7]",
    border: "border-[#444c56]",
    input: "bg-[#22272e] border-[#444c56] text-[#f0f6fc]",
    tabActive: "border-[#58a6ff] text-[#58a6ff]", 
    codeBg: "bg-[#22272e] text-[#58a6ff]",
  }
};

// --- SUB-COMPONENT: FrigateDropdown ---
function FrigateDropdown({ sourceStreamName, onSuccess, theme }: { sourceStreamName: string, onSuccess?: () => void, theme: any }) {
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingSlot, setPendingSlot] = useState("");
  const options = Array.from({ length: 10 }, (_, i) => `frigate_${i + 1}`);

  const handleConfirmLink = async () => {
    setLoading(true);
    const sourceUrl = `rtsp://127.0.0.1:8556/${sourceStreamName}`;
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
        <DialogContent className={`${theme.card} ${theme.text} border-none`}>
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

// --- HELPER: Protocol URL Buttons ---
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

  const sortedPaths = [...paths].sort((a, b) => {
    const statA = getStatus(a.name); const statB = getStatus(b.name);
    if (statA.isLive && !statB.isLive) return -1;
    if (!statA.isLive && statB.isLive) return 1;
    return (lastActiveMap[b.name] || 0) - (lastActiveMap[a.name] || 0) || a.name.localeCompare(b.name);
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

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <Card className={`${theme.card} shadow-2xl rounded-2xl overflow-hidden border-none`}>
              <CardHeader className={`flex flex-row items-center justify-between border-b ${theme.header} py-6 px-8`}>
                <CardTitle className={`text-sm font-black uppercase tracking-widest ${theme.text}`}>Active Stream Matrix</CardTitle>
                <div className="flex gap-3">
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
                {sortedPaths.map(p => {
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
                            {p.name} {s.isLive && <Badge className={`${isFrigate ? 'bg-[#1f6feb]' : 'bg-[#cf222e]'} text-white`}>LIVE</Badge>}
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

          {/* RECORDING TAB */}
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

          {/* SERVER TAB */}
          <TabsContent value="server" className="space-y-8">
            <Card className={`${theme.card} border-[#58a6ff]/30 p-6 rounded-2xl`}>
              <CardHeader className="p-0 pb-6"><CardTitle className={`text-lg font-black ${theme.text} flex items-center gap-3`}><Globe className="text-[#58a6ff]" /> Node Setup</CardTitle></CardHeader>
              <CardContent className="p-0 flex gap-6 items-end">
                <div className="flex-1 space-y-3">
                  <Label className="text-xs uppercase text-[#768390] font-black tracking-widest ml-1">MediaMTX IP Address</Label>
                  <Input value={serverIP} onChange={e => setServerIP(e.target.value)} className={`${theme.input} h-14 text-xl font-mono px-5 rounded-xl border-[#444c56] focus:border-[#58a6ff] shadow-inner`} />
                </div>
                <Button className="bg-[#1f6feb] hover:bg-[#388bfd] text-white font-black h-14 px-12 rounded-xl text-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95">UPDATE NODE</Button>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className={`${theme.card} rounded-2xl shadow-xl`}>
                <CardHeader className={`border-b ${theme.header} py-6 px-8`}><CardTitle className={`text-xs font-black uppercase tracking-widest ${theme.text}`}>System Preferences</CardTitle></CardHeader>
                <CardContent className="space-y-8 p-8">
                  <div className="space-y-3">
                    <Label className="text-[#768390] text-[11px] font-bold uppercase tracking-wider ml-1">Logging Verbosity</Label>
                    <Select value={config.logLevel} onValueChange={v => setConfig({...config, logLevel: v})}>
                      <SelectTrigger className={`${theme.input} h-12 rounded-xl shadow-inner`}><SelectValue /></SelectTrigger>
                      <SelectContent className={`${theme.card} border-[#444c56] text-[#f0f6fc]`}>
                        <SelectItem value="info" className="font-bold">INFO (Standard)</SelectItem>
                        <SelectItem value="error" className="font-bold">ERROR Only</SelectItem>
                        <SelectItem value="debug" className="font-bold">DEBUG (Verbose)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3"><Label className="text-[#768390] text-[10px] font-bold uppercase ml-1">Read Timeout</Label><Input defaultValue="10s" className={`${theme.input} h-12 rounded-xl shadow-inner`} /></div>
                    <div className="space-y-3"><Label className="text-[#768390] text-[10px] font-bold uppercase ml-1">Write Timeout</Label><Input defaultValue="10s" className={`${theme.input} h-12 rounded-xl shadow-inner`} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme.card} rounded-2xl shadow-xl`}>
                <CardHeader className={`border-b ${theme.header} py-6 px-8`}><CardTitle className={`text-xs font-black uppercase tracking-widest ${theme.text}`}>Active Listeners</CardTitle></CardHeader>
                <CardContent className="space-y-4 p-8">
                   {[
                     { label: "RTSP Server", port: "8554", key: "rtsp" },
                     { label: "RTMP Server", port: "1935", key: "rtmp" },
                     { label: "HLS Server", port: "8888", key: "hls" }
                   ].map(proto => (
                     <div key={proto.key} className="flex justify-between items-center p-5 bg-black/20 rounded-2xl border border-[#444c56]/40 shadow-inner">
                       <div className="space-y-0.5">
                         <Label className={`font-bold text-lg ${theme.text}`}>{proto.label}</Label>
                         <p className="text-[10px] text-[#768390] font-black uppercase tracking-tighter">LISTENING ON PORT {proto.port}</p>
                       </div>
                       <Switch checked={(config as any)[proto.key]} onCheckedChange={v => setConfig({...config, [proto.key]: v})} className="data-[state=checked]:bg-[#238636]" />
                     </div>
                   ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PATHS TAB */}
          <TabsContent value="paths">
            <Card className={`${theme.card} rounded-2xl shadow-2xl overflow-hidden border-none`}>
              <CardHeader className={`flex flex-row items-center justify-between border-b ${theme.header} py-6 px-8`}>
                <div><CardTitle className={`text-md font-black uppercase tracking-widest ${theme.text}`}>Stream Path Templates</CardTitle><CardDescription className="text-[#768390] mt-1">Define static camera sources and publishing permissions.</CardDescription></div>
                <Dialog open={isAddPathDialogOpen} onOpenChange={setIsAddPathDialogOpen}>
                  <DialogTrigger asChild><Button className="bg-[#347d39] hover:bg-[#46954a] text-white font-black px-8 h-12 rounded-xl shadow-lg border-none"><Plus size={20} className="mr-2" /> CREATE TEMPLATE</Button></DialogTrigger>
                  <DialogContent className={`${theme.card} ${theme.text} max-w-2xl border-[#444c56] p-0 rounded-3xl overflow-hidden`}>
                    <div className="p-8 bg-[#2d333b]"><DialogHeader><DialogTitle className="text-[#f0f6fc] text-2xl font-black uppercase tracking-tighter">New Path Configuration</DialogTitle></DialogHeader></div>
                    <div className="p-8 space-y-8 bg-[#2d333b]/30">
                      <div className="space-y-3"><Label className="text-[#768390] font-bold uppercase text-[10px] ml-1">Unique Path ID / URL Component</Label><Input className={`${theme.input} h-12 text-lg font-bold rounded-xl`} value={newPath.name} onChange={e => setNewPath({...newPath, name: e.target.value})} /></div>
                      <div className="space-y-3"><Label className="text-[#768390] font-bold uppercase text-[10px] ml-1">Stream Source (e.g., publisher or rtsp://...)</Label><Input className={`${theme.input} h-12 font-mono rounded-xl text-[#58a6ff]`} value={newPath.source} onChange={e => setNewPath({...newPath, source: e.target.value})} /></div>
                      <div className="space-y-3"><Label className="text-[#768390] font-bold uppercase text-[10px] ml-1">Source Fingerprint (Optional)</Label><Input className={`${theme.input} h-12 font-mono rounded-xl opacity-60`} value={newPath.sourceFingerprint} onChange={e => setNewPath({...newPath, sourceFingerprint: e.target.value})} /></div>
                      <div className="flex items-center justify-between p-5 bg-[#2d333b] rounded-2xl border border-[#444c56]/60 shadow-inner"><Label className="text-[#f0f6fc] font-bold">Enable Source On Demand</Label><Switch checked={newPath.sourceOnDemand} onCheckedChange={v => setNewPath({...newPath, sourceOnDemand: v})} className="data-[state=checked]:bg-[#347d39]" /></div>
                    </div>
                    <div className="p-6 bg-[#2d333b] border-t border-[#444c56] flex justify-end">
                      <Button onClick={handleCreatePath} className="bg-[#347d39] hover:bg-[#46954a] text-white px-10 h-14 font-black rounded-2xl w-full text-xl shadow-xl">SAVE TEMPLATE</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {paths.map(p => (
                  <div key={p.name} className={`flex justify-between p-6 border ${theme.border} rounded-2xl bg-black/10 items-center hover:bg-black/20 hover:border-[#58a6ff]/40 transition-all shadow-sm`}>
                    <div className="flex flex-col gap-1">
                      <span className={`font-black text-xl tracking-tighter ${theme.text}`}>{p.name}</span>
                      <span className="text-[11px] font-mono text-[#768390] bg-[#22272e] px-2 py-0.5 rounded border border-[#444c56]/30 self-start">{p.source}</span>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="flex gap-8 text-[11px] font-black uppercase tracking-widest text-[#768390]">
                        <div className="flex flex-col items-center"><span className="text-[8px] opacity-40">ON-DEMAND</span><span className={p.sourceOnDemand ? 'text-emerald-500' : ''}>{String(p.sourceOnDemand)}</span></div>
                        <div className="flex flex-col items-center"><span className="text-[8px] opacity-40">RECORDING</span><span className={p.record ? 'text-red-500' : ''}>{String(p.record)}</span></div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-red-500/40 hover:text-red-500 hover:bg-red-500/10 h-12 w-12 rounded-xl" onClick={() => api.deletePath(p.name).then(fetchPaths)}><Trash2 size={24} /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUTH TAB */}
          <TabsContent value="auth" className="space-y-8">
            <Card className={`${theme.card} rounded-2xl overflow-hidden border-none shadow-xl`}>
              <CardHeader className={`border-b ${theme.header} py-6 px-8`}><CardTitle className={`text-xs font-black uppercase tracking-widest ${theme.text}`}>Global Access Strategy</CardTitle></CardHeader>
              <CardContent className="p-8 pt-10">
                <div className="space-y-3 max-w-lg">
                  <Label className="text-[#768390] font-bold uppercase text-[10px] ml-1">Authentication Provider</Label>
                  <Select defaultValue="internal">
                    <SelectTrigger className={`${theme.input} h-12 rounded-xl shadow-inner`}><SelectValue /></SelectTrigger>
                    <SelectContent className={`${theme.card} border-[#444c56] text-[#f0f6fc]`}><SelectItem value="internal" className="font-bold">Internal Configuration Driver</SelectItem></SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            <Card className={`${theme.card} rounded-2xl shadow-2xl border-none overflow-hidden`}>
              <CardHeader className={`flex justify-between items-center border-b ${theme.header} py-6 px-8`}>
                <CardTitle className={`text-md font-black uppercase tracking-widest ${theme.text}`}>Identity Management</CardTitle>
                <Button size="sm" variant="outline" className={`${theme.border} hover:bg-slate-700 rounded-xl px-6 h-10 font-bold`}><Plus size={16} className="mr-2" /> Add User</Button>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {[
                  { name: "Global Administrator", role: "ROOT / API ACCESS", user: "admin", perms: ["api", "metrics", "pprof", "admin"] },
                  { name: "Default (any)", role: "PUBLISHER / READER", user: "any", perms: ["publish", "read"] }
                ].map(u => (
                  <div key={u.user} className={`p-8 border ${theme.border} rounded-3xl bg-black/10 shadow-inner`}>
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex flex-col gap-1"><h3 className={`font-black text-2xl tracking-tighter uppercase ${theme.text}`}>{u.name}</h3><span className="text-[10px] text-[#768390] font-black uppercase tracking-[0.2em]">{u.role}</span></div>
                      <Badge className="bg-[#58a6ff] px-4 py-1 tracking-widest text-[10px] font-black rounded-lg text-white">VERIFIED</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-[#768390] tracking-widest ml-1">Login Username</Label><Input value={u.user} readOnly className={`${theme.input} h-12 rounded-xl font-bold bg-[#2d333b]/40 border-none shadow-inner`} /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-[#768390] tracking-widest ml-1">Authentication Key</Label><Input type="password" value="******" readOnly className={`${theme.input} h-12 rounded-xl font-bold bg-[#2d333b]/40 border-none shadow-inner`} /></div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-[#444c56]/40">
                      <Label className="text-[10px] font-black uppercase text-[#768390] tracking-widest mb-4 block">Assigned Capability ACLs</Label>
                      <div className="flex gap-3 mt-4">{u.perms.map(p => <Badge key={p} className="bg-slate-700/30 text-[#58a6ff] border border-[#58a6ff]/20 font-mono text-[11px] px-3 py-1 rounded-md">{p}</Badge>)}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MONITORING TAB */}
          <TabsContent value="monitoring" className="space-y-8">
            <div className="grid grid-cols-3 gap-8">
              <Card className={`${theme.card} p-8 rounded-3xl shadow-xl border-none`}><CardHeader className="p-0 pb-4"><CardTitle className="text-[11px] text-[#768390] uppercase font-black tracking-[0.2em]">Compute Utilization</CardTitle></CardHeader><CardContent className="p-0"><div className="text-5xl font-black text-[#58a6ff] tracking-tighter">23.4%</div><div className={`w-full bg-black/20 rounded-full h-2 mt-6 overflow-hidden border ${theme.border} shadow-inner`}><div className="bg-[#58a6ff] h-full rounded-full shadow-[0_0_15px_rgba(88,166,255,0.4)]" style={{ width: "23%" }}></div></div></CardContent></Card>
              <Card className={`${theme.card} p-8 rounded-3xl shadow-xl border-none`}><CardHeader className="p-0 pb-4"><CardTitle className="text-[11px] text-[#768390] uppercase font-black tracking-[0.2em]">Ingest Pulse</CardTitle></CardHeader><CardContent className="p-0"><div className="text-5xl font-black text-[#347d39] tracking-tighter">{livePaths.filter(p=>p.ready).length}</div><p className="text-[11px] mt-4 font-black uppercase text-[#768390] tracking-widest">Active publishers online</p></CardContent></Card>
              <Card className={`${theme.card} p-8 rounded-3xl shadow-xl border-none`}><CardHeader className="p-0 pb-4"><CardTitle className="text-[11px] text-[#768390] uppercase font-black tracking-[0.2em]">Network Outbound</CardTitle></CardHeader><CardContent className="p-0"><div className="text-5xl font-black text-[#cf222e] tracking-tighter">45.2 MB/s</div><p className="text-[11px] mt-4 font-black uppercase text-[#768390] tracking-widest">Readers: {livePaths.reduce((a,c)=>a+(c.readers?.length||0), 0)}</p></CardContent></Card>
            </div>
            <Card className={`${theme.card} border-none rounded-3xl overflow-hidden shadow-2xl`}>
              <CardHeader className={`px-10 py-6 border-b ${theme.header} bg-black/10`}><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-4">Node Telemetry Broadcast Log <Badge className="bg-[#347d39] text-[10px] px-3 animate-pulse border-none text-white">LIVE FEED</Badge></CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className={`h-96 w-full p-10 text-[12px] font-mono leading-relaxed bg-[#1c2128] shadow-inner`}>
                  <div className="text-[#58a6ff] font-bold">[HANDSHAKE] UI protocol linked to master node at {serverIP}</div>
                  <div className="text-[#768390] mt-1 font-bold">[VERSION] Running MediaMTX Matrix Pro v3.4.0-Stable</div>
                  <Separator className="my-6 opacity-10" />
                  {livePaths.map(p => <div key={p.name} className="text-[#347d39] mt-2 font-bold">[INGEST] Stream route '{p.name}' verified. Transmitting to {getStatus(p.name).readers} readers.</div>)}
                  <div className="text-white/5 animate-pulse mt-8 select-none tracking-widest">_ scanning heartbeat...</div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* PREVIEW MODAL */}
      {selectedStream && (
        <div className={`fixed bottom-10 right-10 w-[550px] shadow-[0_40px_100px_rgba(0,0,0,0.9)] border-2 border-[#58a6ff]/50 rounded-[40px] overflow-hidden bg-black z-50 animate-in zoom-in-95 duration-500`}>
          <div className={`px-8 py-5 border-b ${theme.border} text-[11px] font-black tracking-[0.2em] flex justify-between items-center text-[#58a6ff] uppercase ${isDark ? 'bg-[#373e47]' : 'bg-white'}`}>
            <div className="flex items-center gap-3"><div className="w-2 h-2 bg-[#58a6ff] rounded-full animate-ping" /><span>PREVIEW: {selectedStream}</span></div>
            <button className="bg-black/20 px-4 py-2 rounded-2xl border border-[#444c56] hover:bg-[#cf222e] hover:border-transparent hover:text-white transition-all text-[#f0f6fc]" onClick={() => setSelectedStream(null)}>EXIT MONITOR [X]</button>
          </div>
          <div className="p-1 bg-[#1c2128]"><StreamPlayer pathName={selectedStream} /></div>
          <div className={`p-6 flex justify-center border-t ${theme.border} ${isDark ? 'bg-[#373e47]' : 'bg-slate-50'}`}>
            <Badge variant="outline" className="text-[#347d39] border-[#347d39]/30 font-mono text-[11px] uppercase tracking-widest px-4 py-1">H.264 PASSTHROUGH / ZERO-COPY LINK ACTIVE</Badge>
          </div>
        </div>
      )}
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