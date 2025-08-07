'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Activity, 
  Zap, 
  Database, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';
import { secureAPIClient } from '@/lib/services/secure-api-client';
import { PerformanceMetrics as Metrics } from '@/lib/types/api';

interface PerformanceMetricsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showCharts?: boolean;
  className?: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  status: 'good' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
}

export default function PerformanceMetrics({
  autoRefresh = true,
  refreshInterval = 10000,
  showCharts = true,
  className = ''
}: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [historicalData, setHistoricalData] = useState<Metrics[]>([]);

  // Fetch performance metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await secureAPIClient.getPerformanceMetrics();
      setMetrics(data);
      setLastRefresh(new Date());
      
      // Keep historical data for trends
      setHistoricalData(prev => {
        const updated = [...prev, data];
        return updated.slice(-20); // Keep last 20 data points
      });
    } catch (err) {
      console.error('Failed to fetch performance metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, autoRefresh, refreshInterval]);

  // Calculate trends
  const calculateTrend = useCallback((current: number, historical: number[]): { trend: 'up' | 'down' | 'neutral'; value: number } => {
    if (historical.length < 2) return { trend: 'neutral', value: 0 };
    
    const previous = historical[historical.length - 2];
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 1) return { trend: 'neutral', value: 0 };
    return { trend: change > 0 ? 'up' : 'down', value: Math.abs(change) };
  }, []);

  // Determine status based on value and thresholds
  const getStatus = (value: number, thresholds: { warning: number; critical: number }): 'good' | 'warning' | 'critical' => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'good';
  };

  // Build metric cards
  const metricCards: MetricCard[] = useMemo(() => {
    if (!metrics) return [];

    const formulaTimes = historicalData.map(d => d.formulaCalculation.averageTime);
    const cacheHitRates = historicalData.map(d => d.formulaCalculation.cacheHitRate);
    const memoryUsage = historicalData.map(d => (d.memoryUsage.heapUsed / d.memoryUsage.heapTotal) * 100);

    return [
      {
        title: 'Avg Formula Time',
        value: metrics.formulaCalculation.averageTime,
        unit: 'ms',
        ...calculateTrend(metrics.formulaCalculation.averageTime, formulaTimes),
        status: getStatus(metrics.formulaCalculation.averageTime, { warning: 100, critical: 500 }),
        icon: Zap
      },
      {
        title: 'Cache Hit Rate',
        value: (metrics.formulaCalculation.cacheHitRate * 100).toFixed(1),
        unit: '%',
        ...calculateTrend(metrics.formulaCalculation.cacheHitRate, cacheHitRates),
        status: metrics.formulaCalculation.cacheHitRate > 0.8 ? 'good' : 
               metrics.formulaCalculation.cacheHitRate > 0.5 ? 'warning' : 'critical',
        icon: Database
      },
      {
        title: 'Total Calculations',
        value: metrics.formulaCalculation.totalCalculations.toLocaleString(),
        status: 'good',
        trend: 'neutral',
        icon: BarChart3
      },
      {
        title: 'P95 Response Time',
        value: metrics.formulaCalculation.p95Time,
        unit: 'ms',
        status: getStatus(metrics.formulaCalculation.p95Time, { warning: 200, critical: 1000 }),
        trend: 'neutral',
        icon: Clock
      },
      {
        title: 'Salesforce Success',
        value: (metrics.apiRequests.salesforceSearch.successRate * 100).toFixed(1),
        unit: '%',
        status: metrics.apiRequests.salesforceSearch.successRate > 0.95 ? 'good' :
               metrics.apiRequests.salesforceSearch.successRate > 0.8 ? 'warning' : 'critical',
        trend: 'neutral',
        icon: Wifi
      },
      {
        title: 'Memory Usage',
        value: ((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100).toFixed(1),
        unit: '%',
        ...calculateTrend((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100, memoryUsage),
        status: getStatus((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100, { warning: 70, critical: 90 }),
        icon: Cpu
      },
      {
        title: 'Cache Size',
        value: (metrics.cacheStats.size / (1024 * 1024)).toFixed(1),
        unit: 'MB',
        status: 'good',
        trend: 'neutral',
        icon: HardDrive
      },
      {
        title: 'Cache Evictions',
        value: metrics.cacheStats.evictions,
        status: metrics.cacheStats.evictions > 100 ? 'warning' : 'good',
        trend: 'neutral',
        icon: AlertTriangle
      }
    ];
  }, [metrics, historicalData, calculateTrend]);

  // Render metric card
  const renderMetricCard = (metric: MetricCard, index: number) => {
    const statusColors = {
      good: 'border-green-500 bg-green-50',
      warning: 'border-yellow-500 bg-yellow-50',
      critical: 'border-red-500 bg-red-50'
    };

    const statusIconColors = {
      good: 'text-green-500',
      warning: 'text-yellow-500',
      critical: 'text-red-500'
    };

    const trendColors = {
      up: 'text-red-500',
      down: 'text-green-500',
      neutral: 'text-gray-500'
    };

    const TrendIcon = metric.trend === 'up' ? TrendingUp : 
                     metric.trend === 'down' ? TrendingDown : 
                     Activity;

    return (
      <div
        key={index}
        className={`bg-white p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${statusColors[metric.status]}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <metric.icon className={`w-5 h-5 ${statusIconColors[metric.status]}`} />
            <span className="text-sm font-medium text-gray-700">{metric.title}</span>
          </div>
          {metric.trend !== 'neutral' && metric.trendValue && (
            <div className={`flex items-center gap-1 ${trendColors[metric.trend]}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs font-medium">
                {metric.trendValue.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              {typeof metric.value === 'number' 
                ? metric.value.toLocaleString() 
                : metric.value
              }
            </span>
            {metric.unit && (
              <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>
            )}
          </div>
          
          {metric.status === 'good' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : metric.status === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>
    );
  };

  // Render simple chart for cache stats
  const renderCacheChart = () => {
    if (!metrics) return null;
    
    const { hits, misses } = metrics.cacheStats;
    const total = hits + misses;
    const hitPercentage = total > 0 ? (hits / total) * 100 : 0;
    const missPercentage = 100 - hitPercentage;

    return (
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-purple-600" />
          <h4 className="font-medium">Cache Performance</h4>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Cache Hits</span>
            <span className="font-medium text-green-600">
              {hits.toLocaleString()} ({hitPercentage.toFixed(1)}%)
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${hitPercentage}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Cache Misses</span>
            <span className="font-medium text-red-600">
              {misses.toLocaleString()} ({missPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render response time distribution
  const renderResponseTimeChart = () => {
    if (!metrics) return null;

    const { averageTime, medianTime, p95Time, p99Time } = metrics.formulaCalculation;
    const maxTime = Math.max(averageTime, medianTime, p95Time, p99Time);

    const percentiles = [
      { label: 'Average', value: averageTime, color: 'bg-blue-500' },
      { label: 'Median', value: medianTime, color: 'bg-green-500' },
      { label: 'P95', value: p95Time, color: 'bg-yellow-500' },
      { label: 'P99', value: p99Time, color: 'bg-red-500' }
    ];

    return (
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h4 className="font-medium">Formula Response Times</h4>
        </div>
        
        <div className="space-y-3">
          {percentiles.map((percentile, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{percentile.label}</span>
                <span className="font-medium">{percentile.value}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${percentile.color}`}
                  style={{ width: `${(percentile.value / maxTime) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`paintbox-section ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold paintbox-gradient-text">
            Performance Metrics
          </h3>
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="paintbox-btn paintbox-btn-secondary"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !metrics && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-500">Loading performance metrics...</p>
        </div>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metricCards.map((metric, index) => renderMetricCard(metric, index))}
          </div>

          {/* Charts */}
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {renderCacheChart()}
              {renderResponseTimeChart()}
            </div>
          )}

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formula Calculation Stats */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium">Formula Calculations</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{metrics.formulaCalculation.totalCalculations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average:</span>
                  <span className="font-medium">{metrics.formulaCalculation.averageTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Median:</span>
                  <span className="font-medium">{metrics.formulaCalculation.medianTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cache Hit Rate:</span>
                  <span className="font-medium">{(metrics.formulaCalculation.cacheHitRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* API Performance */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-5 h-5 text-green-600" />
                <h4 className="font-medium">API Performance</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">SF Avg Time:</span>
                  <span className="font-medium">{metrics.apiRequests.salesforceSearch.averageTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SF Success Rate:</span>
                  <span className="font-medium">{(metrics.apiRequests.salesforceSearch.successRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SF Error Rate:</span>
                  <span className="font-medium">{(metrics.apiRequests.salesforceSearch.errorRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium">Memory Usage</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Heap Used:</span>
                  <span className="font-medium">{(metrics.memoryUsage.heapUsed / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Heap Total:</span>
                  <span className="font-medium">{(metrics.memoryUsage.heapTotal / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">External:</span>
                  <span className="font-medium">{(metrics.memoryUsage.external / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Usage:</span>
                  <span className="font-medium">
                    {((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}