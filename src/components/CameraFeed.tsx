import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'motion/react';
import { ZoomIn, ZoomOut, Camera, Play, Pause, PlayCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

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

interface CameraFeedProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  onCapture: () => void;
  detectedRisks: RiskDetection[];
  capturedImages: CapturedImage[];
  recordedVideos: RecordedVideo[];
  onImageClick?: (image: CapturedImage) => void;
  onVideoClick?: (video: RecordedVideo) => void;
}

export interface CameraFeedRef {
  captureFrame: () => string | null;
  getStream: () => MediaStream | null;
}

export const CameraFeed = forwardRef<CameraFeedRef, CameraFeedProps>(({ isRecording, onToggleRecording, onCapture, detectedRisks, capturedImages, recordedVideos, onImageClick, onVideoClick }, ref) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current || !videoRef.current.videoWidth) {
        return null;
      }

      // Create canvas if it doesn't exist
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

  useEffect(() => {
    // Request camera access
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'environment' // Use back camera on mobile devices
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
        setCameraError(null);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setCameraError('Unable to access camera. Please grant camera permissions.');
      }
    };

    startCamera();

    // Cleanup: stop camera when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleZoom = () => {
    setZoomLevel(prev => prev === 1 ? 2 : 1);
  };

  const resetToOriginal = () => {
    setZoomLevel(1);
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-slate-900 rounded-lg border border-slate-700">
        {/* Camera Feed */}
        <div className="relative aspect-video bg-slate-800 overflow-hidden">
          <motion.div
            className="w-full h-full overflow-hidden"
            animate={{ scale: zoomLevel }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {cameraError ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center p-6">
                  <Camera className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">{cameraError}</p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>

          {/* Risk Detection Overlays */}
          {detectedRisks.map((risk) => (
            <motion.div
              key={risk.id}
              className="absolute border-2 border-red-500 bg-red-500/20"
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
              <div className="absolute -top-8 left-0">
                <Badge variant="destructive" className="text-xs">
                  {risk.type} ({Math.round(risk.confidence)}%)
                </Badge>
              </div>
            </motion.div>
          ))}

          {/* Recording Indicator */}
          {isRecording && (
            <motion.div
              className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              <span className="text-sm">REC</span>
            </motion.div>
          )}

          {/* Camera Status */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-600 text-white">
              CAM-01
            </Badge>
            <Badge variant="outline" className="bg-slate-800/80 text-slate-200 border-slate-600">
              {zoomLevel === 1 ? 'Wide Angle' : `Zoom ${zoomLevel}x`}
            </Badge>
            <Badge variant="outline" className="bg-green-600 text-white border-green-500">
              LIVE
            </Badge>
          </div>

          {/* Timestamp */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-slate-800/80 text-slate-200 px-3 py-1 rounded text-sm font-mono">
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Controls */}
      <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleZoom}
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            {zoomLevel === 1 ? (
              <>
                <ZoomIn className="w-4 h-4 mr-2" />
                Zoom 2x
              </>
            ) : (
              <>
                <ZoomOut className="w-4 h-4 mr-2" />
                Wide View
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToOriginal}
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            Reset to 1x
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCapture}
            className="bg-blue-700 border-blue-600 text-white hover:bg-blue-600"
          >
            <Camera className="w-4 h-4 mr-2" />
            Capture
          </Button>
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={onToggleRecording}
            className={isRecording ? "" : "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"}
          >
            {isRecording ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRecording ? 'Stop' : 'Record'}
          </Button>
        </div>
      </div>

      {/* Captured Media Gallery */}
      {(capturedImages.length > 0 || recordedVideos.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-800 rounded-lg border border-slate-700 p-4"
        >
          <h3 className="text-slate-200 text-sm font-medium mb-3 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <Camera className="w-4 h-4" />
            Recent Captures & Recordings ({capturedImages.length + recordedVideos.length})
          </h3>
          
          <div className="grid grid-cols-5 gap-3">
            {/* Captured Images with Risk Overlays */}
            {capturedImages.map((capture, index) => (
              <motion.div
                key={capture.id}
                className="relative aspect-video bg-slate-700 rounded border border-slate-600 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => onImageClick?.(capture)}
              >
                <ImageWithFallback
                  src={capture.imageUrl}
                  alt={`Capture ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Risk Detection Overlays on Captured Images */}
                {capture.risks.map((risk) => (
                  <div
                    key={`${capture.id}-${risk.id}`}
                    className="absolute border border-red-400 bg-red-500/20"
                    style={{
                      left: `${risk.x}%`,
                      top: `${risk.y}%`,
                      width: `${risk.width}%`,
                      height: `${risk.height}%`,
                    }}
                  >
                    <div className="absolute -top-5 left-0">
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        {risk.type.split(' ')[0]} {Math.round(risk.confidence)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {/* Image indicator */}
                <div className="absolute top-1 left-1">
                  <Badge variant="secondary" className="text-xs px-1 py-0 bg-blue-600 text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    IMG
                  </Badge>
                </div>
                
                {/* Risk count overlay */}
                {capture.risks.length > 0 && (
                  <div className="absolute top-1 right-1">
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      {capture.risks.length}
                    </Badge>
                  </div>
                )}
                
                {/* Timestamp overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                  <div className="text-xs text-white font-mono">
                    {capture.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Recorded Videos */}
            {recordedVideos.map((video, index) => (
              <motion.div
                key={video.id}
                className="relative aspect-video bg-slate-700 rounded border border-slate-600 overflow-hidden cursor-pointer hover:border-green-500 transition-colors group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (capturedImages.length + index) * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => onVideoClick?.(video)}
              >
                <ImageWithFallback
                  src={video.thumbnailUrl}
                  alt={`Video ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Video play indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="w-8 h-8 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
                
                {/* Video indicator */}
                <div className="absolute top-1 left-1">
                  <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-600 text-white">
                    VID
                  </Badge>
                </div>
                
                {/* Duration */}
                <div className="absolute top-1 right-1">
                  <Badge variant="outline" className="text-xs px-1 py-0 bg-black/60 text-white border-white/20">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </Badge>
                </div>
                
                {/* Risk count overlay */}
                {video.risks.length > 0 && (
                  <div className="absolute top-6 right-1">
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      {video.risks.length} risks
                    </Badge>
                  </div>
                )}
                
                {/* Timestamp overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                  <div className="text-xs text-white font-mono">
                    {video.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Media Summary */}
          <div className="mt-4 pt-3 border-t border-slate-600 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-mono text-blue-400">{capturedImages.length}</div>
              <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Images</div>
            </div>
            <div>
              <div className="text-lg font-mono text-green-400">{recordedVideos.length}</div>
              <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Videos</div>
            </div>
            <div>
              <div className="text-lg font-mono text-red-400">
                {capturedImages.reduce((sum, img) => sum + img.risks.length, 0) + 
                 recordedVideos.reduce((sum, vid) => sum + vid.risks.length, 0)}
              </div>
              <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Total Risks</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});