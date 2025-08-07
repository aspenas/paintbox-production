'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DeploymentLog } from '@/lib/types/api';

interface LogsState {
  logs: DeploymentLog[];
  connected: boolean;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

interface LogsActions {
  connect: (deploymentId: string) => void;
  disconnect: () => void;
  clearLogs: () => void;
  exportLogs: () => string;
}

interface UseDeploymentLogsOptions {
  autoConnect?: boolean;
  maxLogs?: number;
  reconnectInterval?: number;
  bufferSize?: number;
}

export const useDeploymentLogs = (
  deploymentId?: string, 
  options: UseDeploymentLogsOptions = {}
): LogsState & LogsActions => {
  const {
    autoConnect = true,
    maxLogs = 1000,
    reconnectInterval = 5000,
    bufferSize = 100
  } = options;

  const [state, setState] = useState<LogsState>({
    logs: [],
    connected: false,
    loading: false,
    error: null,
    lastUpdate: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentDeploymentId = useRef<string | null>(null);
  const logBuffer = useRef<DeploymentLog[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buffer logs to prevent too frequent state updates
  const bufferLog = useCallback((log: DeploymentLog) => {
    logBuffer.current.push(log);
    
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    flushTimeoutRef.current = setTimeout(() => {
      if (logBuffer.current.length > 0) {
        setState(prev => ({
          ...prev,
          logs: [...prev.logs, ...logBuffer.current].slice(-maxLogs),
          lastUpdate: new Date()
        }));
        logBuffer.current = [];
      }
    }, 100); // Flush every 100ms
  }, [maxLogs]);

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    clearReconnectTimeout();
    
    if (currentDeploymentId.current) {
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!state.connected && currentDeploymentId.current) {
          console.log('Attempting to reconnect to deployment logs...');
          connect(currentDeploymentId.current);
        }
      }, reconnectInterval);
    }
  }, [state.connected, reconnectInterval]);

  // Connect to WebSocket
  const connect = useCallback((deploymentId: string) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    currentDeploymentId.current = deploymentId;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // In a real implementation, this would connect to your WebSocket server
      // For now, we'll simulate with a mock WebSocket
      const ws = createMockWebSocket(deploymentId);
      
      ws.onopen = () => {
        console.log('Connected to deployment logs:', deploymentId);
        setState(prev => ({
          ...prev,
          connected: true,
          loading: false,
          error: null
        }));
        clearReconnectTimeout();
      };

      ws.onmessage = (event) => {
        try {
          const log: DeploymentLog = JSON.parse(event.data);
          bufferLog(log);
        } catch (error) {
          console.error('Failed to parse log message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'Connection error occurred'
        }));
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          connected: false,
          loading: false
        }));
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && currentDeploymentId.current) {
          setState(prev => ({
            ...prev,
            error: 'Connection lost. Attempting to reconnect...'
          }));
          reconnect();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to connect'
      }));
    }
  }, [bufferLog, clearReconnectTimeout, reconnect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    currentDeploymentId.current = null;
    clearReconnectTimeout();
    
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      connected: false,
      loading: false,
      error: null
    }));
  }, [clearReconnectTimeout]);

  // Clear logs
  const clearLogs = useCallback(() => {
    logBuffer.current = [];
    setState(prev => ({
      ...prev,
      logs: [],
      lastUpdate: null
    }));
  }, []);

  // Export logs as text
  const exportLogs = useCallback(() => {
    return state.logs
      .map(log => `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.service ? `[${log.service}] ` : ''}${log.message}`)
      .join('\n');
  }, [state.logs]);

  // Auto-connect on mount if deploymentId provided
  useEffect(() => {
    if (autoConnect && deploymentId && !state.connected) {
      connect(deploymentId);
    }
    
    return () => {
      disconnect();
    };
  }, [deploymentId, autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    clearLogs,
    exportLogs
  };
};

// Mock WebSocket implementation for demonstration
function createMockWebSocket(deploymentId: string): WebSocket {
  const mockWs = {
    readyState: WebSocket.CONNECTING,
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    onclose: null as ((event: CloseEvent) => void) | null,
    close: (code?: number, reason?: string) => {
      mockWs.readyState = WebSocket.CLOSED;
      if (mockWs.onclose) {
        mockWs.onclose({ 
          code: code || 1000, 
          reason: reason || '', 
          wasClean: true 
        } as CloseEvent);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  } as WebSocket;

  // Simulate connection opening
  setTimeout(() => {
    mockWs.readyState = WebSocket.OPEN;
    if (mockWs.onopen) {
      mockWs.onopen({} as Event);
    }
  }, 500);

  // Simulate log messages
  const logMessages = [
    { level: 'info', message: 'Deployment started', service: 'deploy-manager' },
    { level: 'info', message: 'Building Docker image', service: 'docker' },
    { level: 'debug', message: 'Pulling base image node:18-alpine', service: 'docker' },
    { level: 'info', message: 'Installing dependencies', service: 'npm' },
    { level: 'warn', message: 'Peer dependency warning detected', service: 'npm' },
    { level: 'info', message: 'Running tests', service: 'jest' },
    { level: 'info', message: 'All tests passed', service: 'jest' },
    { level: 'info', message: 'Building application', service: 'webpack' },
    { level: 'info', message: 'Optimizing assets', service: 'webpack' },
    { level: 'info', message: 'Pushing to registry', service: 'docker' },
    { level: 'info', message: 'Updating service configuration', service: 'k8s' },
    { level: 'info', message: 'Rolling out new version', service: 'k8s' },
    { level: 'info', message: 'Health check passed', service: 'health-checker' },
    { level: 'info', message: 'Deployment completed successfully', service: 'deploy-manager' }
  ];

  let messageIndex = 0;
  const intervalId = setInterval(() => {
    if (mockWs.readyState === WebSocket.OPEN && mockWs.onmessage && messageIndex < logMessages.length) {
      const logMessage = logMessages[messageIndex];
      const log: DeploymentLog = {
        id: `log-${Date.now()}-${messageIndex}`,
        deploymentId,
        timestamp: new Date(),
        level: logMessage.level as DeploymentLog['level'],
        message: logMessage.message,
        service: logMessage.service,
        metadata: {
          sequence: messageIndex,
          totalSteps: logMessages.length
        }
      };

      mockWs.onmessage({
        data: JSON.stringify(log)
      } as MessageEvent);

      messageIndex++;

      // Complete deployment after last message
      if (messageIndex >= logMessages.length) {
        setTimeout(() => {
          mockWs.close(1000, 'Deployment completed');
        }, 1000);
      }
    }
  }, 1000 + Math.random() * 2000); // Random interval between 1-3 seconds

  return mockWs;
}