import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, Volume2, VolumeX, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';

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

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  media: CapturedImage | RecordedVideo | null;
  type: 'image' | 'video';
}

export function MediaViewer({ isOpen, onClose, media, type }: MediaViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      const video = videoRef.current;
      
      const updateTime = () => setCurrentTime(video.currentTime);
      const updateDuration = () => setDuration(video.duration);
      const handleEnded = () => setIsPlaying(false);

      video.addEventListener('timeupdate', updateTime);
      video.addEventListener('loadedmetadata', updateDuration);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('timeupdate', updateTime);
        video.removeEventListener('loadedmetadata', updateDuration);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [type, media]);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setZoom(1);
    }
  }, [isOpen]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleDownload = () => {
    if (!media) return;

    const url = type === 'image' 
      ? (media as CapturedImage).imageUrl 
      : (media as RecordedVideo).videoUrl;
    
    const filename = type === 'image'
      ? `capture_${media.timestamp.toISOString()}.jpg`
      : (media as RecordedVideo).filename;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const toggleZoom = () => {
    setZoom(prev => prev === 1 ? 2 : 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!media) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-slate-900 border-slate-700 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-slate-200 text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {type === 'image' ? 'Captured Image' : 'Recorded Video'}
              </DialogTitle>
              <p className="text-slate-400 text-sm mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {media.timestamp.toLocaleString()} • {media.risks.length} risks detected
              </p>
            </div>
            <div className="flex items-center gap-2">
              {type === 'image' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleZoom}
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  {zoom === 1 ? <ZoomIn className="w-4 h-4" /> : <ZoomOut className="w-4 h-4" />}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="bg-blue-700 border-blue-600 text-white hover:bg-blue-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative bg-slate-950 overflow-hidden">
          {/* Media Container */}
          <div className="relative aspect-video bg-slate-900 overflow-hidden">
            <motion.div
              className="w-full h-full overflow-hidden"
              animate={{ scale: zoom }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {type === 'image' ? (
                <img
                  src={(media as CapturedImage).imageUrl}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={(media as RecordedVideo).videoUrl}
                  className="w-full h-full object-contain"
                  onClick={togglePlay}
                />
              )}
            </motion.div>

            {/* Risk Detection Overlays */}
            {media.risks.map((risk) => (
              <motion.div
                key={risk.id}
                className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                style={{
                  left: `${risk.x}%`,
                  top: `${risk.y}%`,
                  width: `${risk.width}%`,
                  height: `${risk.height}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: zoom }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute -top-8 left-0">
                  <Badge variant="destructive" className="text-xs">
                    {risk.type} ({Math.round(risk.confidence)}%)
                  </Badge>
                </div>
              </motion.div>
            ))}

            {/* Video Controls Overlay */}
            {type === 'video' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
              />
            )}
          </div>

          {/* Video Controls */}
          {type === 'video' && (
            <div className="bg-slate-800 p-4 space-y-3">
              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm font-mono w-12">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-slate-400 text-sm font-mono w-12">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlay}
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMute}
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-slate-700 text-slate-200 border-slate-600">
                    {(media as RecordedVideo).filename}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk Details Panel */}
        {media.risks.length > 0 && (
          <div className="p-6 bg-slate-800 border-t border-slate-700 max-h-48 overflow-y-auto">
            <h3 className="text-slate-200 text-sm font-medium mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Detected Risks ({media.risks.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {media.risks.map((risk) => (
                <div
                  key={risk.id}
                  className="bg-slate-900 rounded-lg border border-slate-600 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="destructive" className="text-xs">
                      {risk.type}
                    </Badge>
                    <span className="text-slate-400 text-xs font-mono">
                      {Math.round(risk.confidence)}%
                    </span>
                  </div>
                  <div className="text-slate-500 text-xs mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Position: ({Math.round(risk.x)}, {Math.round(risk.y)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
