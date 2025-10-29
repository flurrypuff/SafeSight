import { motion } from 'motion/react';
import { AlertTriangle, Shield, Eye, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface Risk {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  timestamp: Date;
  status: 'active' | 'tracking' | 'resolved';
}

interface RiskDetectionProps {
  currentRisks: Risk[];
  totalDetections: number;
  systemStatus: 'online' | 'offline' | 'warning';
}

export function RiskDetection({ currentRisks, totalDetections, systemStatus }: RiskDetectionProps) {
  const getSeverityColor = (severity: Risk['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getSeverityIcon = (severity: Risk['severity']) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Eye className="w-4 h-4" />;
      case 'medium': return <Activity className="w-4 h-4" />;
      case 'low': return <Shield className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Risk Detection
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemStatus === 'online' ? 'bg-green-400' : systemStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`} />
            <span className={`text-sm ${getStatusColor(systemStatus)}`}>
              {systemStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-700 p-3 rounded-lg">
            <div className="text-2xl font-mono text-blue-400">{currentRisks.length}</div>
            <div className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Active Risks</div>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <div className="text-2xl font-mono text-slate-200">{totalDetections}</div>
            <div className="text-sm text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Total Today</div>
          </div>
        </div>

        {/* Current Risks */}
        <div className="space-y-3">
          {currentRisks.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <p className="text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>No active risks detected</p>
              <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>System monitoring normally</p>
            </div>
          ) : (
            currentRisks.map((risk, index) => (
              <motion.div
                key={risk.id}
                className="bg-slate-700 p-4 rounded-lg border border-slate-600"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${getSeverityColor(risk.severity)}`}>
                      {getSeverityIcon(risk.severity)}
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-medium">{risk.type}</h4>
                      <p className="text-sm text-slate-400">{risk.description}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getSeverityColor(risk.severity)} text-white border-transparent`}
                  >
                    {risk.severity.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Confidence</span>
                    <span className="text-slate-200">{risk.confidence}%</span>
                  </div>
                  <Progress 
                    value={risk.confidence} 
                    className="h-2 bg-slate-600"
                  />
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-600">
                  <span className="text-xs text-slate-500 font-mono">
                    {risk.timestamp.toLocaleTimeString()}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${risk.status === 'active' ? 'border-red-500 text-red-400' : 
                      risk.status === 'tracking' ? 'border-yellow-500 text-yellow-400' : 
                      'border-green-500 text-green-400'}`}
                  >
                    {risk.status.toUpperCase()}
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}