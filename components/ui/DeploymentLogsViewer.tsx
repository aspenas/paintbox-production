'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  WifiIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { DeploymentLog } from '@/lib/types/api';
import { useDeploymentLogs } from '@/hooks/useDeploymentLogs';

interface DeploymentLogsViewerProps {
  deploymentId: string;
  onClose?: () => void;
  autoScroll?: boolean;
  height?: string;
}

interface LogFilters {
  levels: Set<DeploymentLog['level']>;
  services: Set<string>;
  searchTerm: string;
}

const LogLevelBadge: React.FC<{ level: DeploymentLog['level'] }> = ({ level }) => {
  const getStyles = (level: DeploymentLog['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warn':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'debug':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStyles(level)}`}>
      {level.toUpperCase()}
    </span>
  );
};

const ServiceBadge: React.FC<{ service?: string }> = ({ service }) => {
  if (!service) return null;

  return (
    <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 border border-purple-200">
      {service}
    </span>
  );
};

const LogLine: React.FC<{ 
  log: DeploymentLog; 
  searchTerm: string;
  isHighlighted?: boolean;
}> = ({ log, searchTerm, isHighlighted }) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className={`
      flex items-start space-x-3 py-2 px-4 text-sm font-mono border-l-2 hover:bg-gray-50
      ${isHighlighted ? 'bg-yellow-50 border-l-yellow-400' : 'border-l-transparent'}
    `}>
      <span className="text-gray-500 text-xs w-20 flex-shrink-0 mt-1">
        {formatTime(log.timestamp)}
      </span>
      
      <div className="flex items-center space-x-2 flex-shrink-0">
        <LogLevelBadge level={log.level} />
        <ServiceBadge service={log.service} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="break-words">
          {highlightText(log.message, searchTerm)}
        </p>
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <details className="mt-1">
            <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-700">
              Metadata
            </summary>
            <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

const DeploymentLogsViewer: React.FC<DeploymentLogsViewerProps> = ({
  deploymentId,
  onClose,
  autoScroll = true,
  height = '500px'
}) => {
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({
    levels: new Set(['error', 'warn', 'info', 'debug']),
    services: new Set(),
    searchTerm: ''
  });

  const { 
    logs, 
    connected, 
    loading, 
    error, 
    lastUpdate,
    connect,
    disconnect,
    clearLogs,
    exportLogs
  } = useDeploymentLogs(deploymentId, {
    maxLogs: 1000,
    autoConnect: true
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && !isPaused && logsContainerRef.current) {
      const container = logsContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  // Get unique services for filter options
  const availableServices = Array.from(
    new Set(logs.map(log => log.service).filter(Boolean))
  ).sort();

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    // Level filter
    if (!filters.levels.has(log.level)) return false;
    
    // Service filter
    if (filters.services.size > 0 && log.service && !filters.services.has(log.service)) return false;
    
    // Search filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      return log.message.toLowerCase().includes(searchLower) ||
             (log.service && log.service.toLowerCase().includes(searchLower));
    }
    
    return true;
  });

  const toggleLevel = (level: DeploymentLog['level']) => {
    const newLevels = new Set(filters.levels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setFilters(prev => ({ ...prev, levels: newLevels }));
  };

  const toggleService = (service: string) => {
    const newServices = new Set(filters.services);
    if (newServices.has(service)) {
      newServices.delete(service);
    } else {
      newServices.add(service);
    }
    setFilters(prev => ({ ...prev, services: newServices }));
  };

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  const handleExport = () => {
    const exportData = exportLogs();
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-${deploymentId}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="paintbox-card flex flex-col" style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-paintbox-text">
            Deployment Logs
          </h3>
          <div className="flex items-center space-x-2">
            {connected ? (
              <div className="flex items-center space-x-1 text-green-600">
                <WifiIcon className="w-4 h-4" />
                <span className="text-sm">Connected</span>
              </div>
            ) : error ? (
              <div className="flex items-center space-x-1 text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">Disconnected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-500">
                <WifiIcon className="w-4 h-4" />
                <span className="text-sm">Connecting...</span>
              </div>
            )}
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`paintbox-btn paintbox-btn-secondary text-xs px-3 py-1 ${
              showFilters ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            Filters
          </button>
          
          <button
            onClick={scrollToBottom}
            className="paintbox-btn paintbox-btn-secondary text-xs px-3 py-1"
          >
            <ArrowDownIcon className="w-4 h-4" />
            Bottom
          </button>
          
          <button
            onClick={handleExport}
            className="paintbox-btn paintbox-btn-secondary text-xs px-3 py-1"
            disabled={filteredLogs.length === 0}
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`paintbox-btn text-xs px-3 py-1 ${
              isPaused ? 'bg-green-600 text-white hover:bg-green-700' : 'paintbox-btn-secondary'
            }`}
          >
            {isPaused ? (
              <>
                <PlayIcon className="w-4 h-4" />
                Resume
              </>
            ) : (
              <>
                <PauseIcon className="w-4 h-4" />
                Pause
              </>
            )}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="paintbox-btn paintbox-btn-secondary p-1"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Logs
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="paintbox-input pl-10"
                placeholder="Search in messages..."
              />
            </div>
          </div>

          {/* Log Levels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Levels
            </label>
            <div className="flex flex-wrap gap-2">
              {(['error', 'warn', 'info', 'debug'] as DeploymentLog['level'][]).map((level) => (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                    filters.levels.has(level)
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Services */}
          {availableServices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services ({filters.services.size === 0 ? 'All' : filters.services.size} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableServices.map((service) => (
                  <button
                    key={service}
                    onClick={() => toggleService(service)}
                    className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                      filters.services.has(service) || filters.services.size === 0
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>
        </div>
      )}

      {/* Logs Content */}
      <div 
        ref={logsContainerRef}
        className="flex-1 overflow-auto bg-white"
      >
        {loading && logs.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading deployment logs...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <span className="text-red-800 font-medium">Connection Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={() => connect(deploymentId)}
              className="mt-2 paintbox-btn paintbox-btn-primary text-sm px-3 py-1"
            >
              Reconnect
            </button>
          </div>
        )}

        {filteredLogs.length === 0 && !loading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600 mb-2">No logs match your filters</p>
              <p className="text-sm text-gray-500">
                Try adjusting your search terms or filters
              </p>
            </div>
          </div>
        )}

        {filteredLogs.map((log, index) => (
          <LogLine
            key={log.id}
            log={log}
            searchTerm={filters.searchTerm}
            isHighlighted={filters.searchTerm && log.message.toLowerCase().includes(filters.searchTerm.toLowerCase())}
          />
        ))}

        {isPaused && (
          <div className="sticky bottom-0 bg-yellow-50 border-t border-yellow-200 p-2 text-center">
            <span className="text-yellow-800 text-sm">
              Log streaming is paused. Click Resume to continue.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentLogsViewer;