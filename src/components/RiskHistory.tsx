import { useState } from 'react';
import { motion } from 'motion/react';
import { History, Filter, Calendar, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';

interface HistoricalRisk {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  timestamp: Date;
  duration: number; // in seconds
  status: 'resolved' | 'escalated' | 'false-positive';
  location: string;
}

interface RiskHistoryProps {
  historicalRisks: HistoricalRisk[];
}

export function RiskHistory({ historicalRisks }: RiskHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('24h');

  const filteredRisks = historicalRisks.filter(risk => {
    const matchesSearch = risk.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         risk.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || risk.severity === severityFilter;
    
    let matchesTime = true;
    const now = new Date();
    const riskTime = risk.timestamp;
    
    switch (timeFilter) {
      case '1h':
        matchesTime = (now.getTime() - riskTime.getTime()) <= 60 * 60 * 1000;
        break;
      case '24h':
        matchesTime = (now.getTime() - riskTime.getTime()) <= 24 * 60 * 60 * 1000;
        break;
      case '7d':
        matchesTime = (now.getTime() - riskTime.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        break;
    }
    
    return matchesSearch && matchesSeverity && matchesTime;
  });

  const getSeverityColor = (severity: HistoricalRisk['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusColor = (status: HistoricalRisk['status']) => {
    switch (status) {
      case 'resolved': return 'border-green-500 text-green-400';
      case 'escalated': return 'border-red-500 text-red-400';
      case 'false-positive': return 'border-gray-500 text-gray-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <Card className="bg-slate-800 border-slate-700 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400"  style={{ fontFamily: 'Poppins, sans-serif' }}/>
            Risk History
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search risks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="flex-1 bg-slate-700 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all" style={{ fontFamily: 'Poppins, sans-serif' }}>All Severities</SelectItem>
                <SelectItem value="critical" style={{ fontFamily: 'Poppins, sans-serif' }}>Critical</SelectItem>
                <SelectItem value="high" style={{ fontFamily: 'Poppins, sans-serif' }}>High</SelectItem>
                <SelectItem value="medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Medium</SelectItem>
                <SelectItem value="low" style={{ fontFamily: 'Poppins, sans-serif' }}>Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="flex-1 bg-slate-700 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="1h" style={{ fontFamily: 'Poppins, sans-serif' }}>Last Hour</SelectItem>
                <SelectItem value="24h" style={{ fontFamily: 'Poppins, sans-serif' }}>Last 24h</SelectItem>
                <SelectItem value="7d" style={{ fontFamily: 'Poppins, sans-serif' }}>Last 7 days</SelectItem>
                <SelectItem value="all" style={{ fontFamily: 'Poppins, sans-serif' }}>All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Risk List */}
        <ScrollArea className="h-96">
          <div className="space-y-3 pr-4">
            {filteredRisks.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>No risks found</p>
                <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Try adjusting your filters</p>
              </div>
            ) : (
              filteredRisks.map((risk, index) => (
                <motion.div
                  key={risk.id}
                  className="bg-slate-700 p-3 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(risk.severity)}`} />
                      <div>
                        <h4 className="text-slate-200 text-sm font-medium">{risk.type}</h4>
                        <p className="text-xs text-slate-400 mt-1">{risk.description}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(risk.status)}`}
                    >
                      {risk.status.replace('-', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="text-slate-500">
                      <span className="font-mono">{risk.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Duration: {formatDuration(risk.duration)}
                    </div>
                    <div className="text-slate-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Confidence: {risk.confidence}%
                    </div>
                    <div className="text-slate-500">
                      {risk.location}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Summary Stats */}
        <div className="pt-4 border-t border-slate-600">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-mono text-slate-200">{filteredRisks.length}</div>
              <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Found</div>
            </div>
            <div>
              <div className="text-lg font-mono text-red-400">
                {filteredRisks.filter(r => r.severity === 'critical' || r.severity === 'high').length}
              </div>
              <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>High Risk</div>
            </div>
            <div>
              <div className="text-lg font-mono text-green-400">
                {filteredRisks.filter(r => r.status === 'resolved').length}
              </div>
              <div className="text-xs text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>Resolved</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}