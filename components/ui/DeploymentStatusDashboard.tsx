'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  EyeIcon,
  ChevronRightIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { Deployment, DeploymentLog, DeploymentRequest } from '@/lib/types/api';

interface DeploymentStatusDashboardProps {
  deployments?: Deployment[];
  onTriggerDeployment?: (request: DeploymentRequest) => Promise<void>;
  onRollback?: (deploymentId: string) => Promise<void>;
  onViewLogs?: (deploymentId: string) => void;
  loading?: boolean;
  error?: string;
}

interface DeploymentCardProps {
  deployment: Deployment;
  onRollback: (id: string) => Promise<void>;
  onViewLogs: (id: string) => void;
}

const DeploymentCard: React.FC<DeploymentCardProps> = ({ 
  deployment, 
  onRollback, 
  onViewLogs 
}) => {
  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'rolling_back':
        return <ArrowPathIcon className="w-5 h-5 text-orange-500 animate-spin" />;
      case 'rolled_back':
        return <ExclamationCircleIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Deployment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      case 'rolling_back':
        return 'bg-orange-50 border-orange-200';
      case 'rolled_back':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className={`paintbox-card ${getStatusColor(deployment.status)} p-4 transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon(deployment.status)}
          <div>
            <h3 className="font-semibold text-paintbox-text">
              {deployment.environment.toUpperCase()}
            </h3>
            <p className="text-sm text-paintbox-text-muted">
              {deployment.branch} • {deployment.commit.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onViewLogs(deployment.id)}
            className="paintbox-btn paintbox-btn-secondary text-xs px-3 py-1"
          >
            <EyeIcon className="w-4 h-4" />
            Logs
          </button>
          {(deployment.status === 'completed' || deployment.status === 'failed') && (
            <button
              onClick={() => onRollback(deployment.id)}
              className="paintbox-btn paintbox-btn-secondary text-xs px-3 py-1"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Rollback
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Started</p>
          <p className="text-sm text-paintbox-text">{formatTime(deployment.startTime)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Duration</p>
          <p className="text-sm text-paintbox-text">{formatDuration(deployment.duration)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Services</p>
          <p className="text-sm text-paintbox-text">{deployment.services.length}</p>
        </div>
      </div>

      {deployment.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {deployment.services.map((service, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              <ServerIcon className="w-3 h-3 mr-1" />
              {service}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const DeploymentStatusDashboard: React.FC<DeploymentStatusDashboardProps> = ({
  deployments = [],
  onTriggerDeployment,
  onRollback = async () => {},
  onViewLogs = () => {},
  loading = false,
  error
}) => {
  const [selectedEnvironment, setSelectedEnvironment] = useState<'staging' | 'production'>('staging');
  const [isDeploying, setIsDeploying] = useState(false);

  const recentDeployments = deployments
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 6);

  const activeDeployments = deployments.filter(
    d => d.status === 'in_progress' || d.status === 'rolling_back'
  );

  const handleTriggerDeployment = async () => {
    if (!onTriggerDeployment) return;
    
    setIsDeploying(true);
    try {
      await onTriggerDeployment({
        environment: selectedEnvironment,
        options: {
          blueGreen: selectedEnvironment === 'production',
          rollbackOnFailure: true,
          healthCheckTimeout: 300
        }
      });
    } catch (err) {
      console.error('Deployment failed:', err);
    } finally {
      setIsDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-paintbox-primary animate-spin mr-3" />
          <span className="text-paintbox-text">Loading deployments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12 text-red-600">
          <ExclamationCircleIcon className="w-8 h-8 mr-3" />
          <span>Error loading deployments: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Deploy Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold paintbox-gradient-text">
            Deployment Dashboard
          </h1>
          <p className="text-paintbox-text-muted mt-1">
            Monitor and manage production deployments
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value as 'staging' | 'production')}
            className="paintbox-input w-auto min-w-32"
            disabled={isDeploying}
          >
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
          
          <button
            onClick={handleTriggerDeployment}
            disabled={isDeploying || activeDeployments.length > 0}
            className="paintbox-btn paintbox-btn-primary"
          >
            {isDeploying ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            Deploy
          </button>
        </div>
      </div>

      {/* Active Deployments Alert */}
      {activeDeployments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin mr-2" />
            <h3 className="font-medium text-blue-800">
              {activeDeployments.length} Active Deployment{activeDeployments.length > 1 ? 's' : ''}
            </h3>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Deployments are currently in progress. New deployments are temporarily disabled.
          </p>
        </div>
      )}

      {/* Deployment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Deployments', 
            value: deployments.length, 
            icon: ServerIcon,
            color: 'text-blue-600'
          },
          { 
            label: 'Successful', 
            value: deployments.filter(d => d.status === 'completed').length,
            icon: CheckCircleIcon,
            color: 'text-green-600'
          },
          { 
            label: 'Failed', 
            value: deployments.filter(d => d.status === 'failed').length,
            icon: ExclamationCircleIcon,
            color: 'text-red-600'
          },
          { 
            label: 'In Progress', 
            value: activeDeployments.length,
            icon: ArrowPathIcon,
            color: 'text-orange-600'
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

      {/* Recent Deployments */}
      <div className="paintbox-section">
        <h2 className="text-xl font-semibold text-paintbox-text mb-4">
          Recent Deployments
        </h2>
        
        {recentDeployments.length === 0 ? (
          <div className="text-center py-12">
            <ServerIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments yet</h3>
            <p className="text-gray-500">
              Start your first deployment using the deploy button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentDeployments.map((deployment) => (
              <DeploymentCard
                key={deployment.id}
                deployment={deployment}
                onRollback={onRollback}
                onViewLogs={onViewLogs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentStatusDashboard;