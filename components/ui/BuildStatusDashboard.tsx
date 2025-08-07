'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Code, 
  FileText, 
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react';
import { secureAPIClient } from '@/lib/services/secure-api-client';
import { BuildStatus, BuildError, BuildWarning } from '@/lib/types/api';

interface BuildStatusDashboardProps {
  onValidationTrigger?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

interface FilterState {
  severity: 'all' | 'error' | 'warning';
  source: 'all' | 'typescript' | 'eslint' | 'build';
  searchTerm: string;
}

export default function BuildStatusDashboard({
  onValidationTrigger,
  autoRefresh = true,
  refreshInterval = 30000,
  className = ''
}: BuildStatusDashboardProps) {
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [validating, setValidating] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    severity: 'all',
    source: 'all',
    searchTerm: ''
  });

  // Fetch build status
  const fetchBuildStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await secureAPIClient.getBuildStatus();
      setBuildStatus(status);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch build status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch build status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger validation
  const triggerValidation = async () => {
    setValidating(true);
    setError(null);

    try {
      const status = await secureAPIClient.validateCode();
      setBuildStatus(status);
      setLastRefresh(new Date());
      
      if (onValidationTrigger) {
        onValidationTrigger();
      }
    } catch (err) {
      console.error('Validation failed:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchBuildStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchBuildStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBuildStatus, autoRefresh, refreshInterval]);

  // Filter issues
  const filteredIssues = React.useMemo(() => {
    if (!buildStatus) return [];
    
    const allIssues = [...buildStatus.errors, ...buildStatus.warnings];
    
    return allIssues.filter(issue => {
      // Filter by severity
      if (filters.severity !== 'all' && issue.severity !== filters.severity) {
        return false;
      }
      
      // Filter by source
      if (filters.source !== 'all' && issue.source !== filters.source) {
        return false;
      }
      
      // Filter by search term
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return (
          issue.message.toLowerCase().includes(searchLower) ||
          issue.file.toLowerCase().includes(searchLower) ||
          issue.rule?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [buildStatus, filters]);

  // Group issues by file
  const issuesByFile = React.useMemo(() => {
    const grouped: Record<string, (BuildError | BuildWarning)[]> = {};
    filteredIssues.forEach(issue => {
      if (!grouped[issue.file]) {
        grouped[issue.file] = [];
      }
      grouped[issue.file].push(issue);
    });
    return grouped;
  }, [filteredIssues]);

  // Get status color
  const getStatusColor = () => {
    if (!buildStatus) return 'text-gray-500';
    if (buildStatus.stats.errorCount > 0) return 'text-red-500';
    if (buildStatus.stats.warningCount > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (loading || validating) return RefreshCw;
    if (!buildStatus) return Clock;
    if (buildStatus.stats.errorCount > 0) return XCircle;
    if (buildStatus.stats.warningCount > 0) return AlertTriangle;
    return CheckCircle;
  };

  // Render issue item
  const renderIssue = (issue: BuildError | BuildWarning, index: number) => {
    const isError = issue.severity === 'error';
    
    return (
      <div
        key={`${issue.file}-${issue.line}-${issue.column}-${index}`}
        className={`p-3 border-l-4 ${
          isError ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
        } rounded-r-md`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isError ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
              <span className={`text-sm font-medium ${
                isError ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {issue.source.charAt(0).toUpperCase() + issue.source.slice(1)}
              </span>
              {issue.rule && (
                <code className={`px-1 py-0.5 rounded text-xs ${
                  isError ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'
                }`}>
                  {issue.rule}
                </code>
              )}
            </div>
            
            <p className={`text-sm mb-2 ${
              isError ? 'text-red-700' : 'text-yellow-700'
            }`}>
              {issue.message}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {issue.file.replace(process.cwd?.() || '', '').replace(/^\//, '')}
              </span>
              <span>Line {issue.line}:{issue.column}</span>
            </div>
          </div>
          
          <button
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Open in editor"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className={`paintbox-section ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Code className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold paintbox-gradient-text">
            Build Status
          </h3>
          {buildStatus && (
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
              <StatusIcon className={`w-5 h-5 ${
                (loading || validating) ? 'animate-spin' : ''
              }`} />
              <span className="font-medium">
                {buildStatus.success ? 'Passing' : 'Failing'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBuildStatus}
            disabled={loading}
            className="paintbox-btn paintbox-btn-secondary"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={triggerValidation}
            disabled={validating}
            className="paintbox-btn paintbox-btn-primary"
          >
            {validating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Validate
          </button>
        </div>
      </div>

      {/* Status Cards */}
      {buildStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">
                  {buildStatus.stats.totalFiles}
                </p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {buildStatus.stats.errorCount}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {buildStatus.stats.warningCount}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Build Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {buildStatus.stats.buildTime}ms
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {buildStatus && (buildStatus.errors.length > 0 || buildStatus.warnings.length > 0) && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                severity: e.target.value as FilterState['severity'] 
              }))}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All Severity</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
            </select>
            
            <select
              value={filters.source}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                source: e.target.value as FilterState['source'] 
              }))}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All Sources</option>
              <option value="typescript">TypeScript</option>
              <option value="eslint">ESLint</option>
              <option value="build">Build</option>
            </select>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-9 pr-3 py-1 border rounded-md text-sm w-64"
                placeholder="Search issues..."
              />
            </div>
            
            <div className="text-sm text-gray-500">
              {filteredIssues.length} of {buildStatus.errors.length + buildStatus.warnings.length} issues
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Issues List */}
      {buildStatus && (
        <div className="space-y-4">
          {Object.keys(issuesByFile).length === 0 ? (
            <div className="text-center py-8 text-green-600">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium">All Checks Passed!</p>
              <p className="text-sm text-gray-500 mt-1">
                No TypeScript or ESLint issues found
              </p>
            </div>
          ) : (
            Object.entries(issuesByFile).map(([file, issues]) => (
              <div key={file} className="bg-white rounded-lg border">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {file.replace(process.cwd?.() || '', '').replace(/^\//, '')}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        issues.some(i => i.severity === 'error')
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {issues.length} issue{issues.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {issues.map((issue, index) => renderIssue(issue, index))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Last Refresh Info */}
      {lastRefresh && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      {/* Loading State */}
      {loading && !buildStatus && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-500">Loading build status...</p>
        </div>
      )}
    </div>
  );
}