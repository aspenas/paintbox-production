'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Deployment, 
  DeploymentRequest, 
  HealthCheckResult, 
  IntegrationError, 
  SecretRotationStatus,
  SecretRotationRequest,
  SystemMetrics
} from '@/lib/types/api';

interface DeploymentSystemState {
  deployments: Deployment[];
  healthChecks: HealthCheckResult[];
  integrationErrors: IntegrationError[];
  secretRotations: SecretRotationStatus[];
  systemMetrics: SystemMetrics | null;
  loading: {
    deployments: boolean;
    healthChecks: boolean;
    integrationErrors: boolean;
    secretRotations: boolean;
    systemMetrics: boolean;
  };
  errors: {
    deployments: string | null;
    healthChecks: string | null;
    integrationErrors: string | null;
    secretRotations: string | null;
    systemMetrics: string | null;
  };
}

interface DeploymentSystemActions {
  triggerDeployment: (request: DeploymentRequest) => Promise<void>;
  rollbackDeployment: (deploymentId: string) => Promise<void>;
  retryIntegrationError: (errorId: string) => Promise<void>;
  resolveIntegrationError: (errorId: string) => Promise<void>;
  rotateSecret: (request: SecretRotationRequest) => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshDeployments: () => Promise<void>;
  refreshHealthChecks: () => Promise<void>;
  refreshIntegrationErrors: () => Promise<void>;
  refreshSecretRotations: () => Promise<void>;
  refreshSystemMetrics: () => Promise<void>;
}

const initialState: DeploymentSystemState = {
  deployments: [],
  healthChecks: [],
  integrationErrors: [],
  secretRotations: [],
  systemMetrics: null,
  loading: {
    deployments: false,
    healthChecks: false,
    integrationErrors: false,
    secretRotations: false,
    systemMetrics: false,
  },
  errors: {
    deployments: null,
    healthChecks: null,
    integrationErrors: null,
    secretRotations: null,
    systemMetrics: null,
  },
};

// Mock API functions - these would be replaced with actual API calls
const api = {
  async getDeployments(): Promise<Deployment[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        id: 'dep-1',
        environment: 'production',
        status: 'completed',
        branch: 'main',
        commit: 'abc123def456',
        services: ['api', 'frontend', 'worker'],
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() - 3300000),   // 55 minutes ago
        duration: 300, // 5 minutes
        deployedBy: 'system',
        logs: [],
        healthChecks: []
      },
      {
        id: 'dep-2',
        environment: 'staging',
        status: 'in_progress',
        branch: 'feature/new-ui',
        commit: 'def456ghi789',
        services: ['frontend'],
        startTime: new Date(Date.now() - 600000), // 10 minutes ago
        deployedBy: 'system',
        logs: [],
        healthChecks: []
      }
    ];
  },

  async getHealthChecks(): Promise<HealthCheckResult[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return [
      {
        id: 'hc-1',
        deploymentId: 'dep-1',
        service: 'api',
        endpoint: '/health',
        status: 'healthy',
        responseTime: 145,
        timestamp: new Date(),
        statusCode: 200,
        metrics: {
          cpu: 23.5,
          memory: 67.8,
          connections: 42
        }
      },
      {
        id: 'hc-2',
        deploymentId: 'dep-1',
        service: 'frontend',
        endpoint: '/health',
        status: 'healthy',
        responseTime: 89,
        timestamp: new Date(),
        statusCode: 200,
        metrics: {
          cpu: 12.1,
          memory: 45.2,
          connections: 156
        }
      }
    ];
  },

  async getIntegrationErrors(): Promise<IntegrationError[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return [
      {
        id: 'err-1',
        service: 'salesforce',
        type: 'rate_limit',
        message: 'API rate limit exceeded',
        details: { limit: 1000, remaining: 0, resetTime: '2025-01-15T14:30:00Z' },
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        resolved: false,
        retryCount: 2,
        maxRetries: 5,
        nextRetryAt: new Date(Date.now() + 300000), // 5 minutes from now
        affectedOperations: ['customer-search', 'opportunity-sync']
      },
      {
        id: 'err-2',
        service: 'companycam',
        type: 'authentication',
        message: 'Invalid API credentials',
        details: { endpoint: '/api/photos', statusCode: 401 },
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        resolved: true,
        resolvedAt: new Date(Date.now() - 600000), // 10 minutes ago
        retryCount: 1,
        maxRetries: 3,
        affectedOperations: ['photo-upload', 'photo-sync']
      }
    ];
  },

  async getSecretRotations(): Promise<SecretRotationStatus[]> {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    return [
      {
        id: 'rot-1',
        secretName: 'salesforce-api-key',
        status: 'completed',
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
        completedAt: new Date(Date.now() - 7080000), // 1h58m ago
        affectedServices: ['api', 'worker'],
        oldVersion: 'v1.2.3',
        newVersion: 'v1.2.4'
      },
      {
        id: 'rot-2',
        secretName: 'database-password',
        status: 'in_progress',
        startTime: new Date(Date.now() - 600000), // 10 minutes ago
        affectedServices: ['api', 'worker', 'migration-service'],
        oldVersion: 'v2.1.0',
        newVersion: 'v2.1.1'
      }
    ];
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      timestamp: new Date(),
      deployments: {
        total: 24,
        successful: 22,
        failed: 2,
        averageDuration: 287
      },
      integrations: {
        salesforce: {
          status: 'degraded',
          responseTime: 1250,
          errorRate: 0.12,
          lastError: new Date(Date.now() - 900000)
        },
        companycam: {
          status: 'healthy',
          responseTime: 340,
          errorRate: 0.02
        }
      },
      secrets: {
        total: 15,
        expiringSoon: 3,
        rotatedToday: 2,
        lastRotation: new Date(Date.now() - 7200000)
      }
    };
  },

  async triggerDeployment(request: DeploymentRequest): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Would create a new deployment
  },

  async rollbackDeployment(deploymentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Would trigger rollback
  },

  async retryIntegrationError(errorId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Would retry the failed operation
  },

  async resolveIntegrationError(errorId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Would mark error as resolved
  },

  async rotateSecret(request: SecretRotationRequest): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 3000));
    // Would initiate secret rotation
  }
};

export const useDeploymentSystem = (): DeploymentSystemState & DeploymentSystemActions => {
  const [state, setState] = useState<DeploymentSystemState>(initialState);

  // Helper function to update loading state
  const setLoading = useCallback((key: keyof DeploymentSystemState['loading'], value: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: value }
    }));
  }, []);

  // Helper function to update error state
  const setError = useCallback((key: keyof DeploymentSystemState['errors'], value: string | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [key]: value }
    }));
  }, []);

  // Data fetching functions
  const refreshDeployments = useCallback(async () => {
    setLoading('deployments', true);
    setError('deployments', null);
    
    try {
      const deployments = await api.getDeployments();
      setState(prev => ({ ...prev, deployments }));
    } catch (error) {
      setError('deployments', error instanceof Error ? error.message : 'Failed to load deployments');
    } finally {
      setLoading('deployments', false);
    }
  }, [setLoading, setError]);

  const refreshHealthChecks = useCallback(async () => {
    setLoading('healthChecks', true);
    setError('healthChecks', null);
    
    try {
      const healthChecks = await api.getHealthChecks();
      setState(prev => ({ ...prev, healthChecks }));
    } catch (error) {
      setError('healthChecks', error instanceof Error ? error.message : 'Failed to load health checks');
    } finally {
      setLoading('healthChecks', false);
    }
  }, [setLoading, setError]);

  const refreshIntegrationErrors = useCallback(async () => {
    setLoading('integrationErrors', true);
    setError('integrationErrors', null);
    
    try {
      const integrationErrors = await api.getIntegrationErrors();
      setState(prev => ({ ...prev, integrationErrors }));
    } catch (error) {
      setError('integrationErrors', error instanceof Error ? error.message : 'Failed to load integration errors');
    } finally {
      setLoading('integrationErrors', false);
    }
  }, [setLoading, setError]);

  const refreshSecretRotations = useCallback(async () => {
    setLoading('secretRotations', true);
    setError('secretRotations', null);
    
    try {
      const secretRotations = await api.getSecretRotations();
      setState(prev => ({ ...prev, secretRotations }));
    } catch (error) {
      setError('secretRotations', error instanceof Error ? error.message : 'Failed to load secret rotations');
    } finally {
      setLoading('secretRotations', false);
    }
  }, [setLoading, setError]);

  const refreshSystemMetrics = useCallback(async () => {
    setLoading('systemMetrics', true);
    setError('systemMetrics', null);
    
    try {
      const systemMetrics = await api.getSystemMetrics();
      setState(prev => ({ ...prev, systemMetrics }));
    } catch (error) {
      setError('systemMetrics', error instanceof Error ? error.message : 'Failed to load system metrics');
    } finally {
      setLoading('systemMetrics', false);
    }
  }, [setLoading, setError]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshDeployments(),
      refreshHealthChecks(),
      refreshIntegrationErrors(),
      refreshSecretRotations(),
      refreshSystemMetrics()
    ]);
  }, [refreshDeployments, refreshHealthChecks, refreshIntegrationErrors, refreshSecretRotations, refreshSystemMetrics]);

  // Action functions
  const triggerDeployment = useCallback(async (request: DeploymentRequest) => {
    try {
      await api.triggerDeployment(request);
      await refreshDeployments(); // Refresh to show new deployment
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to trigger deployment');
    }
  }, [refreshDeployments]);

  const rollbackDeployment = useCallback(async (deploymentId: string) => {
    try {
      await api.rollbackDeployment(deploymentId);
      await refreshDeployments(); // Refresh to show rollback status
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to rollback deployment');
    }
  }, [refreshDeployments]);

  const retryIntegrationError = useCallback(async (errorId: string) => {
    try {
      await api.retryIntegrationError(errorId);
      await refreshIntegrationErrors(); // Refresh to show retry status
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to retry operation');
    }
  }, [refreshIntegrationErrors]);

  const resolveIntegrationError = useCallback(async (errorId: string) => {
    try {
      await api.resolveIntegrationError(errorId);
      await refreshIntegrationErrors(); // Refresh to show resolved status
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to resolve error');
    }
  }, [refreshIntegrationErrors]);

  const rotateSecret = useCallback(async (request: SecretRotationRequest) => {
    try {
      await api.rotateSecret(request);
      await refreshSecretRotations(); // Refresh to show new rotation
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to rotate secret');
    }
  }, [refreshSecretRotations]);

  // Initial data loading
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  return {
    ...state,
    triggerDeployment,
    rollbackDeployment,
    retryIntegrationError,
    resolveIntegrationError,
    rotateSecret,
    refreshAll,
    refreshDeployments,
    refreshHealthChecks,
    refreshIntegrationErrors,
    refreshSecretRotations,
    refreshSystemMetrics
  };
};