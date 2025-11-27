import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'motion/react';
import { ZoomIn, ZoomOut, Camera, Play, Pause, PlayCircle, Loader2, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

// --- Types ---
interface RiskDetection {
  id: string;
  type: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CapturedImage {
  id: string;
  timestamp: Date;
  imageUrl: string;
  risks: RiskDetection[];
}

interface RecordedVideo {
  id: string;
  timestamp: Date;
  thumbnailUrl: string;
  duration: number;
  risks: RiskDetection[];
  filename: string;
  videoUrl: string;
}

interface LiveStreamProps {
  streamUrl: string; // The WHEP URL (e.g. http://192.168.1.50:8889/pi-cam/whep)
  isRecording: boolean;
  onToggleRecording: () => void;
  onCapture: () => void;
  detectedRisks: RiskDetection[];
  capturedImages: CapturedImage[];
  recordedVideos: RecordedVideo[];
  onImageClick?: (image: CapturedImage) => void;
  onVideoClick?: (video: RecordedVideo) => void;
}

export interface LiveStreamRef {
  captureFrame: () => string | null;
  getStream: () => MediaStream | null;
}

// --- Component ---
export const LiveStream = forwardRef<LiveStreamRef, LiveStreamProps>(({ 
  streamUrl,
  isRecording, 
  onToggleRecording, 
  onCapture, 
  detectedRisks, 
  capturedImages, 
  recordedVideos, 
  onImageClick, 
  onVideoClick 
}, ref) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- 1. Expose methods to parent (Capture & Stream Access) ---
  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current || !videoRef.current.videoWidth) return null;

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.95);
    },
    getStream: () => streamRef.current
  }));

  // --- 2. WebRTC / WHEP Connection Logic ---
  useEffect(() => {
    let isMounted = true;

    const startStream = async () => {
      if (!streamUrl) return;

      setConnectionStatus('connecting');
      setErrorMessage(null);

      // Cleanup previous connection if exists
      if (pcRef.current) {
        pcRef.current.close();
      }

      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;

        // Handle incoming stream
        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            streamRef.current = event.streams[0];
            if (isMounted) setConnectionStatus('connected');
          }
        };

        // We only want to RECEIVE video
        pc.addTransceiver('video', { direction: 'recvonly' });

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Exchange SDP with MediaMTX
        const response = await fetch(streamUrl, {
          method: 'POST',
          body: offer.sdp,
          headers: { 'Content-Type': 'application/sdp' },
        });

        if (!response.ok) {
          throw new Error(`Connection failed: ${response.statusText}`);
        }

        const answerSdp = await response.text();
        await pc.setRemoteDescription(
          new RTCPeerConnection().createSessionDescription({
            type: 'answer',
            sdp: answerSdp,
          })
        );

      } catch (err) {
        console.error("WHEP Error:", err);
        if (isMounted) {
          setConnectionStatus('error');
          setErrorMessage("Cannot connect to Camera. Check Raspberry Pi.");
        }
      }
    };

    startStream();

    return () => {
      isMounted = false;
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [streamUrl]);

  // --- 3. UI Helpers ---
  const toggleZoom = () => setZoomLevel(prev => prev === 1 ? 2 : 1);
  const resetToOriginal = () => setZoomLevel(1);

  return (
    <div className="space-y-4">
      <div className="relative bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
        
        {/* Main Video Area */}
        <div className="relative aspect-video bg-slate-950 overflow-hidden rounded-t-lg">
          
          {/* Loading / Error States */}
          {connectionStatus !== 'connected' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-slate-400 bg-slate-900/90">
              {connectionStatus === 'connecting' ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-500" />
                  <p>Connecting to SafeSight Node...</p>
                </>
              ) : (
                <>
                  <WifiOff className="w-10 h-10 mb-3 text-red-500" />
                  <p>{errorMessage || "Stream Offline"}</p>
                  <Button 
                    variant="link" 
                    className="text-blue-400 mt-2"
                    onClick={() => window.location.reload()} // Simple retry
                  >
                    Retry Connection
                  </Button>
                </>
              )}
            </div>
          )}

          {/* The Video Feed */}
          <motion.div
            className="w-full h-full overflow-hidden"
            animate={{ scale: zoomLevel }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              controls={false}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* --- Overlays --- */}

          {/* Risk Detection Boxes */}
          {connectionStatus === 'connected' && detectedRisks.map((risk) => (
            <motion.div
              key={risk.id}
              className="absolute border-2 border-red-500 bg-red-500/10 z-10"
              style={{
                left: `${risk.x}%`,
                top: `${risk.y}%`,
                width: `${risk.width}%`,
                height: `${risk.height}%`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute -top-6 left-0">
                <Badge variant="destructive" className="text-xs shadow-sm">
                  {risk.type} ({Math.round(risk.confidence)}%)
                </Badge>
              </div>
            </motion.div>
          ))}

          {/* Recording Indicator */}
          {isRecording && (
            <motion.div
              className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full z-20 shadow-lg"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              <span className="text-xs font-bold tracking-wider">REC</span>
            </motion.div>
          )}

          {/* Camera Info Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
            <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white border-0 backdrop-blur-md">
              CAM-01
            </Badge>
            <Badge variant="outline" className="bg-slate-900/60 text-slate-200 border-slate-600 backdrop-blur-md">
              {zoomLevel === 1 ? 'Wide Angle' : `Zoom ${zoomLevel}x`}
            </Badge>
            {connectionStatus === 'connected' && (
              <Badge className="bg-green-500/90 hover:bg-green-500 text-white border-0 flex gap-1 items-center backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
                LIVE
              </Badge>
            )}
          </div>

          {/* Timestamp Footer */}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-slate-900/80 to-transparent p-4 z-20">
             <div className="bg-slate-900/80 inline-block px-2 py-1 rounded text-xs font-mono text-slate-300 border border-slate-700/50">
               {new Date().toLocaleString()}
             </div>
          </div>
        </div>
      </div>

      {/* --- Controls Toolbar --- */}
      <div className="bg-slate-800 p-3 rounded-lg flex items-center justify-between border border-slate-700">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleZoom}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
            disabled={connectionStatus !== 'connected'}
          >
            {zoomLevel === 1 ? <ZoomIn className="w-4 h-4 mr-2" /> : <ZoomOut className="w-4 h-4 mr-2" />}
            {zoomLevel === 1 ? 'Zoom' : 'Reset'}
          </Button>
          {zoomLevel > 1 && (
            <Button variant="ghost" size="sm" onClick={resetToOriginal} className="text-slate-400 hover:text-white">
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onCapture}
            disabled={connectionStatus !== 'connected'}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Camera className="w-4 h-4 mr-2" />
            Snapshot
          </Button>
          
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="sm"
            onClick={onToggleRecording}
            disabled={connectionStatus !== 'connected'}
            className={isRecording ? "animate-pulse" : "bg-slate-700 text-slate-200 hover:bg-slate-600"}
          >
            {isRecording ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRecording ? 'Stop Recording' : 'Record Stream'}
          </Button>
        </div>
      </div>

      {/* --- Captured Media Gallery (Unchanged Logic, visually tweaked) --- */}
      {(capturedImages.length > 0 || recordedVideos.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 mt-6"
        >
          <h3 className="text-slate-300 text-sm font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            Session History
            <Badge variant="outline" className="ml-auto text-xs border-slate-600 text-slate-400">
              {capturedImages.length + recordedVideos.length} Items
            </Badge>
          </h3>
          
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            
            {/* Images */}
            {capturedImages.map((capture, index) => (
              <motion.div
                key={capture.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group relative aspect-video bg-slate-900 rounded border border-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
                onClick={() => onImageClick?.(capture)}
              >
                <ImageWithFallback src={capture.imageUrl} alt="capture" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                
                {/* Image Badge */}
                <div className="absolute top-1 left-1">
                  <Badge className="h-4 px-1 text-[9px] bg-blue-600/90 text-white border-0">IMG</Badge>
                </div>

                {/* Risk Badge */}
                {capture.risks.length > 0 && (
                   <div className="absolute top-1 right-1">
                     <Badge variant="destructive" className="h-4 px-1 text-[9px]">{capture.risks.length}</Badge>
                   </div>
                )}
                
                <div className="absolute bottom-0 w-full bg-black/60 p-1">
                   <p className="text-[10px] text-slate-300 font-mono text-center">{capture.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</p>
                </div>
              </motion.div>
            ))}

            {/* Videos */}
            {recordedVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (capturedImages.length + index) * 0.05 }}
                className="group relative aspect-video bg-slate-900 rounded border border-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-500/50 transition-all"
                onClick={() => onVideoClick?.(video)}
              >
                <ImageWithFallback src={video.thumbnailUrl} alt="video" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="w-8 h-8 text-white/80 group-hover:text-white group-hover:scale-110 transition-all shadow-lg" />
                </div>

                <div className="absolute top-1 left-1">
                  <Badge className="h-4 px-1 text-[9px] bg-green-600/90 text-white border-0">VID</Badge>
                </div>
                
                <div className="absolute bottom-0 w-full bg-black/60 p-1 flex justify-between px-2">
                   <span className="text-[10px] text-slate-300 font-mono">{video.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   <span className="text-[10px] text-slate-300 font-mono">{video.duration}s</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
});

LiveStream.displayName = 'LiveStream';

export default LiveStream;