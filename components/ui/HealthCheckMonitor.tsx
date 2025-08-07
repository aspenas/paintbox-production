'use client';

import React, { useState, useEffect } from 'react';
import { 
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  WifiIcon,
  ArrowPathIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { HealthCheckResult, SystemMetrics } from '@/lib/types/api';

interface HealthCheckMonitorProps {
  healthChecks?: HealthCheckResult[];
  systemMetrics?: SystemMetrics;
  onRefresh?: () => Promise<void>;
  onViewDetails?: (healthCheck: HealthCheckResult) => void;
  loading?: boolean;
  error?: string;
  refreshInterval?: number;
}

interface ServiceHealthCardProps {
  service: string;
  healthChecks: HealthCheckResult[];
  onViewDetails: (healthCheck: HealthCheckResult) => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'healthy' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  trend, 
  status = 'healthy', 
  icon: Icon 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val > 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val > 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toFixed(1);
    }
    return val;
  };

  return (
    <div className={`paintbox-card p-4 border ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6" />
        {trend && (
          <div className={`text-xs px-2 py-1 rounded ${
            trend === 'up' ? 'bg-green-100 text-green-700' :
            trend === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        )}
      </div>
      <div className="mb-1">
        <span className="text-2xl font-bold text-paintbox-text">
          {formatValue(value)}
        </span>
        {unit && <span className="text-sm text-paintbox-text-muted ml-1">{unit}</span>}
      </div>
      <p className="text-sm font-medium text-paintbox-text-muted">{title}</p>
    </div>
  );
};

const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({ 
  service, 
  healthChecks, 
  onViewDetails 
}) => {
  const latestCheck = healthChecks
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (!latestCheck) {
    return (
      <div className="paintbox-card p-4 border border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ServerIcon className="w-6 h-6 text-gray-400" />
            <div>
              <h3 className="font-semibold text-paintbox-text">{service}</h3>
              <p className="text-sm text-paintbox-text-muted">No health checks available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'unhealthy':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'unhealthy':
        return 'bg-red-50 border-red-200';
      case 'degraded':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatResponseTime = (time: number) => {
    if (time > 1000) return `${(time / 1000).toFixed(2)}s`;
    return `${time}ms`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className={`paintbox-card p-4 border ${getStatusColor(latestCheck.status)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(latestCheck.status)}
          <div>
            <h3 className="font-semibold text-paintbox-text">{service}</h3>
            <p className="text-sm text-paintbox-text-muted">
              {latestCheck.endpoint}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onViewDetails(latestCheck)}
          className="paintbox-btn paintbox-btn-secondary text-xs px-3 py-1"
        >
          <EyeIcon className="w-4 h-4" />
          Details
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Response Time</p>
          <p className="text-lg font-semibold text-paintbox-text">
            {formatResponseTime(latestCheck.responseTime)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Status Code</p>
          <p className="text-lg font-semibold text-paintbox-text">
            {latestCheck.statusCode || 'N/A'}
          </p>
        </div>
      </div>

      {latestCheck.metrics && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center">
            <CpuChipIcon className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-paintbox-text-muted">CPU</p>
            <p className="text-sm font-medium">{latestCheck.metrics.cpu.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <CircleStackIcon className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xs text-paintbox-text-muted">Memory</p>
            <p className="text-sm font-medium">{latestCheck.metrics.memory.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <WifiIcon className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-paintbox-text-muted">Connections</p>
            <p className="text-sm font-medium">{latestCheck.metrics.connections}</p>
          </div>
        </div>
      )}

      <div className="text-xs text-paintbox-text-muted">
        Last checked: {formatTime(latestCheck.timestamp)}
      </div>
      
      {latestCheck.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Error:</strong> {latestCheck.error}
        </div>
      )}
    </div>
  );
};

const HealthCheckMonitor: React.FC<HealthCheckMonitorProps> = ({
  healthChecks = [],
  systemMetrics,
  onRefresh = async () => {},
  onViewDetails = () => {},
  loading = false,
  error,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh functionality
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(async () => {
      await handleRefresh(false); // Silent refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleRefresh = async (manual = true) => {
    if (manual) setIsRefreshing(true);
    
    try {
      await onRefresh();
      setLastRefresh(new Date());
    } finally {
      if (manual) setIsRefreshing(false);
    }
  };

  // Group health checks by service
  const serviceHealthChecks = healthChecks.reduce((acc, check) => {
    if (!acc[check.service]) acc[check.service] = [];
    acc[check.service].push(check);
    return acc;
  }, {} as Record<string, HealthCheckResult[]>);

  const services = Object.keys(serviceHealthChecks);
  const healthyServices = services.filter(service => {
    const checks = serviceHealthChecks[service];
    const latestCheck = checks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    return latestCheck?.status === 'healthy';
  });

  const unhealthyServices = services.filter(service => {
    const checks = serviceHealthChecks[service];
    const latestCheck = checks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    return latestCheck?.status === 'unhealthy';
  });

  const degradedServices = services.filter(service => {
    const checks = serviceHealthChecks[service];
    const latestCheck = checks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    return latestCheck?.status === 'degraded';
  });

  if (loading) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-paintbox-primary animate-spin mr-3" />
          <span className="text-paintbox-text">Loading health status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12 text-red-600">
          <ExclamationTriangleIcon className="w-8 h-8 mr-3" />
          <span>Error loading health status: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold paintbox-gradient-text">
            Health Monitor
          </h1>
          <p className="text-paintbox-text-muted mt-1">
            Real-time system health and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <span className="text-sm text-paintbox-text-muted">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => handleRefresh()}
            disabled={isRefreshing}
            className="paintbox-btn paintbox-btn-primary"
          >
            {isRefreshing ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowPathIcon className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Services', 
            value: services.length, 
            icon: ServerIcon,
            color: 'text-blue-600'
          },
          { 
            label: 'Healthy Services', 
            value: healthyServices.length,
            icon: CheckCircleIcon,
            color: 'text-green-600'
          },
          { 
            label: 'Degraded Services', 
            value: degradedServices.length,
            icon: ExclamationTriangleIcon,
            color: 'text-orange-600'
          },
          { 
            label: 'Unhealthy Services', 
            value: unhealthyServices.length,
            icon: XCircleIcon,
            color: 'text-red-600'
          }
        ].map((stat, index) => (
          <div key={index} className="paintbox-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-paintbox-text">{stat.value}</p>
                <p className="text-sm text-paintbox-text-muted">{stat.label}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <div className="paintbox-section">
          <h2 className="text-xl font-semibold text-paintbox-text mb-4">
            System Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Avg Deployment Duration"
              value={systemMetrics.deployments.averageDuration}
              unit="min"
              icon={ChartBarIcon}
              status="healthy"
            />
            <MetricCard
              title="Salesforce Response"
              value={systemMetrics.integrations.salesforce.responseTime}
              unit="ms"
              icon={WifiIcon}
              status={systemMetrics.integrations.salesforce.status === 'healthy' ? 'healthy' : 'warning'}
            />
            <MetricCard
              title="CompanyCam Response"
              value={systemMetrics.integrations.companycam.responseTime}
              unit="ms"
              icon={WifiIcon}
              status={systemMetrics.integrations.companycam.status === 'healthy' ? 'healthy' : 'warning'}
            />
            <MetricCard
              title="Secrets Expiring Soon"
              value={systemMetrics.secrets.expiringSoon}
              icon={ClockIcon}
              status={systemMetrics.secrets.expiringSoon > 5 ? 'critical' : 'healthy'}
            />
          </div>
        </div>
      )}

      {/* Service Health Cards */}
      <div className="paintbox-section">
        <h2 className="text-xl font-semibold text-paintbox-text mb-4">
          Service Health Status
        </h2>
        
        {services.length === 0 ? (
          <div className="text-center py-12">
            <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No health checks available</h3>
            <p className="text-gray-500">
              Health checks will appear here once services start reporting their status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {services.map((service) => (
              <ServiceHealthCard
                key={service}
                service={service}
                healthChecks={serviceHealthChecks[service]}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthCheckMonitor;