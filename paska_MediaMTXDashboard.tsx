import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Server,
  Users,
  Video,
  Shield,
  Activity,
  Play,
  Radio,
  Globe,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Monitor,
  LogOut,
  Edit,
  VideoIcon,
} from "lucide-react"
import { clearAuth, getUsername } from "@/lib/auth"
import { StreamPlayer } from "@/components/stream-player"
import { CopyUrlButton } from "./CopyUrlButton"
import * as api from "@/lib/mediamtx-api"
import type { PathConfig, Path as LivePath } from "@/lib/mediamtx-api"

export default function MediaMTXDashboard() {
  // Tooltip state for copy URL button (must be inside the component)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  // State for Create SRT dialog
  const [isCreateSRTDialogOpen, setIsCreateSRTDialogOpen] = useState(false);
  const [srtStreamId, setSrtStreamId] = useState("");
  const [isCreatingSRT, setIsCreatingSRT] = useState(false);
  // State for Create RTMP dialog
  const [isCreateRTMPDialogOpen, setIsCreateRTMPDialogOpen] = useState(false);
  const [rtmpStreamName, setRtmpStreamName] = useState("");
  const [isCreatingRTMP, setIsCreatingRTMP] = useState(false);
  // State for Create RTSP dialog
  const [isCreateRTSPDialogOpen, setIsCreateRTSPDialogOpen] = useState(false);
  const [rtspStreamName, setRtspStreamName] = useState("");
  const [isCreatingRTSP, setIsCreatingRTSP] = useState(false);

  const handleCreateRTSP = async () => {
    if (!rtspStreamName) return;
    setIsCreatingRTSP(true);
    try {
      await api.addPath({
        name: rtspStreamName,
        source: "publisher",
        overridePublisher: true,
      });
      await fetchPaths();
      setIsCreateRTSPDialogOpen(false);
      setRtspStreamName("");
    } catch (err: any) {
      alert("Failed to create RTSP path: " + (err?.message || err));
    } finally {
      setIsCreatingRTSP(false);
    }
  };

  const handleCreateRTMP = async () => {
    if (!rtmpStreamName) return;
    setIsCreatingRTMP(true);
    try {
      await api.addPath({
        name: rtmpStreamName,
        source: "publisher",
        overridePublisher: true,
      });
      await fetchPaths();
      setIsCreateRTMPDialogOpen(false);
      setRtmpStreamName("");
    } catch (err: any) {
      alert("Failed to create RTMP path: " + (err?.message || err));
    } finally {
      setIsCreatingRTMP(false);
    }
  };

  // Handler for creating SRT path (API integration can be added here)
  const handleCreateSRT = async () => {
    if (!srtStreamId) return;
    setIsCreatingSRT(true);
    try {
      // Actually create the SRT path using the API
      await api.addPath({
        name: srtStreamId,
        source: "publisher",
        overridePublisher: true,
      });
      await fetchPaths();
      setIsCreateSRTDialogOpen(false);
      setSrtStreamId("");
    } catch (err: any) {
      alert("Failed to create SRT path: " + (err?.message || err));
    } finally {
      setIsCreatingSRT(false);
    }
  };
  const router = useRouter();
  const username = getUsername();

  const [config, setConfig] = useState({
    logLevel: "info",
    rtsp: true,
    rtspAddress: ":8554",
    rtmp: true,
    rtmpAddress: ":1935",
    hls: true,
    hlsAddress: ":8888",
    webrtc: true,
    webrtcAddress: ":8889",
    api: false,
    apiAddress: ":9997",
    metrics: false,
    metricsAddress: ":9998",
  })

  const [paths, setPaths] = useState<PathConfig[]>([])
  const [livePaths, setLivePaths] = useState<LivePath[]>([])
  const [isLoadingPaths, setIsLoadingPaths] = useState(false)
  const [selectedStreamPath, setSelectedStreamPath] = useState<string | null>(null)
  const [editingPath, setEditingPath] = useState<PathConfig | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [pathToDelete, setPathToDelete] = useState<string | null>(null)

  const [isAddPathDialogOpen, setIsAddPathDialogOpen] = useState(false)
  const [newPath, setNewPath] = useState({
    name: "",
    source: "",
    sourceFingerprint: "",
    sourceOnDemand: true,
    record: false,
    recordPath: "./recordings/%path/%Y-%m-%d_%H-%M-%S-%f",
    recordFormat: "fmp4",
    recordPartDuration: "1s",
    recordSegmentDuration: "1h",
    recordDeleteAfter: "0s",
    maxReaders: 0,
    overridePublisher: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchPaths = async () => {
    setIsLoadingPaths(true)
    try {
      const [configs, live] = await Promise.all([api.getPathConfigs(), api.getPaths()])
      setPaths(configs.filter((p) => p.name !== "all_others"))
      setLivePaths(live)
    } catch (error) {
      console.error("Error fetching paths:", error)
      alert("Failed to load paths")
    } finally {
      setIsLoadingPaths(false)
    }
  }

  useEffect(() => {
    fetchPaths()
    const interval = setInterval(fetchPaths, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const handleEditPath = async (path: PathConfig) => {
    setEditingPath(path)
    setIsEditDialogOpen(true)
  }

  const handleUpdatePath = async () => {
    if (!editingPath) return

    setIsSubmitting(true)
    try {
      await api.updatePath(editingPath.name, editingPath)
      await fetchPaths()
      setIsEditDialogOpen(false)
      setEditingPath(null)
      alert("Path updated successfully!")
    } catch (error) {
      console.error("Error updating path:", error)
      alert(`Failed to update path: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePath = async () => {
    if (!pathToDelete) return

    setIsSubmitting(true)
    try {
      await api.deletePath(pathToDelete)
      await fetchPaths()
      setIsDeleteDialogOpen(false)
      setPathToDelete(null)
      alert("Path deleted successfully!")
    } catch (error) {
      console.error("Error deleting path:", error)
      alert(`Failed to delete path: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = (pathName: string) => {
    setPathToDelete(pathName)
    setIsDeleteDialogOpen(true)
  }

  const getPathStatus = (pathName: string) => {
    const livePath = livePaths.find((p) => p.name === pathName);
    return {
      isLive: livePath?.ready || false,
      source: livePath?.source ?? null,
      readers: livePath?.readers.length || 0,
      bytesReceived: livePath?.bytesReceived || 0,
      bytesSent: livePath?.bytesSent || 0,
    };
  };

  const handleLogout = () => {
    clearAuth()
    router.push("/login")
  }

  const handleAddPath = async () => {
    if (!newPath.name) {
      alert("Please enter a path name");
      return;
    }
    if (!newPath.source) {
      alert("Please enter a source URL");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.addPath(newPath as PathConfig);
      await fetchPaths();
      // Reset form and close dialog
      setNewPath({
        name: "",
        source: "",
        sourceFingerprint: "",
        sourceOnDemand: true,
        record: false,
        recordPath: "./recordings/%path/%Y-%m-%d_%H-%M-%S-%f",
        recordFormat: "fmp4",
        recordPartDuration: "1s",
        recordSegmentDuration: "1h",
        recordDeleteAfter: "0s",
        maxReaders: 0,
        overridePublisher: true,
      });
      setIsAddPathDialogOpen(false);
      alert("Path added successfully!");
    } catch (error) {
      console.error("Error adding path:", error);
      alert(`Error adding path: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStreamsCount = livePaths.filter((p) => p.ready).length;
  const totalViewers = livePaths.reduce((sum, p) => sum + p.readers.length, 0);

  // Helper to generate sender URL for each stream
  function getSenderUrl(path: PathConfig) {
    const apiUrl = process.env.NEXT_PUBLIC_MEDIAMTX_API_URL || "http://192.168.8.23:9997";
    const base = apiUrl.replace(/:\d+.*/, '');
    // If the path was created via the RTMP dialog, show RTMP URL
    // Heuristic: if the path name is in the list of RTMP dialog-created names, or if the user is on the RTMP dialog, or if the user clicks copy from the RTMP dialog, show RTMP URL
    // Simpler: if the path name matches a known RTMP stream name, or if the user just created it as RTMP, or if the user clicks copy from the RTMP dialog, show RTMP URL
    // But since we can't know that from here, let's use a convention: if the path name is in the list of paths and the user just created it as RTMP, or if the user clicks copy from the RTMP dialog, show RTMP URL
    // Instead, let's check if the path.source is 'publisher' and the path name matches a known RTMP stream name (from state)
    // We'll add a set of RTMP stream names in state and check here
    if (path.source === 'publisher') {
      if (rtmpStreamName && path.name === rtmpStreamName) {
        // This is the RTMP stream the user just created
        return `rtmp://${base}:1935/${path.name}`;
      }
      // Otherwise, default to SRT
      return `srt://${base}:8890?streamid=publish:${path.name}`;
    }
    if (typeof path.source === 'string' && path.source.startsWith('rtmp://')) {
      // RTMP push
      return `rtmp://${base}:1935/${path.name}`;
    }
    if (typeof path.source === 'string' && path.source.startsWith('rtsp://')) {
      // RTSP push
      return `rtsp://${base}:8554/${path.name}`;
    }
    // Fallback: just show the path name
    return path.name;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">MediaMTX Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">{username}</span>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>
      <Tabs defaultValue="streams" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="streams">Streams</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="paths">Paths</TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>
        {/* Streams Tab */}
        <TabsContent value="streams" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
                <Radio className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeStreamsCount}</div>
                <p className="text-xs text-muted-foreground">Currently live</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViewers}</div>
                <p className="text-xs text-muted-foreground">Across all streams</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paths</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paths.length}</div>
                <p className="text-xs text-muted-foreground">Configured paths</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Server Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Online</div>
                <p className="text-xs text-muted-foreground">Running smoothly</p>
              </CardContent>
            </Card>
          </div>

          {/* Create Stream Area */}
          <div className="my-6">
            <Card>
              <CardHeader>
                <CardTitle>Create stream</CardTitle>
                <CardDescription>Create a new stream receiver (SRT, RTMP, RTSP)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <button
                    className="px-4 py-2 rounded transition text-gray-900"
                    style={{ backgroundColor: '#DBEAFE' }}
                    onClick={() => setIsCreateSRTDialogOpen(true)}
                  >
                    Create SRT
                  </button>
                  <button
                    className="px-4 py-2 rounded transition text-gray-900"
                    style={{ backgroundColor: '#FDE68A' }}
                    onClick={() => setIsCreateRTMPDialogOpen(true)}
                  >
                    Create RTMP
                  </button>
                  <button
                    className="px-4 py-2 rounded transition text-gray-900"
                    style={{ backgroundColor: '#C7F9CC' }}
                    onClick={() => setIsCreateRTSPDialogOpen(true)}
                  >
                    Create RTSP
                  </button>
                </div>
                {/* RTSP Dialog */}
                {isCreateRTSPDialogOpen && (
                  <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'transparent' }}>
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                      <h2 className="text-lg font-semibold mb-4">Create RTSP Stream</h2>
                      <label className="block mb-2 font-medium">Stream Name</label>
                      <input
                        className="w-full border rounded px-3 py-2 mb-4"
                        type="text"
                        value={rtspStreamName}
                        onChange={e => setRtspStreamName(e.target.value)}
                        placeholder="Enter stream name (e.g. myrtspstream)"
                        disabled={isCreatingRTSP}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                          onClick={() => { setIsCreateRTSPDialogOpen(false); setRtspStreamName("") }}
                          disabled={isCreatingRTSP}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          onClick={handleCreateRTSP}
                          disabled={!rtspStreamName || isCreatingRTSP}
                        >
                          {isCreatingRTSP ? "Creating..." : "Create RTSP"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SRT Dialog */}
                {isCreateSRTDialogOpen && (
                  <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'transparent' }}>
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                      <h2 className="text-lg font-semibold mb-4">Create SRT Stream</h2>
                      <label className="block mb-2 font-medium">Stream ID</label>
                      <input
                        className="w-full border rounded px-3 py-2 mb-4"
                        type="text"
                        value={srtStreamId}
                        onChange={e => setSrtStreamId(e.target.value)}
                        placeholder="Enter stream ID (e.g. markusstream)"
                        disabled={isCreatingSRT}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                          onClick={() => { setIsCreateSRTDialogOpen(false); setSrtStreamId("") }}
                          disabled={isCreatingSRT}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={handleCreateSRT}
                          disabled={!srtStreamId || isCreatingSRT}
                        >
                          {isCreatingSRT ? "Creating..." : "Create SRT"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* RTMP Dialog */}
                {isCreateRTMPDialogOpen && (
                  <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'transparent' }}>
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                      <h2 className="text-lg font-semibold mb-4">Create RTMP Stream</h2>
                      <label className="block mb-2 font-medium">Stream Name</label>
                      <input
                        className="w-full border rounded px-3 py-2 mb-4"
                        type="text"
                        value={rtmpStreamName}
                        onChange={e => setRtmpStreamName(e.target.value)}
                        placeholder="Enter stream name (e.g. myrtmpstream)"
                        disabled={isCreatingRTMP}
                      />
                      <div className="mb-2 text-xs text-gray-600">
                        RTMP ingest URL: <span className="font-mono">rtmp://192.168.8.23/{rtmpStreamName || 'yourstream'}</span>
                        <button
                          className="ml-2 px-2 py-1 text-xs border rounded"
                          onClick={async () => {
                            const url = `rtmp://192.168.8.23/${rtmpStreamName || 'yourstream'}`;
                            await navigator.clipboard.writeText(url);
                          }}
                          disabled={!rtmpStreamName}
                        >Copy</button>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                          onClick={() => { setIsCreateRTMPDialogOpen(false); setRtmpStreamName("") }}
                          disabled={isCreatingRTMP}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                          onClick={handleCreateRTMP}
                          disabled={!rtmpStreamName || isCreatingRTMP}
                        >
                          {isCreatingRTMP ? "Creating..." : "Create RTMP"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Streams</CardTitle>
              <CardDescription>Currently active streaming paths and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPaths ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                  <p className="text-sm text-gray-600">Loading streams...</p>
                </div>
              ) : paths.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <VideoIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No paths configured</p>
                  <Button className="mt-4" onClick={() => setIsAddPathDialogOpen(true)}>
                    Add Your First Path
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {paths.map((path) => {
                    const status = getPathStatus(path.name)
                    return (
                      <div key={path.name} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                              <VideoIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{path.name}</h3>
                                {status.isLive && (
                                  <Badge variant="default" className="bg-red-500">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
                                    LIVE
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{path.source}</p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span>{status.readers} viewers</span>
                                {status.isLive && (
                                  <>
                                    <span>↓ {(status.bytesReceived / 1024 / 1024).toFixed(2)} MB</span>
                                    <span>↑ {(status.bytesSent / 1024 / 1024).toFixed(2)} MB</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Small Copy URL button with tooltip on mouseover */}
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                style={{ fontSize: '0.75rem', height: '2rem', minHeight: '2rem', padding: '0 12px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onMouseEnter={e => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltip({
                                    visible: true,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                    text: getSenderUrl(path)
                                  });
                                }}
                                onMouseLeave={() => {
                                  if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
                                  tooltipTimeout.current = setTimeout(() => setTooltip(t => ({ ...t, visible: false })), 100);
                                }}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const url = getSenderUrl(path);
                                  try {
                                    await navigator.clipboard.writeText(url);
                                  } catch (err) {
                                    alert("Copy to clipboard failed. Please copy manually:\n" + url);
                                  }
                                }}
                              >
                                copy URL
                              </button>
                              {tooltip.visible && tooltip.text === getSenderUrl(path) && (
                                <div
                                  style={{
                                    position: 'fixed',
                                    left: tooltip.x,
                                    top: tooltip.y - 36, // show above the mouse/button
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(30,30,30,0.97)',
                                    color: '#fff',
                                    padding: '4px 12px',
                                    borderRadius: 4,
                                    fontSize: 13,
                                    pointerEvents: 'none',
                                    zIndex: 9999,
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                  }}
                                >
                                  {tooltip.text}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedStreamPath(selectedStreamPath === path.name ? null : path.name)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditPath(path)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => confirmDelete(path.name)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        {selectedStreamPath === path.name && status.isLive && (
                          <div className="px-4 pb-4">
                            <StreamPlayer pathName={path.name} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Server Tab */}
        <TabsContent value="server">
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">Server Info</h2>
            <p>Server status, version, and configuration details will appear here.</p>
          </div>
        </TabsContent>
        {/* Paths Tab */}
        <TabsContent value="paths">
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">Paths</h2>
            <p>Manage and view all configured paths here.</p>
          </div>
        </TabsContent>
        {/* Auth Tab */}
        <TabsContent value="auth">
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">Authentication</h2>
            <p>Authentication and user management will be available here.</p>
          </div>
        </TabsContent>
        {/* Recording Tab */}
        <TabsContent value="recording">
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">Recording</h2>
            <p>Recording settings and recorded streams will be shown here.</p>
          </div>
        </TabsContent>
        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">Monitoring</h2>
            <p>Monitoring dashboards and metrics will be available here.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Path Dialog */}
      {/* ... (Insert Dialogs and other modals here, as in page.tsx) ... */}
    </div>
  );
}
