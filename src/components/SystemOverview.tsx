import { motion } from 'motion/react';
import { Shield, Camera, AlertTriangle, Activity, Server, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface SystemStatus {
  cameras: { active: number; total: number };
  storage: { used: number; total: number };
  bandwidth: number;
  uptime: number;
  detectionRate: number;
  falsePositives: number;
}

interface SystemOverviewProps {
  systemStatus: SystemStatus;
  alertLevel: 'normal' | 'elevated' | 'high' | 'critical';
}

export function SystemOverview({ systemStatus, alertLevel }: SystemOverviewProps) {
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'normal': return 'text-green-400 bg-green-900/20';
      case 'elevated': return 'text-yellow-400 bg-yellow-900/20';
      case 'high': return 'text-orange-400 bg-orange-900/20';
      case 'critical': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const formatUptime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const formatStorage = (gb: number) => {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(1)}TB`;
    }
    return `${gb}GB`;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-200 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400"  style={{ fontFamily: 'Poppins, sans-serif' }}/>
          System Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert Level */}
        <div className={`p-4 rounded-lg border ${getAlertColor(alertLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Alert Level</span>
            </div>
            <Badge className={getAlertColor(alertLevel)}>
              {alertLevel.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Active Cameras */}
          <motion.div 
            className="bg-slate-700 p-4 rounded-lg"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Cameras</span>
            </div>
            <div className="text-2xl font-mono text-slate-200">
              {systemStatus.cameras.active}/{systemStatus.cameras.total}
            </div>
            <Progress 
              value={(systemStatus.cameras.active / systemStatus.cameras.total) * 100} 
              className="h-2 mt-2 bg-slate-600"
            />
          </motion.div>

          {/* Detection Rate */}
          <motion.div 
            className="bg-slate-700 p-4 rounded-lg"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Detection Rate</span>
            </div>
            <div className="text-2xl font-mono text-slate-200">
              {systemStatus.detectionRate}%
            </div>
            <Progress 
              value={systemStatus.detectionRate} 
              className="h-2 mt-2 bg-slate-600"
            />
          </motion.div>

          {/* Storage Usage */}
          <motion.div 
            className="bg-slate-700 p-4 rounded-lg"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Storage</span>
            </div>
            <div className="text-lg font-mono text-slate-200">
              {formatStorage(systemStatus.storage.used)} / {formatStorage(systemStatus.storage.total)}
            </div>
            <Progress 
              value={(systemStatus.storage.used / systemStatus.storage.total) * 100} 
              className="h-2 mt-2 bg-slate-600"
            />
          </motion.div>

          {/* Bandwidth */}
          <motion.div 
            className="bg-slate-700 p-4 rounded-lg"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Bandwidth</span>
            </div>
            <div className="text-2xl font-mono text-slate-200" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {systemStatus.bandwidth} Mbps
            </div>
            <div className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Network utilization
            </div>
          </motion.div>
        </div>

        {/* Additional Stats */}
        <div className="space-y-3 pt-4 border-t border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>System Uptime</span>
            <span className="text-sm text-slate-200 font-mono">
              {formatUptime(systemStatus.uptime)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>False Positives (24h)</span>
            <span className="text-sm text-slate-200 font-mono">
              {systemStatus.falsePositives}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Last System Check</span>
            <span className="text-sm text-slate-200 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-600">
          <div className="text-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-1" />
            <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>AI Engine</div>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-1" />
            <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Database</div>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mx-auto mb-1" />
            <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Backup</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}