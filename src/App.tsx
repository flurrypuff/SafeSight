import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Phone, PhoneCall } from "lucide-react";
// --- CHANGE 1: Import the new LiveStream component ---
import LiveStream, { LiveStreamRef } from "./components/CameraFeed"; 
// Note: If you put LiveStream in the components folder, change path to: "./components/LiveStream"
import { RiskDetection } from "./components/RiskDetection";
import { RiskHistory } from "./components/RiskHistory";
import { SystemOverview } from "./components/SystemOverview";
import { MediaViewer } from "./components/MediaViewer";
import { Button } from "./components/ui/button";
import { toast } from "sonner@2.0.3";

// Mock data interfaces
interface Risk {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  timestamp: Date;
  status: "active" | "tracking" | "resolved";
}

interface HistoricalRisk {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  timestamp: Date;
  duration: number;
  status: "resolved" | "escalated" | "false-positive";
  location: string;
}

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

// Mock data generation functions
const generateMockRisks = (): Risk[] => {
  const riskTypes = [
    "Violence/Abuse",
    "Fire Hazard",
    "Sharp Object Detected",
    "Slippery Floor",
    "Signs of Passing Out",
  ];
  const descriptions = [
    "Person detected showing signs of abuse",
    "Fire hazard detected in proximity",
    "Person close to sharp object",
    "Person in possible slip or fall accident",
    "Person is showing signs of passing out",
  ];

  return Array.from(
    { length: Math.floor(Math.random() * 4) },
    (_, i) => ({
      id: `risk-${i}`,
      type: riskTypes[Math.floor(Math.random() * riskTypes.length)],
      severity: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as Risk["severity"],
      confidence: Math.floor(Math.random() * 40) + 60,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      status: ["active", "tracking"][Math.floor(Math.random() * 2)] as Risk["status"],
    }),
  );
};

const generateHistoricalRisks = (): HistoricalRisk[] => {
  const riskTypes = ["Violence/Abuse", "Fire Hazard", "Sharp Object Detected", "Slippery Floor", "Signs of Passing Out"];
  const locations = ["Living Room", "Kitchen", "Dining Area", "Bathroom", "Bedroom"];

  return Array.from({ length: 25 }, (_, i) => ({
    id: `hist-${i}`,
    type: riskTypes[Math.floor(Math.random() * riskTypes.length)],
    severity: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as HistoricalRisk["severity"],
    confidence: Math.floor(Math.random() * 40) + 60,
    description: `Historical risk event #${i + 1}`,
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 3600000),
    duration: Math.floor(Math.random() * 600) + 30,
    status: ["resolved", "escalated", "false-positive"][Math.floor(Math.random() * 3)] as HistoricalRisk["status"],
    location: locations[Math.floor(Math.random() * locations.length)],
  }));
};

const generateDetectedRisks = (activeRisks: Risk[]): RiskDetection[] => {
  return activeRisks.map((risk) => ({
    id: risk.id,
    type: risk.type,
    confidence: risk.confidence,
    x: Math.random() * 60 + 10,
    y: Math.random() * 60 + 10,
    width: Math.random() * 15 + 10,
    height: Math.random() * 15 + 10,
  }));
};

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentRisks, setCurrentRisks] = useState<Risk[]>([]);
  const [historicalRisks] = useState<HistoricalRisk[]>(generateHistoricalRisks());
  const [detectedRisks, setDetectedRisks] = useState<RiskDetection[]>([]);
  const [totalDetections, setTotalDetections] = useState(147);
  const [systemStatus] = useState<"online" | "offline" | "warning">("online");
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [recordedVideos, setRecordedVideos] = useState<RecordedVideo[]>([]);
  
  // --- CHANGE 2: Updated Ref type for the new component ---
  const liveStreamRef = useRef<LiveStreamRef>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<CapturedImage | RecordedVideo | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  // --- CONFIG: Your Pi URL ---
  const WHEP_URL = "http://192.168.1.92:8889/pi-cam-hires/whep";

  const systemOverviewData = {
    cameras: { active: 8, total: 10 },
    storage: { used: 750, total: 2000 },
    bandwidth: 85,
    uptime: 168,
    detectionRate: 94,
    falsePositives: 12,
  };

  const alertLevel = currentRisks.some((r) => r.severity === "critical")
    ? "critical"
    : currentRisks.some((r) => r.severity === "high")
      ? "high"
      : currentRisks.some((r) => r.severity === "medium")
        ? "elevated"
        : "normal";

  // Simulate risk detection updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newRisks = generateMockRisks();
      setCurrentRisks(newRisks);
      setDetectedRisks(generateDetectedRisks(newRisks));

      if (Math.random() < 0.3) {
        setTotalDetections((prev) => prev + 1);
      }
    }, 8000);

    const initialRisks = generateMockRisks();
    setCurrentRisks(initialRisks);
    setDetectedRisks(generateDetectedRisks(initialRisks));

    return () => clearInterval(interval);
  }, []);

  // Show toast notifications for new high-severity risks
  useEffect(() => {
    const highSeverityRisks = currentRisks.filter(
      (r) => r.severity === "high" || r.severity === "critical",
    );
    if (highSeverityRisks.length > 0) {
      const latestRisk = highSeverityRisks[0];
      toast.error(
        `${latestRisk.severity.toUpperCase()} RISK: ${latestRisk.type}`,
        {
          description: latestRisk.description,
          duration: 5000,
        },
      );
    }
  }, [currentRisks]);

  const handleToggleRecording = async () => {
    const wasRecording = isRecording;
    setIsRecording(!isRecording);

    if (wasRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } else {
      // Start recording
      // --- CHANGE 3: Use liveStreamRef to get the WebRTC stream ---
      const stream = liveStreamRef.current?.getStream();
      
      if (!stream) {
        toast.error("Stream not ready", {
          description: "Waiting for connection to Raspberry Pi...",
        });
        setIsRecording(false);
        return;
      }

      try {
        recordedChunksRef.current = [];
        recordingStartTimeRef.current = Date.now();

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: 'video/webm',
          });
          const videoUrl = URL.createObjectURL(blob);
          const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);

          // Capture a thumbnail from current frame
          const thumbnailUrl = liveStreamRef.current?.captureFrame() || '';

          const newVideo: RecordedVideo = {
            id: `video-${Date.now()}`,
            timestamp: new Date(),
            thumbnailUrl,
            videoUrl,
            duration,
            risks: detectedRisks,
            filename: `CAM-01_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`,
          };

          setRecordedVideos((prev) => [
            newVideo,
            ...prev.slice(0, 4),
          ]); 

          toast.success("Recording stopped", {
            description: `Video saved with ${detectedRisks.length} risk events recorded`,
          });
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000); 

        toast.success("Recording started", {
          description: "Video recording has begun",
        });
      } catch (error) {
        console.error('Error starting recording:', error);
        toast.error("Recording failed", {
          description: "Unable to start video recording (Browser permission issue?)",
        });
        setIsRecording(false);
      }
    }
  };

  const handleCapture = () => {
    // Capture the current video frame
    // --- CHANGE 4: Use liveStreamRef ---
    const imageUrl = liveStreamRef.current?.captureFrame();
    
    if (!imageUrl) {
      toast.error("Capture failed", {
        description: "Stream not ready for capture",
      });
      return;
    }

    const newCapture: CapturedImage = {
      id: `capture-${Date.now()}`,
      timestamp: new Date(),
      imageUrl,
      risks: detectedRisks,
    };

    setCapturedImages((prev) => [
      newCapture,
      ...prev.slice(0, 4),
    ]); 

    toast.success("Screenshot captured", {
      description: `Image saved with ${detectedRisks.length} detected risks`,
    });
  };

  const handleEmergencyCall = () => {
    toast.error("Emergency Services Called", {
      description: "Critical risk detected - Emergency response initiated",
      duration: 10000,
    });
    console.log("Emergency call initiated due to critical risk detection");
  };

  const handleImageClick = (image: CapturedImage) => {
    setSelectedMedia(image);
    setMediaType('image');
    setViewerOpen(true);
  };

  const handleVideoClick = (video: RecordedVideo) => {
    setSelectedMedia(video);
    setMediaType('video');
    setViewerOpen(true);
  };

  const handleViewerClose = () => {
    setViewerOpen(false);
    setTimeout(() => {
      setSelectedMedia(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 relative"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-3xl text-white mb-2 font-bold"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                SafeSight
              </h1>
              <p
                className="text-slate-400"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Real-time Safety Monitoring and Risk Detection
              </p>
            </div>

            {/* Critical Alert Call Button */}
            {alertLevel === "critical" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{
                  duration: 0.3,
                  type: "spring",
                  stiffness: 100,
                }}
                className="flex items-center gap-3"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      "0 0 0 0 rgba(239, 68, 68, 0.7)",
                      "0 0 0 10px rgba(239, 68, 68, 0)",
                      "0 0 0 0 rgba(239, 68, 68, 0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-full"
                >
                  <Button
                    onClick={handleEmergencyCall}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-lg border-2 border-red-500"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    <PhoneCall className="w-5 h-5 mr-2" />
                    EMERGENCY CALL
                  </Button>
                </motion.div>
                <div className="text-right">
                  <div
                    className="text-red-400 text-sm font-medium"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    CRITICAL ALERT
                  </div>
                  <div
                    className="text-slate-400 text-xs"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    Immediate Response Required
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max">
          
          {/* Top Row - Camera Feed (LiveStream) and Risk Detection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 min-h-0"
          >
            {/* --- CHANGE 5: Render LiveStream instead of CameraFeed --- */}
            <LiveStream
              ref={liveStreamRef}
              streamUrl={WHEP_URL}
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
              onCapture={handleCapture}
              detectedRisks={detectedRisks}
              capturedImages={capturedImages}
              recordedVideos={recordedVideos}
              onImageClick={handleImageClick}
              onVideoClick={handleVideoClick}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="min-h-0"
          >
            <RiskDetection
              currentRisks={currentRisks}
              totalDetections={totalDetections}
              systemStatus={systemStatus}
            />
          </motion.div>

          {/* Bottom Row - Risk History and System Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 min-h-0"
          >
            <RiskHistory historicalRisks={historicalRisks} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="min-h-0"
          >
            <SystemOverview
              systemStatus={systemOverviewData}
              alertLevel={alertLevel}
            />
          </motion.div>
        </div>

        {/* Floating Emergency Call Button */}
        {alertLevel === "critical" && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{
              duration: 0.4,
              type: "spring",
              stiffness: 80,
            }}
            className="fixed bottom-6 right-6 z-50 lg:hidden"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Button
                onClick={handleEmergencyCall}
                className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl border-4 border-red-500"
                size="lg"
              >
                <Phone className="w-6 h-6" />
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Media Viewer Modal */}
        <MediaViewer
          isOpen={viewerOpen}
          onClose={handleViewerClose}
          media={selectedMedia}
          type={mediaType}
        />
      </motion.div>
    </div>
  );
}