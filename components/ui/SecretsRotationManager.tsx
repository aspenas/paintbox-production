'use client';

import React, { useState, useEffect } from 'react';
import { 
  KeyIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CalendarIcon,
  BellIcon,
  EyeIcon,
  PlusIcon,
  ShieldCheckIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { SecretRotationRequest, SecretRotationStatus } from '@/lib/types/api';

interface SecretsRotationManagerProps {
  rotations?: SecretRotationStatus[];
  onRotateSecret?: (request: SecretRotationRequest) => Promise<void>;
  onViewDetails?: (rotation: SecretRotationStatus) => void;
  loading?: boolean;
  error?: string;
}

interface SecretCardProps {
  rotation: SecretRotationStatus;
  onViewDetails: (rotation: SecretRotationStatus) => void;
}

interface RotationFormProps {
  onSubmit: (request: SecretRotationRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const RotationForm: React.FC<RotationFormProps> = ({
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<SecretRotationRequest>({
    secretName: '',
    rotationType: 'immediate',
    scheduledAt: undefined,
    notifyServices: []
  });
  const [newService, setNewService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.secretName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onCancel(); // Close form on success
    } finally {
      setIsSubmitting(false);
    }
  };

  const addService = () => {
    if (newService.trim() && !formData.notifyServices?.includes(newService.trim())) {
      setFormData({
        ...formData,
        notifyServices: [...(formData.notifyServices || []), newService.trim()]
      });
      setNewService('');
    }
  };

  const removeService = (service: string) => {
    setFormData({
      ...formData,
      notifyServices: formData.notifyServices?.filter(s => s !== service)
    });
  };

  return (
    <div className="paintbox-card p-6">
      <h3 className="text-lg font-semibold text-paintbox-text mb-4">
        Rotate Secret
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="paintbox-label">
            Secret Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.secretName}
            onChange={(e) => setFormData({ ...formData, secretName: e.target.value })}
            className="paintbox-input"
            placeholder="e.g., salesforce-api-key"
            required
          />
        </div>

        <div>
          <label className="paintbox-label">Rotation Type</label>
          <select
            value={formData.rotationType}
            onChange={(e) => setFormData({ 
              ...formData, 
              rotationType: e.target.value as 'immediate' | 'scheduled' 
            })}
            className="paintbox-input"
          >
            <option value="immediate">Immediate</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        {formData.rotationType === 'scheduled' && (
          <div>
            <label className="paintbox-label">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={formData.scheduledAt ? 
                new Date(formData.scheduledAt.getTime() - formData.scheduledAt.getTimezoneOffset() * 60000)
                  .toISOString().slice(0, 16) : ''
              }
              onChange={(e) => setFormData({ 
                ...formData, 
                scheduledAt: e.target.value ? new Date(e.target.value) : undefined 
              })}
              className="paintbox-input"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

        <div>
          <label className="paintbox-label">Notify Services</label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              className="paintbox-input flex-1"
              placeholder="Service name"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
            />
            <button
              type="button"
              onClick={addService}
              className="paintbox-btn paintbox-btn-secondary px-3"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          
          {formData.notifyServices && formData.notifyServices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.notifyServices.map((service, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <ServerIcon className="w-3 h-3 mr-1" />
                  {service}
                  <button
                    type="button"
                    onClick={() => removeService(service)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <XCircleIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="paintbox-btn paintbox-btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="paintbox-btn paintbox-btn-primary"
            disabled={isSubmitting || !formData.secretName.trim()}
          >
            {isSubmitting ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <KeyIcon className="w-4 h-4" />
            )}
            {formData.rotationType === 'immediate' ? 'Rotate Now' : 'Schedule Rotation'}
          </button>
        </div>
      </form>
    </div>
  );
};

const SecretCard: React.FC<SecretCardProps> = ({ 
  rotation, 
  onViewDetails 
}) => {
  const getStatusIcon = (status: SecretRotationStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="w-5 h-5 text-orange-500" />;
    }
  };

  const getStatusColor = (status: SecretRotationStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-orange-50 border-orange-200';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const calculateDuration = () => {
    if (!rotation.completedAt) return 'In progress...';
    const duration = new Date(rotation.completedAt).getTime() - new Date(rotation.startTime).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className={`paintbox-card p-4 border ${getStatusColor(rotation.status)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon(rotation.status)}
          <div>
            <h3 className="font-semibold text-paintbox-text">
              {rotation.secretName}
            </h3>
            <p className="text-sm text-paintbox-text-muted">
              {rotation.status.replace('_', ' ').toUpperCase()}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onViewDetails(rotation)}
          className="paintbox-btn paintbox-btn-secondary text-xs px-3 py-1"
        >
          <EyeIcon className="w-4 h-4" />
          Details
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Started</p>
          <p className="text-sm text-paintbox-text">{formatTime(rotation.startTime)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Duration</p>
          <p className="text-sm text-paintbox-text">{calculateDuration()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">Old Version</p>
          <p className="text-sm font-mono text-paintbox-text">{rotation.oldVersion}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-paintbox-text-muted">New Version</p>
          <p className="text-sm font-mono text-paintbox-text">{rotation.newVersion}</p>
        </div>
      </div>

      {rotation.affectedServices.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-paintbox-text-muted mb-2">
            Affected Services ({rotation.affectedServices.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {rotation.affectedServices.slice(0, 3).map((service, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                <ServerIcon className="w-3 h-3 mr-1" />
                {service}
              </span>
            ))}
            {rotation.affectedServices.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                +{rotation.affectedServices.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {rotation.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Error:</strong> {rotation.error}
        </div>
      )}
    </div>
  );
};

const SecretsRotationManager: React.FC<SecretsRotationManagerProps> = ({
  rotations = [],
  onRotateSecret = async () => {},
  onViewDetails = () => {},
  loading = false,
  error
}) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'failed'>('all');

  const filteredRotations = rotations.filter(rotation => {
    if (filter === 'all') return true;
    return rotation.status === filter;
  });

  const recentRotations = filteredRotations
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 10);

  const activeRotations = rotations.filter(r => r.status === 'in_progress' || r.status === 'pending');
  const completedToday = rotations.filter(r => {
    if (!r.completedAt) return false;
    const today = new Date();
    const completed = new Date(r.completedAt);
    return completed.toDateString() === today.toDateString();
  });

  const handleRotateSecret = async (request: SecretRotationRequest) => {
    await onRotateSecret(request);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-paintbox-primary animate-spin mr-3" />
          <span className="text-paintbox-text">Loading rotation status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paintbox-section">
        <div className="flex items-center justify-center py-12 text-red-600">
          <ExclamationTriangleIcon className="w-8 h-8 mr-3" />
          <span>Error loading rotation status: {error}</span>
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
            Secrets Management
          </h1>
          <p className="text-paintbox-text-muted mt-1">
            Monitor and manage secret rotation lifecycle
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="paintbox-input w-auto min-w-32"
          >
            <option value="all">All Rotations</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          
          <button
            onClick={() => setShowForm(true)}
            className="paintbox-btn paintbox-btn-primary"
          >
            <KeyIcon className="w-4 h-4" />
            Rotate Secret
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Rotations', 
            value: rotations.length, 
            icon: KeyIcon,
            color: 'text-purple-600'
          },
          { 
            label: 'Active Rotations', 
            value: activeRotations.length,
            icon: ArrowPathIcon,
            color: 'text-blue-600'
          },
          { 
            label: 'Completed Today', 
            value: completedToday.length,
            icon: CheckCircleIcon,
            color: 'text-green-600'
          },
          { 
            label: 'Failed Rotations', 
            value: rotations.filter(r => r.status === 'failed').length,
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

      {/* Active Rotations Alert */}
      {activeRotations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin mr-2" />
            <h3 className="font-medium text-blue-800">
              {activeRotations.length} Active Rotation{activeRotations.length > 1 ? 's' : ''}
            </h3>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Secret rotations are currently in progress. Monitor their status below.
          </p>
        </div>
      )}

      {/* Rotation Form */}
      {showForm && (
        <RotationForm
          onSubmit={handleRotateSecret}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Rotations List */}
      <div className="paintbox-section">
        <h2 className="text-xl font-semibold text-paintbox-text mb-4">
          Secret Rotations
          {filter !== 'all' && ` (${filteredRotations.length})`}
        </h2>
        
        {recentRotations.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No rotations yet' : `No ${filter} rotations`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Start your first secret rotation using the rotate button above.' 
                : 'No rotations match the current filter.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentRotations.map((rotation) => (
              <SecretCard
                key={rotation.id}
                rotation={rotation}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretsRotationManager;