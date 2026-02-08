import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { ProtectedRoute } from "@/components/protected-route"
import { clearAuth, getUsername } from "@/lib/auth"
import { StreamPlayer } from "@/components/stream-player"
import * as api from "@/lib/mediamtx-api"
// ...existing code...
function MediaMTXDashboard() {
  // Disk space state for Active Streams card
  const [diskSpace, setDiskSpace] = useState<{ free: number } | null>(null);
  useEffect(() => {
    let ignore = false;
    fetch("http://192.168.8.23:5002/api/diskspace")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!ignore) setDiskSpace(data); })
      .catch(() => { if (!ignore) setDiskSpace(null); });
    return () => { ignore = true; };
  }, []);
  const [livePaths, setLivePaths] = useState<any[]>([]);
  // Additional state declarations to fix missing variables
  const [paths, setPaths] = useState<any[]>([]);
  const [isLoadingPaths, setIsLoadingPaths] = useState(false);
  const [isAddPathDialogOpen, setIsAddPathDialogOpen] = useState(false);
  const [isCreateSRTStreamDialogOpen, setIsCreateSRTStreamDialogOpen] = useState(false);
  const [selectedStreamPath, setSelectedStreamPath] = useState<string | null>(null);
  const [isRefreshingFiles, setIsRefreshingFiles] = useState(false);
  const [pathRecordingFiles, setPathRecordingFiles] = useState<Record<string, any[]>>({});
  const [config, setConfig] = useState<any>({});
  const username = getUsername();

  // Router instance
  const router = useRouter();

  // State for clip/download dialogs
  const [selectedClipPath, setSelectedClipPath] = useState<string | null>(null);
  const [isClipDialogOpen, setIsClipDialogOpen] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

  // Stub for handleUpdatePath (implement as needed)
  const handleUpdatePath = (...args: any[]) => {
    // Implement update logic here
  };

  // Type for StreamPath (fallback if not imported)
  type StreamPath = {
    name: string;
    source: string;
    [key: string]: any;
  };

  // Handler for editing a path
  const handleEditPath = (path: any) => {
    setEditingPath(path);
    setIsEditDialogOpen(true);
  };

  // URL generators (use correct formats and ports)
  // TODO: Replace with dynamic host if needed
  const SERVER_IP = "192.168.8.23";
  const generateSRTUrl = (name: string) => `srt://${SERVER_IP}:8890?streamid=publish:${name}`;
  const generateRTMPUrl = (name: string) => `rtmp://${SERVER_IP}:1935/${name}`;
  const generateRTSPUrl = (name: string) => `rtsp://${SERVER_IP}:8554/${name}`;
  // State for copy feedback
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Clipboard copy handler with feedback
  const handleCopyUrl = (url: string, pathName: string, type: string) => {
    navigator.clipboard.writeText(url);
    setCopiedPath(pathName);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedPath(null);
      setCopiedType(null);
    }, 1200);
  };

  // State for path editing
  const [editingPath, setEditingPath] = useState<StreamPath | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<string | null>(null);
  const [newSRTStreamId, setNewSRTStreamId] = useState("")
  const [isCreatingSRTStream, setIsCreatingSRTStream] = useState(false)
  const [lastActiveTracker, setLastActiveTracker] = useState<{[key: string]: string}>({})
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
      
      // Check for recording files for each path - temporarily disabled due to SSH issues
      // await checkRecordingFiles(live)
    } catch (error) {
      console.error("Error fetching paths:", error)
      alert("Failed to load paths")
    } finally {
      setIsLoadingPaths(false)
    }
  }

  const checkRecordingFiles = async (paths: any[]) => {
    const fileMap: Record<string, any[]> = {}
    
    for (const path of paths) {
      try {
        const response = await fetch(`/api/recording-files/${path.name}`)
        if (response.ok) {
          const files = await response.json()
          fileMap[path.name] = files
        } else {
          fileMap[path.name] = []
        }
      } catch (error) {
        console.log(`Could not check files for ${path.name}:`, error)
        fileMap[path.name] = []
      }
    }
    
    setPathRecordingFiles(fileMap)
  }

  const refreshRecordingFiles = async (streamName: string) => {
    setIsRefreshingFiles(true)
    try {
      const response = await fetch(`/api/recording-files/${streamName}`)
      if (response.ok) {
        const files = await response.json()
        setPathRecordingFiles(prev => ({
          ...prev,
          [streamName]: files
        }))
      }
    } catch (error) {
      console.error(`Failed to refresh files for ${streamName}:`, error)
    } finally {
      setIsRefreshingFiles(false)
    }
  }

  useEffect(() => {
    loadLastActiveTimes()
    fetchPaths()
    const interval = setInterval(fetchPaths, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Load last active times from localStorage
  const loadLastActiveTimes = () => {
    try {
      const saved = localStorage.getItem('mediamtx_last_active')
      if (saved) {
        setLastActiveTracker(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading last active times:', error)
    }
  }

  // Save last active times to localStorage
  const saveLastActiveTimes = (tracker: {[key: string]: string}) => {
    try {
      localStorage.setItem('mediamtx_last_active', JSON.stringify(tracker))
    } catch (error) {
      console.error('Error saving last active times:', error)
    }
  }


  // Delete stream recordings
  // (functionality can be implemented here if needed)

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
    const livePath = livePaths.find((p) => p.name === pathName)
    return {
      isLive: livePath?.ready || false,
      source: livePath?.source?.type || null,
      readers: livePath?.readers.length || 0,
      bytesReceived: livePath?.bytesReceived || 0,
      bytesSent: livePath?.bytesSent || 0,
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push("/login")
  }

  const handleAddPath = async () => {
    if (!newPath.name) {
      alert("Please enter a path name")
      return
    }

    if (!newPath.source) {
      alert("Please enter a source URL")
      return
    }

    setIsSubmitting(true)

    try {
      await api.addPath(newPath as any)
      await fetchPaths()

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
      })
      setIsAddPathDialogOpen(false)
      alert("Path added successfully!")
    } catch (error) {
      console.error("Error adding path:", error)
      alert(`Error adding path: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSRTStream = async () => {
    if (!newSRTStreamId.trim()) {
      alert("Please enter a stream ID")
      return
    }

    setIsCreatingSRTStream(true)

    try {
      const streamConfig: any = {
        name: newSRTStreamId.trim(),
        source: "publisher"
      }
      
      await api.addPath(streamConfig)
      await fetchPaths()

      // Reset form and close dialog
      setNewSRTStreamId("")
      setIsCreateSRTStreamDialogOpen(false)
    } catch (error) {
      console.error("Error creating SRT stream:", error)
      alert(`Error creating SRT stream: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsCreatingSRTStream(false)
    }
  }

  // Update last active times and perform cleanup
  const updateLastActiveAndCleanup = async () => {
    const currentTime = new Date().toISOString()
    const updatedTracker = { ...lastActiveTracker }
    const inactiveDays = 8
    const cutoffTime = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000)
    
    // Update last active times for currently active streams
    livePaths.forEach(path => {
      if (path.ready && path.readyTime) {
        updatedTracker[path.name] = currentTime
      }
    })
    
    // Find streams to delete (inactive for more than 8 days)
    const streamsToDelete: string[] = []
    
    for (const [streamName, lastActive] of Object.entries(updatedTracker)) {
      const lastActiveDate = new Date(lastActive)
      if (lastActiveDate < cutoffTime) {
        // Check if stream still exists and is inactive
        const streamExists = paths.find(p => p.name === streamName)
        const streamActive = livePaths.find(p => p.name === streamName && p.ready)
        
        if (streamExists && !streamActive) {
          streamsToDelete.push(streamName)
        }
      }
    }
    
    // Delete inactive streams
    for (const streamName of streamsToDelete) {
      try {
        console.log(`Cleaning up inactive stream: ${streamName} (inactive since ${updatedTracker[streamName]})`)
        
        // Delete from MediaMTX
        await api.deletePath(streamName)
        
        // Delete recording folder if exists
        await deleteStreamRecordings(streamName)
        
        // Remove from tracker
        delete updatedTracker[streamName]
        
        console.log(`Successfully cleaned up stream: ${streamName}`)
      } catch (error) {
        console.error(`Error cleaning up stream ${streamName}:`, error)
      }
    }
    
    // Update state and save to localStorage
    setLastActiveTracker(updatedTracker)
    saveLastActiveTimes(updatedTracker)
    
    // Refresh data if we deleted anything
    if (streamsToDelete.length > 0) {
      await fetchPaths()
      await fetchPaths()
    }
  }

  // Delete stream recordings
  const deleteStreamRecordings = async (streamName: string) => {
    try {
      const response = await fetch(`/api/recording-files/${streamName}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        console.warn(`Could not delete recordings for ${streamName}: ${response.statusText}`)
      }
    } catch (error) {
      console.warn(`Error deleting recordings for ${streamName}:`, error)
    }
  }

  // Run cleanup check every time live paths update
  useEffect(() => {
    if (livePaths.length > 0) {
      updateLastActiveAndCleanup()
    }
  }, [livePaths])

  // Calculate days before deletion for a stream
  const getDaysBeforeDelete = (streamName: string): { daysLeft: number, message: string, showWarning: boolean } => {
    const lastActive = lastActiveTracker[streamName]
    if (!lastActive) {
      // No tracking data - could be a new stream
      return { daysLeft: 8, message: '', showWarning: false }
    }

    const lastActiveDate = new Date(lastActive)
    const currentTime = new Date()
    const daysSinceActive = Math.floor((currentTime.getTime() - lastActiveDate.getTime()) / (24 * 60 * 60 * 1000))
    const daysLeft = 8 - daysSinceActive

    if (daysLeft <= 0) {
      return { daysLeft: 0, message: 'Will be deleted today', showWarning: true }
    } else if (daysLeft === 1) {
      return { daysLeft: 1, message: 'Will be deleted tomorrow', showWarning: true }
    } else if (daysLeft <= 8) { // For testing, show from 8 days (normally would be 5)
      return { daysLeft: daysLeft, message: `${daysLeft} days before delete`, showWarning: true }
    } else {
      return { daysLeft: daysLeft, message: '', showWarning: false }
    }
  }

  // Replace the activeStreams useState with calculated values
  const activeStreamsCount = livePaths.filter((p) => p.ready).length
  const totalViewers = livePaths.reduce((sum, p) => sum + p.readers.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MediaMTX Dashboard</h1>
                <p className="text-sm text-gray-500">Media streaming server management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Activity className="w-3 h-3 mr-1" />
                Online
              </Badge>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-md">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{username}</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="server" className="flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>Server</span>
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center space-x-2">
              <Video className="w-4 h-4" />
              <span>Paths</span>
            </TabsTrigger>
            <TabsTrigger value="auth" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Auth</span>
            </TabsTrigger>
            <TabsTrigger value="recording" className="flex items-center space-x-2">
              <Play className="w-4 h-4" />
              <span>Recording</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Monitoring</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeStreamsCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeStreamsCount} live, {paths.length - activeStreamsCount} idle
                  </p>
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

            {/* Create Stream */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Stream</CardTitle>
                <CardDescription>
                  Add a new stream publishing endpoint by entering a stream name.<br />
                  You can use this stream name in your sender software (OBS, ffmpeg, etc.) to push video to MediaMTX.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-col md:flex-row">
                  <Button
                    onClick={() => setIsCreateSRTStreamDialogOpen(true)}
                    className="w-full md:w-auto"
                    style={{ backgroundColor: '#DBEAFE', color: '#111' }}
                  >
                    Create new stream
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <CardTitle>Active Streams</CardTitle>
                        <CardDescription>Currently active streaming paths and their status</CardDescription>
                      </div>
                    </div>
                  </div>
                  {diskSpace && (() => {
                    const freeGB = diskSpace.free / 1024 / 1024 / 1024;
                    let badgeClass = "bg-green-100 text-green-700";
                    if (freeGB <= 40 && freeGB > 20) badgeClass = "bg-orange-100 text-orange-700";
                    if (freeGB <= 20 && freeGB > 10) badgeClass = "bg-red-100 text-red-700";
                    if (freeGB <= 10) badgeClass = "bg-red-700 text-white";
                    return (
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${badgeClass}`} title="Free disk space">
                        Free: {freeGB.toFixed(1)} GB
                      </span>
                    );
                  })()}
                </div>
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
                      const deleteInfo = getDaysBeforeDelete(path.name)
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
                                  {deleteInfo.showWarning && (
                                    <Badge 
                                      variant="outline" 
                                      className={`border-orange-500 text-orange-600 ${deleteInfo.daysLeft <= 1 ? 'bg-red-50 border-red-500 text-red-600' : 'bg-orange-50'}`}
                                    >
                                      {deleteInfo.message}
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
                          <div className="px-4 pb-4">
                            <div className="flex gap-2 mb-4">
                              <Button
                                size="sm"
                                variant="outline"
                                style={
                                  copiedPath === path.name && copiedType === 'SRT'
                                    ? { backgroundColor: '#991B1B', color: '#fff' }
                                    : { backgroundColor: '#FEE2E2', color: '#991B1B' }
                                }
                                onClick={() => handleCopyUrl(generateSRTUrl(path.name), path.name, 'SRT')}
                              >
                                {copiedPath === path.name && copiedType === 'SRT' ? 'Copied!' : 'Copy SRT-URL'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                style={
                                  copiedPath === path.name && copiedType === 'RTMP'
                                    ? { backgroundColor: '#92400E', color: '#fff' }
                                    : { backgroundColor: '#FEF9C3', color: '#92400E' }
                                }
                                onClick={() => handleCopyUrl(generateRTMPUrl(path.name), path.name, 'RTMP')}
                              >
                                {copiedPath === path.name && copiedType === 'RTMP' ? 'Copied!' : 'Copy RTMP-URL'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                style={
                                  copiedPath === path.name && copiedType === 'RTSP'
                                    ? { backgroundColor: '#065F46', color: '#fff' }
                                    : { backgroundColor: '#D1FAE5', color: '#065F46' }
                                }
                                onClick={() => handleCopyUrl(generateRTSPUrl(path.name), path.name, 'RTSP')}
                              >
                                {copiedPath === path.name && copiedType === 'RTSP' ? 'Copied!' : 'Copy RTSP-URL'}
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

          <TabsContent value="server" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Basic server configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logLevel">Log Level</Label>
                    <Select
                      value={config.logLevel}
                      onValueChange={(value) => setConfig({ ...config, logLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="readTimeout">Read Timeout</Label>
                    <Input id="readTimeout" defaultValue="10s" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="writeTimeout">Write Timeout</Label>
                    <Input id="writeTimeout" defaultValue="10s" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Protocol Settings</CardTitle>
                  <CardDescription>Enable/disable streaming protocols</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>RTSP Server</Label>
                      <p className="text-sm text-muted-foreground">Real Time Streaming Protocol</p>
                    </div>
                    <Switch
                      checked={config.rtsp}
                      onCheckedChange={(checked) => setConfig({ ...config, rtsp: checked })}
                    />
                  </div>
                  {config.rtsp && (
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="rtspAddress">RTSP Address</Label>
                      <Input
                        id="rtspAddress"
                        value={config.rtspAddress}
                        onChange={(e) => setConfig({ ...config, rtspAddress: e.target.value })}
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>RTMP Server</Label>
                      <p className="text-sm text-muted-foreground">Real Time Messaging Protocol</p>
                    </div>
                    <Switch
                      checked={config.rtmp}
                      onCheckedChange={(checked) => setConfig({ ...config, rtmp: checked })}
                    />
                  </div>
                  {config.rtmp && (
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="rtmpAddress">RTMP Address</Label>
                      <Input
                        id="rtmpAddress"
                        value={config.rtmpAddress}
                        onChange={(e) => setConfig({ ...config, rtmpAddress: e.target.value })}
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>HLS Server</Label>
                      <p className="text-sm text-muted-foreground">HTTP Live Streaming</p>
                    </div>
                    <Switch
                      checked={config.hls}
                      onCheckedChange={(checked) => setConfig({ ...config, hls: checked })}
                    />
                  </div>
                  {config.hls && (
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="hlsAddress">HLS Address</Label>
                      <Input
                        id="hlsAddress"
                        value={config.hlsAddress}
                        onChange={(e) => setConfig({ ...config, hlsAddress: e.target.value })}
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>WebRTC Server</Label>
                      <p className="text-sm text-muted-foreground">Web Real-Time Communication</p>
                    </div>
                    <Switch
                      checked={config.webrtc}
                      onCheckedChange={(checked) => setConfig({ ...config, webrtc: checked })}
                    />
                  </div>
                  {config.webrtc && (
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="webrtcAddress">WebRTC Address</Label>
                      <Input
                        id="webrtcAddress"
                        value={config.webrtcAddress}
                        onChange={(e) => setConfig({ ...config, webrtcAddress: e.target.value })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>API & Monitoring</CardTitle>
                <CardDescription>Control API and metrics endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Control API</Label>
                        <p className="text-sm text-muted-foreground">Enable REST API</p>
                      </div>
                      <Switch
                        checked={config.api}
                        onCheckedChange={(checked) => setConfig({ ...config, api: checked })}
                      />
                    </div>
                    {config.api && (
                      <div className="space-y-2 ml-4">
                        <Label htmlFor="apiAddress">API Address</Label>
                        <Input
                          id="apiAddress"
                          value={config.apiAddress}
                          onChange={(e) => setConfig({ ...config, apiAddress: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Metrics</Label>
                        <p className="text-sm text-muted-foreground">Prometheus metrics</p>
                      </div>
                      <Switch
                        checked={config.metrics}
                        onCheckedChange={(checked) => setConfig({ ...config, metrics: checked })}
                      />
                    </div>
                    {config.metrics && (
                      <div className="space-y-2 ml-4">
                        <Label htmlFor="metricsAddress">Metrics Address</Label>
                        <Input
                          id="metricsAddress"
                          value={config.metricsAddress}
                          onChange={(e) => setConfig({ ...config, metricsAddress: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paths" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Stream Paths</CardTitle>
                    <CardDescription>Configure streaming paths and sources</CardDescription>
                  </div>
                  <Dialog open={isAddPathDialogOpen} onOpenChange={setIsAddPathDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Path
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Path</DialogTitle>
                        <DialogDescription>Configure a new streaming path in MediaMTX</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="pathName">Path Name *</Label>
                          <Input
                            id="pathName"
                            placeholder="e.g., cam1, camera1"
                            value={newPath.name}
                            onChange={(e) => setNewPath({ ...newPath, name: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">Unique identifier for this path</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="source">Source URL *</Label>
                          <Input
                            id="source"
                            placeholder="rtsp://admin:password@192.168.50.50"
                            value={newPath.source}
                            onChange={(e) => setNewPath({ ...newPath, source: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            RTSP, RTMP, or HLS URL. Example: rtsp://admin:Admin1234@192.168.50.50
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sourceFingerprint">Source Fingerprint (Optional)</Label>
                          <Input
                            id="sourceFingerprint"
                            placeholder="SHA-256 fingerprint"
                            value={newPath.sourceFingerprint}
                            onChange={(e) => setNewPath({ ...newPath, sourceFingerprint: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Optional SHA-256 fingerprint for RTSPS sources
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={newPath.sourceOnDemand}
                            onCheckedChange={(checked) => setNewPath({ ...newPath, sourceOnDemand: checked })}
                          />
                          <Label>Source On Demand</Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Start source only when requested by a client
                        </p>

                        <Separator />

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={newPath.record}
                            onCheckedChange={(checked) => setNewPath({ ...newPath, record: checked })}
                          />
                          <Label>Enable Recording</Label>
                        </div>

                        {newPath.record && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="recordPath">Recording Path</Label>
                              <Input
                                id="recordPath"
                                value={newPath.recordPath}
                                onChange={(e) => setNewPath({ ...newPath, recordPath: e.target.value })}
                              />
                              <p className="text-xs text-muted-foreground">
                                Variables: %path, %Y %m %d (date), %H %M %S (time)
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="recordFormat">Format</Label>
                                <Select
                                  value={newPath.recordFormat}
                                  onValueChange={(value) => setNewPath({ ...newPath, recordFormat: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fmp4">Fragmented MP4</SelectItem>
                                    <SelectItem value="mpegts">MPEG-TS</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="recordPartDuration">Part Duration</Label>
                                <Input
                                  id="recordPartDuration"
                                  value={newPath.recordPartDuration}
                                  onChange={(e) => setNewPath({ ...newPath, recordPartDuration: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="recordSegmentDuration">Segment Duration</Label>
                                <Input
                                  id="recordSegmentDuration"
                                  value={newPath.recordSegmentDuration}
                                  onChange={(e) => setNewPath({ ...newPath, recordSegmentDuration: e.target.value })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="recordDeleteAfter">Delete After</Label>
                                <Input
                                  id="recordDeleteAfter"
                                  value={newPath.recordDeleteAfter}
                                  onChange={(e) => setNewPath({ ...newPath, recordDeleteAfter: e.target.value })}
                                />
                              </div>
                            </div>
                          </>
                        )}

                        <Separator />

                        <div className="space-y-2">
                          <Label htmlFor="maxReaders">Max Readers (0 = unlimited)</Label>
                          <Input
                            id="maxReaders"
                            type="number"
                            value={newPath.maxReaders}
                            onChange={(e) =>
                              setNewPath({ ...newPath, maxReaders: Number.parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={newPath.overridePublisher}
                            onCheckedChange={(checked) => setNewPath({ ...newPath, overridePublisher: checked })}
                          />
                          <Label>Override Publisher</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPathDialogOpen(false)} disabled={isSubmitting}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddPath}
                          disabled={isSubmitting || (diskSpace && (diskSpace.free / 1024 / 1024 / 1024) < 10)}
                          title={diskSpace && (diskSpace.free / 1024 / 1024 / 1024) < 10 ? "Not enough disk space to start recording (min 10GB required)" : undefined}
                        >
                          {isSubmitting ? "Adding..." : "Add Path"}
                        </Button>
                        {diskSpace && (diskSpace.free / 1024 / 1024 / 1024) < 10 && (
                          <div className="text-red-600 text-xs mt-2">Not enough disk space to start a new recording. At least 10GB is required.</div>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingPaths ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                      <p className="text-sm text-gray-600">Loading paths...</p>
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
                    paths.map((path) => {
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
                          <div className="px-4 pb-4">
                            <div className="flex gap-2 mb-4">
                              <Button
                                size="sm"
                                variant="outline"
                                style={
                                  copiedPath === path.name && copiedType === 'SRT'
                                    ? { backgroundColor: '#991B1B', color: '#fff' }
                                    : { backgroundColor: '#FEE2E2', color: '#991B1B' }
                                }
                                onClick={() => handleCopyUrl(generateSRTUrl(path.name), path.name, 'SRT')}
                              >
                                {copiedPath === path.name && copiedType === 'SRT' ? 'Copied!' : 'Copy SRT-URL'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                style={
                                  copiedPath === path.name && copiedType === 'RTMP'
                                    ? { backgroundColor: '#92400E', color: '#fff' }
                                    : { backgroundColor: '#FEF9C3', color: '#92400E' }
                                }
                                onClick={() => handleCopyUrl(generateRTMPUrl(path.name), path.name, 'RTMP')}
                              >
                                {copiedPath === path.name && copiedType === 'RTMP' ? 'Copied!' : 'Copy RTMP-URL'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                style={
                                  copiedPath === path.name && copiedType === 'RTSP'
                                    ? { backgroundColor: '#065F46', color: '#fff' }
                                    : { backgroundColor: '#D1FAE5', color: '#065F46' }
                                }
                                onClick={() => handleCopyUrl(generateRTSPUrl(path.name), path.name, 'RTSP')}
                              >
                                {copiedPath === path.name && copiedType === 'RTSP' ? 'Copied!' : 'Copy RTSP-URL'}
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
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Method</CardTitle>
                <CardDescription>Configure how users authenticate with the server</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <Select defaultValue="internal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal (Configuration File)</SelectItem>
                      <SelectItem value="http">HTTP (External URL)</SelectItem>
                      <SelectItem value="jwt">JWT (Identity Server)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Internal Users</CardTitle>
                    <CardDescription>Manage users stored in configuration</CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Default User (any)</h3>
                      <Badge variant="secondary">Unprivileged</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input value="any" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" placeholder="No password required" readOnly />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label>Permissions</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge>publish</Badge>
                        <Badge>read</Badge>
                        <Badge>playback</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Administrator</h3>
                      <Badge>Admin</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input value="admin" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" value="adminpass" readOnly />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label>Permissions</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge>api</Badge>
                        <Badge>metrics</Badge>
                        <Badge>pprof</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recording" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recording Settings</CardTitle>
                <CardDescription>Configure stream recording options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recordFormat">Recording Format</Label>
                      <Select defaultValue="fmp4">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fmp4">Fragmented MP4</SelectItem>
                          <SelectItem value="mpegts">MPEG-TS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recordPath">Recording Path</Label>
                      <Input defaultValue="./recordings/%path/%Y-%m-%d_%H-%M-%S-%f" />
                      <p className="text-xs text-muted-foreground">
                        Variables: %path, %Y %m %d (date), %H %M %S (time)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="segmentDuration">Segment Duration</Label>
                      <Input defaultValue="1h" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="partDuration">Part Duration</Label>
                      <Input defaultValue="1s" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxPartSize">Max Part Size</Label>
                      <Input defaultValue="50M" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deleteAfter">Delete After</Label>
                      <Input defaultValue="1d" />
                      <p className="text-xs text-muted-foreground">Set to 0s to disable automatic deletion</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recording Status</CardTitle>
                <CardDescription>
                  Current recording sessions
                  <br />
                  <span className="text-xs text-yellow-600">
                    ⚠️ Note: MediaMTX uses global recording settings from mediamtx.yml by default. 
                    Per-path recording paths may not override global configuration.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {livePaths.length > 0 ? (
                    livePaths.map((path) => {
                      // For now, we'll determine recording status from the path config
                      // Since MediaMTX doesn't provide real-time recording status via API
                      const pathConfig = paths.find(p => p.name === path.name)
                      const isRecording = pathConfig?.record || false
                      
                      const handleRecordingToggle = async () => {
                        try {
                          console.log("Toggling recording for:", path.name, "Current state:", isRecording)
                          
                          const updatedConfig = {
                            record: !isRecording,
                            recordPath: pathConfig?.recordPath || "./recordings/%path/%Y-%m-%d_%H-%M-%S-%f",
                            recordFormat: pathConfig?.recordFormat || "fmp4"
                          }
                          
                          console.log("Sending config update:", updatedConfig)
                          
                          await api.updatePath(path.name, updatedConfig)
                          console.log("Config update successful")
                          
                          await fetchPaths() // Refresh data
                          console.log("Paths refreshed")
                        } catch (error: any) {
                          console.error("Failed to toggle recording:", error)
                          alert(`Failed to toggle recording: ${error instanceof Error ? error.message : String(error)}`)
                        }
                      }

                      const handleClipMaker = () => {
                        setSelectedClipPath(path.name)
                        setIsClipDialogOpen(true)
                      }

                      const handleDownloadRecordings = () => {
                        setSelectedClipPath(path.name)
                        setIsDownloadDialogOpen(true)
                      }

                      // Determine clip button state
                      const recordingFiles = pathRecordingFiles[path.name] || []
                      const hasFiles = recordingFiles.length > 0
                      

                      // Only show Download Recording button if not recording and has files
                      const showDownloadButton = !isRecording && hasFiles;
                      
                      return (
                        <div key={path.name} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                              isRecording ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <Play className={`w-5 h-5 ${
                                isRecording ? 'text-red-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-medium">{path.name}</h3>
                              <p className="text-sm text-gray-500">
                                {isRecording 
                                  ? `Recording to: ${pathConfig?.recordPath || 'Default global path'}`
                                  : "Recording not active"
                                }
                              </p>
                              <p className="text-xs text-gray-400">
                                MediaMTX working directory: / (root)
                              </p>
                              <p className="text-xs text-gray-400">
                                Expected files: /recordings/{path.name}/YYYY-MM-DD_HH-MM-SS-fff.fmp4
                              </p>
                              {path.ready && (
                                <p className="text-xs text-green-600">Stream is active</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={isRecording ? "destructive" : "secondary"}>
                              {isRecording ? "Recording" : "Stopped"}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant={isRecording ? "destructive" : "default"}
                              className={isRecording ? "" : "bg-green-600 hover:bg-green-700 text-white"}
                              onClick={handleRecordingToggle}
                              disabled={!path.ready || (diskSpace && (diskSpace.free / 1024 / 1024 / 1024) < 10)}
                              title={diskSpace && (diskSpace.free / 1024 / 1024 / 1024) < 10 ? "Not enough disk space to start recording (min 10GB required)" : undefined}
                            >
                              {isRecording ? "Stop" : "Record"}
                            </Button>
                            {(!isRecording && diskSpace && (diskSpace.free / 1024 / 1024 / 1024) < 10) && (
                              <div className="text-red-600 text-xs mt-2">Not enough disk space to start a new recording. At least 10GB is required.</div>
                            )}
                            {showDownloadButton && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={handleDownloadRecordings}
                              >
                                Download Recording
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Play className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No active streams found</p>
                      <p className="text-sm">Streams will appear here when they are active</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "23%" }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.2GB</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: "45%" }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Network I/O</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45MB/s</div>
                  <p className="text-xs text-muted-foreground">↑ 25MB/s ↓ 20MB/s</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Server Logs</CardTitle>
                <CardDescription>Recent server activity and events</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full border rounded-lg p-4">
                  <div className="space-y-2 text-sm font-mono">
                    <div className="text-green-600">[INFO] {new Date().toISOString().split('T')[0]} - MediaMTX Dashboard loaded</div>
                    <div className="text-green-600">[INFO] {new Date().toISOString().split('T')[0]} - HLS server accessible at {process.env.NEXT_PUBLIC_MEDIAMTX_HLS_URL}</div>
                    <div className="text-green-600">[INFO] {new Date().toISOString().split('T')[0]} - API server accessible at {process.env.NEXT_PUBLIC_MEDIAMTX_API_URL}</div>
                    {livePaths.map((path, index) => (
                      <div key={`${path.name}-${index}`} className="text-blue-600">
                        [INFO] {new Date().toISOString().split('T')[0]} - Stream '{path.name}' {path.ready ? 'active' : 'configured'}
                      </div>
                    ))}
                    {livePaths.length === 0 && (
                      <div className="text-yellow-600">[WARN] {new Date().toISOString().split('T')[0]} - No active streams detected</div>
                    )}
                    <div className="text-blue-600">[INFO] {new Date().toISOString().split('T')[0]} - Dashboard auto-refresh enabled (10s interval)</div>
                  </div>
                </ScrollArea>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Select defaultValue="info">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline">
                    Clear Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Path: {editingPath?.name}</DialogTitle>
            <DialogDescription>Update the configuration for this streaming path</DialogDescription>
          </DialogHeader>
          {editingPath && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Path Name</Label>
                <Input value={editingPath.name} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editSource">Source URL</Label>
                <Input
                  id="editSource"
                  value={editingPath.source}
                  onChange={(e) => setEditingPath({ ...editingPath, source: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingPath.sourceOnDemand}
                  onCheckedChange={(checked) => setEditingPath({ ...editingPath, sourceOnDemand: checked })}
                />
                <Label>Source On Demand</Label>
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingPath.record}
                  onCheckedChange={(checked) => setEditingPath({ ...editingPath, record: checked })}
                />
                <Label>Enable Recording</Label>
              </div>

              {editingPath.record && (
                <div className="space-y-4 ml-6">
                  <div className="space-y-2">
                    <Label>Recording Path</Label>
                    <Input
                      value={editingPath.recordPath || ""}
                      onChange={(e) => setEditingPath({ ...editingPath, recordPath: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select
                        value={editingPath.recordFormat}
                        onValueChange={(value) => setEditingPath({ ...editingPath, recordFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fmp4">Fragmented MP4</SelectItem>
                          <SelectItem value="mpegts">MPEG-TS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Segment Duration</Label>
                      <Input
                        value={editingPath.recordSegmentDuration || ""}
                        onChange={(e) => setEditingPath({ ...editingPath, recordSegmentDuration: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingPath) handleUpdatePath(editingPath, setIsSubmitting, fetchPaths, setIsEditDialogOpen, setEditingPath);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Path"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Path</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the path "{pathToDelete}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePath} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clip Maker Dialog */}
      <Dialog open={isClipDialogOpen} onOpenChange={setIsClipDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make Clip</DialogTitle>
            <DialogDescription>
              Create a clip from the currently recording stream "{selectedClipPath}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clipStart">Start Time</Label>
              <Input 
                id="clipStart"
                type="datetime-local" 
                placeholder="Start time"
              />
            </div>
            <div>
              <Label htmlFor="clipEnd">End Time</Label>
              <Input 
                id="clipEnd"
                type="datetime-local" 
                placeholder="End time"
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>⚠️ Clip making functionality will be implemented in the next phase.</p>
              <p>For now, this is a placeholder for the UI.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClipDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                alert("Clip making feature coming soon!")
                setIsClipDialogOpen(false)
              }}
            >
              Create Clip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Recordings Dialog */}
      <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Download Recordings</DialogTitle>
            <DialogDescription>
              Select recordings to download from "{selectedClipPath}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <p>📁 Recording location: /home/casparcg/mediamtx/recordings/{selectedClipPath}/</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => selectedClipPath && refreshRecordingFiles(selectedClipPath)}
                disabled={isRefreshingFiles}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingFiles ? 'animate-spin' : ''}`} />
                {isRefreshingFiles ? 'Refreshing...' : 'Refresh List'}
              </Button>
            </div>
            
            {/* File list */}
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-3">Available recordings (excluding currently growing files):</p>
              
              {selectedClipPath && pathRecordingFiles[selectedClipPath] ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pathRecordingFiles[selectedClipPath].length > 0 ? (
                    pathRecordingFiles[selectedClipPath].map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                        <input type="checkbox" id={`file-${index}`} />
                        <label htmlFor={`file-${index}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{file.name}</span>
                            <div className="text-xs text-gray-500">
                              <span className="mr-2">{file.size}</span>
                              <span>{new Date(file.modified).toLocaleString()}</span>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <p>No recording files found</p>
                      <p className="text-xs mt-1">Files may still be recording or haven't been created yet</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p>Loading files...</p>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-400">
              <p>💡 Files currently being recorded are automatically excluded from this list</p>
              <p>🔄 Files must be stable for 30+ seconds before appearing</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDownloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                alert("Download functionality will be implemented next!")
                setIsDownloadDialogOpen(false)
              }}
            >
              Download Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create SRT Stream Dialog */}
      <Dialog open={isCreateSRTStreamDialogOpen} onOpenChange={setIsCreateSRTStreamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Stream</DialogTitle>
            <DialogDescription>
              Enter a stream name to create a new publishing endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="streamId">Stream Name</Label>
              <Input
                id="streamId"
                placeholder="e.g., mystream, camera1, livestream"
                value={newSRTStreamId}
                onChange={(e) => setNewSRTStreamId(e.target.value)}
              />
              <div className="text-xs text-muted-foreground mt-2">
                You can use this stream name in your sender URL for RTSP, RTMP, or SRT:
                <br />RTSP: <code>rtsp://&#60;server&#62;:8554/{newSRTStreamId || 'your_stream_name'}</code>
                <br />RTMP: <code>rtmp://&#60;server&#62;:1935/{newSRTStreamId || 'your_stream_name'}</code>
                <br />SRT: <code>srt://&#60;server&#62;:8890?streamid=publish:{newSRTStreamId || 'your_stream_name'}</code>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSRTStreamDialogOpen(false)} disabled={isCreatingSRTStream}>
              Cancel
            </Button>
            <Button onClick={handleCreateSRTStream} disabled={isCreatingSRTStream}>
              {isCreatingSRTStream ? "Creating..." : "Create Stream"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MediaMTXDashboard;
// recording finish OK
