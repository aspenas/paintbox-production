'use client';

import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  WifiIcon,
  KeyIcon,
  BoltIcon,
  ServerIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { IntegrationError } from '@/lib/types/api';

interface IntegrationErrorHandlerProps {
  errors?: IntegrationError[];
  onRetry?: (errorId: string) => Promise<void>;
  onResolve?: (errorId: string) => Promise<void>;
  onViewDetails?: (error: IntegrationError) => void;
  loading?: boolean;
  error?: string;
}

interface ErrorCardProps {
  error: IntegrationError;
  onRetry: (id: string) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
  onViewDetails: (error: IntegrationError) => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ 
  error, 
  onRetry, 
  onResolve,
  onViewDetails 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const getErrorIcon = (type: IntegrationError['type']) => {
    switch (type) {
      case 'connection':
        return <WifiIcon className="w-5 h-5 text-red-500" />;
      case 'authentication':
        return <KeyIcon className="w-5 h-5 text-orange-500" />;
      case 'rate_limit':
        return <BoltIcon className="w-5 h-5 text-yellow-500" />;
      case 'api_error':
        return <ServerIcon className="w-5 h-5 text-red-500" />;
      case 'timeout':
        return <ClockIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case 'salesforce':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'companycam':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getErrorTypeColor = (type: IntegrationError['type']) => {
    switch (type) {
      case 'connection':
        return 'bg-red-100 text-red-800';
      case 'authentication':
        return 'bg-orange-100 text-orange-800';
      case 'rate_limit':
        return 'bg-yellow-100 text-yellow-800';
      case 'api_error':
        return 'bg-red-100 text-red-800';
      case 'timeout':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const canRetry = error.retryCount < error.maxRetries && !error.resolved;
  const nextRetryTime = error.nextRetryAt ? new Date(error.nextRetryAt) : null;
  const canRetryNow = nextRetryTime ? new Date() >= nextRetryTime : true;

  const handleRetry = async () => {
    if (!canRetry || !canRetryNow || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry(error.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleResolve = async () => {
    if (isResolving || error.resolved) return;
    
    setIsResolving(true);
    try {
      await onResolve(error.id);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className={`paintbox-card p-4 ${error.resolved ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getErrorIcon(error.type)}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getServiceColor(error.service)}`}>
                {error.service.toUpperCase()}
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getErrorTypeColor(error.type)}`}>
                {error.type.replace('_', ' ').toUpperCase()}
              </span>
              {error.resolved && (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 flex items-center">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  RESOLVED
                </span>
              )}
            </div>
            <p className="font-medium text-paintbox-text">{error.message}</p>
            <p className="text-sm text-paintbox-text-muted">
              {formatRelativeTime(error.timestamp)} • Retry {error.retryCount}/{error.maxRetries}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(error)}
            className="paintbox-btn paintbox-btn-secondary text-xs px-3 py-1"
          >
            <EyeIcon className="w-4 h-4" />
            Details
          </button>
          
          {!error.resolved && (
            <>
              {canRetry && (
                <button
                  onClick={handleRetry}
                  disabled={!canRetryNow || isRetrying}
                  className={`paintbox-btn text-xs px-3 py-1 ${
                    canRetryNow ? 'paintbox-btn-primary' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isRetrying ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowPathIcon className="w-4 h-4" />
                  )}
                  {canRetryNow ? 'Retry' : `Wait ${Math.ceil((nextRetryTime!.getTime() - new Date().getTime()) / 1000)}s`}
                </button>
              )}
              
              <button
                onClick={handleResolve}
                disabled={isResolving}
                className="paintbox-btn bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
              >
                {isResolving ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                Resolve
              </button>
            </>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {error.affectedOperations.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-paintbox-text-muted mb-2">
            Affected Operations ({error.affectedOperations.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {error.affectedOperations.slice(0, isExpanded ? undefined : 3).map((operation, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {operation}
              </span>
            ))}
            {!isExpanded && error.affectedOperations.length > 3 && (
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                +{error.affectedOperations.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-paintbox-text mb-1">Timestamp</p>
              <p className="text-paintbox-text-muted">{formatTime(error.timestamp)}</p>
            </div>
            <div>
              <p className="font-medium text-paintbox-text mb-1">Status</p>
              <p className="text-paintbox-text-muted">
                {error.resolved ? 
                  `Resolved ${error.resolvedAt ? formatRelativeTime(error.resolvedAt) : ''}` : 
                  'Unresolved'
                }
              </p>
            </div>
            {nextRetryTime && !error.resolved && (
              <div>
                <p className="font-medium text-paintbox-text mb-1">Next Retry</p>
                <p className="text-paintbox-text-muted">{formatTime(nextRetryTime)}</p>
              </div>
            )}
            {Object.keys(error.details).length > 0 && (
              <div className="sm:col-span-2">
                <p className="font-medium text-paintbox-text mb-1">Error Details</p>
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const IntegrationErrorHandler: React.FC<IntegrationErrorHandlerProps> = ({
  errors = [],
  onRetry = async () => {},
  onResolve = async () => {},
  onViewDetails = () => {},
  loading = false,
  error
}) => {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'salesforce' | 'companycam'>('all');

  const filteredErrors = errors.filter(err => {
    switch (filter) {
      case 'unresolved':
        return !err.resolved;
      case 'salesforce':
        return err.service === 'salesforce';
      case 'companycam':
        return err.service === 'companycam';
      default:
        return true;
    }
  });

  const unresolvedErrors = errors.filter(err => !err.resolved);
  const salesforceErrors = errors.filter(err => err.service === 'salesforce' && !err.resolved);
  const companycamErrors = errors.filter(err => err.service === 'companycam' && !err.resolved);

  if (loading) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-paintbox-primary animate-spin mr-3" />
          <span className="text-paintbox-text">Loading integration status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12 text-red-600">
          <ExclamationTriangleIcon className="w-8 h-8 mr-3" />
          <span>Error loading integration errors: {error}</span>
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
            Integration Monitor
          </h1>
          <p className="text-paintbox-text-muted mt-1">
            Track and resolve integration failures
          </p>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="paintbox-input w-auto min-w-40 mt-4 sm:mt-0"
        >
          <option value="all">All Errors</option>
          <option value="unresolved">Unresolved</option>
          <option value="salesforce">Salesforce</option>
          <option value="companycam">CompanyCam</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Errors', 
            value: errors.length, 
            icon: ExclamationTriangleIcon,
            color: 'text-red-600'
          },
          { 
            label: 'Unresolved', 
            value: unresolvedErrors.length,
            icon: XCircleIcon,
            color: 'text-orange-600'
          },
          { 
            label: 'Salesforce Issues', 
            value: salesforceErrors.length,
            icon: ServerIcon,
            color: 'text-blue-600'
          },
          { 
            label: 'CompanyCam Issues', 
            value: companycamErrors.length,
            icon: ServerIcon,
            color: 'text-green-600'
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

      {/* Error List */}
      <div className="paintbox-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-paintbox-text">
            Integration Errors
            {filter !== 'all' && ` (${filteredErrors.length})`}
          </h2>
        </div>
        
        {filteredErrors.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No errors found' : `No ${filter} errors`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'All integrations are running smoothly.' 
                : 'Integration issues in this category have been resolved.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredErrors.map((errorItem) => (
              <ErrorCard
                key={errorItem.id}
                error={errorItem}
                onRetry={onRetry}
                onResolve={onResolve}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationErrorHandler;