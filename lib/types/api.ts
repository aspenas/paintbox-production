/**
 * API Types for Paintbox Backend Integration
 * Defines TypeScript interfaces for secure API communication
 */

// Salesforce Search Types
export interface SecureSalesforceSearchRequest {
  query: string;
  entityType: 'Contact' | 'Account' | 'Opportunity' | 'Lead';
  searchFields: string[];
  returnFields: string[];
  limit?: number;
  filters?: Record<string, any>;
}

export interface SecureSalesforceSearchResponse {
  success: boolean;
  data: SalesforceRecord[];
  totalCount: number;
  hasMore: boolean;
  queryTime: number;
  cached: boolean;
  error?: string;
}

export interface SalesforceRecord {
  Id: string;
  [key: string]: any;
}

// Formula Calculation Types
export interface CalculationContext {
  formula: string;
  cellReference: string;
  dependencies: string[];
  inputs: Record<string, any>;
  precision?: number;
  cacheKey?: string;
}

export interface SingleCalculationRequest {
  context: CalculationContext;
  metadata?: {
    userId?: string;
    sessionId?: string;
    timestamp?: string;
  };
}

export interface SingleCalculationResponse {
  success: boolean;
  result: any;
  calculationTime: number;
  cached: boolean;
  dependencies: string[];
  error?: string;
  metadata?: {
    cellReference: string;
    formula: string;
    precision: number;
  };
}

export interface BatchCalculationRequest {
  contexts: CalculationContext[];
  options?: {
    parallel?: boolean;
    maxConcurrency?: number;
    timeout?: number;
  };
  metadata?: {
    userId?: string;
    sessionId?: string;
    timestamp?: string;
  };
}

export interface BatchCalculationResponse {
  success: boolean;
  results: {
    cellReference: string;
    result: any;
    success: boolean;
    calculationTime: number;
    cached: boolean;
    error?: string;
  }[];
  totalCalculationTime: number;
  cacheHitRate: number;
  metadata?: {
    totalCells: number;
    successfulCells: number;
    failedCells: number;
  };
}

// Formula Execution Tracking
export interface FormulaExecution {
  id: string;
  cellReference: string;
  formula: string;
  status: 'pending' | 'calculating' | 'completed' | 'error';
  result?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  dependencies: string[];
  cached: boolean;
}

// Build Status Types
export interface BuildStatus {
  success: boolean;
  timestamp: Date;
  errors: BuildError[];
  warnings: BuildWarning[];
  stats: {
    totalFiles: number;
    errorCount: number;
    warningCount: number;
    buildTime: number;
  };
}

export interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  rule?: string;
  source: 'typescript' | 'eslint' | 'build';
}

export interface BuildWarning extends BuildError {
  severity: 'warning';
}

// Performance Metrics Types
export interface PerformanceMetrics {
  formulaCalculation: {
    averageTime: number;
    medianTime: number;
    p95Time: number;
    p99Time: number;
    totalCalculations: number;
    cacheHitRate: number;
  };
  apiRequests: {
    salesforceSearch: {
      averageTime: number;
      successRate: number;
      errorRate: number;
    };
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    evictions: number;
  };
}

// API Response Wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Deployment System Types
export interface DeploymentRequest {
  environment: 'staging' | 'production';
  branch?: string;
  commit?: string;
  services?: string[];
  options?: {
    skipTests?: boolean;
    blueGreen?: boolean;
    rollbackOnFailure?: boolean;
    healthCheckTimeout?: number;
  };
}

export interface Deployment {
  id: string;
  environment: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolling_back' | 'rolled_back';
  branch: string;
  commit: string;
  services: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  deployedBy: string;
  logs: DeploymentLog[];
  healthChecks: HealthCheckResult[];
  rollbackId?: string;
}

export interface DeploymentLog {
  id: string;
  deploymentId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheckResult {
  id: string;
  deploymentId: string;
  service: string;
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime: number;
  timestamp: Date;
  statusCode?: number;
  error?: string;
  metrics?: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

export interface IntegrationError {
  id: string;
  service: 'salesforce' | 'companycam';
  type: 'connection' | 'authentication' | 'rate_limit' | 'api_error' | 'timeout';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  affectedOperations: string[];
}

export interface SecretRotationRequest {
  secretName: string;
  rotationType: 'immediate' | 'scheduled';
  scheduledAt?: Date;
  notifyServices?: string[];
}

export interface SecretRotationStatus {
  id: string;
  secretName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  completedAt?: Date;
  error?: string;
  affectedServices: string[];
  oldVersion: string;
  newVersion: string;
}

export interface SystemMetrics {
  timestamp: Date;
  deployments: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
  };
  integrations: {
    salesforce: {
      status: 'healthy' | 'degraded' | 'down';
      responseTime: number;
      errorRate: number;
      lastError?: Date;
    };
    companycam: {
      status: 'healthy' | 'degraded' | 'down';
      responseTime: number;
      errorRate: number;
      lastError?: Date;
    };
  };
  secrets: {
    total: number;
    expiringSoon: number;
    rotatedToday: number;
    lastRotation?: Date;
  };
}