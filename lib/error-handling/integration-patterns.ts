/**
 * Integration Error Handling Patterns
 * Circuit breaker, retry logic, and error classification for external integrations
 */

import { EventEmitter } from 'events';

// =====================================
// TYPES AND INTERFACES
// =====================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
}

export interface IntegrationEndpoint {
  id: string;
  name: string;
  serviceType: 'salesforce' | 'companycam' | 'aws_secrets' | 'external_api';
  baseUrl: string;
  timeout: number;
  retryConfig: RetryConfig;
  circuitBreakerConfig: CircuitBreakerConfig;
}

export interface IntegrationError {
  id: string;
  endpointId: string;
  errorType: 'timeout' | 'connection_error' | 'authentication_error' | 'rate_limit' | 'server_error' | 'validation_error';
  errorCode?: string;
  message: string;
  requestData: any;
  responseData: any;
  retryCount: number;
  occurredAt: Date;
  resolved: boolean;
}

export interface IntegrationRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  metadata?: Record<string, any>;
}

export interface IntegrationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IntegrationError;
  attempts: number;
  totalTime: number;
}

// =====================================
// CIRCUIT BREAKER IMPLEMENTATION
// =====================================

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly endpointId: string;

  constructor(endpointId: string, config: CircuitBreakerConfig) {
    super();
    this.endpointId = endpointId;
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.resetTimeout) {
        throw new Error(`Circuit breaker is OPEN for endpoint ${this.endpointId}`);
      } else {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.emit('stateChange', { endpointId: this.endpointId, state: this.state });
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        this.emit('stateChange', { endpointId: this.endpointId, state: this.state });
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.emit('stateChange', { endpointId: this.endpointId, state: this.state });
      this.emit('circuitOpen', { endpointId: this.endpointId, failures: this.failures });
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.emit('reset', { endpointId: this.endpointId });
  }
}

// =====================================
// RETRY MECHANISM
// =====================================

export class RetryHandler {
  constructor(private config: RetryConfig) {}

  async execute<T>(operation: () => Promise<T>, context: { endpointId: string; requestId: string }): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry certain errors
        if (!this.shouldRetry(error as Error)) {
          throw error;
        }

        // Don't delay on the last attempt
        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          console.log(`[${context.requestId}] Retry attempt ${attempt}/${this.config.maxAttempts} for ${context.endpointId} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private shouldRetry(error: Error): boolean {
    // Don't retry authentication errors
    if (error.message.includes('401') || error.message.includes('authentication')) {
      return false;
    }

    // Don't retry validation errors (4xx except rate limits)
    if (error.message.includes('400') || error.message.includes('validation')) {
      return false;
    }

    // Retry timeouts, connection errors, 5xx errors, and rate limits
    return true;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, this.config.maxDelay);

    if (this.config.jitter) {
      // Add ±25% jitter
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(delay, 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================
// ERROR CLASSIFIER
// =====================================

export class ErrorClassifier {
  static classifyError(error: any, response?: any): IntegrationError['errorType'] {
    // Check response status codes first
    if (response?.status) {
      if (response.status === 401 || response.status === 403) {
        return 'authentication_error';
      }
      if (response.status === 429) {
        return 'rate_limit';
      }
      if (response.status >= 400 && response.status < 500) {
        return 'validation_error';
      }
      if (response.status >= 500) {
        return 'server_error';
      }
    }

    // Check error message patterns
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return 'timeout';
    }

    if (errorMessage.includes('connection') || 
        errorMessage.includes('network') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('econnrefused')) {
      return 'connection_error';
    }

    if (errorMessage.includes('auth') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden')) {
      return 'authentication_error';
    }

    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests')) {
      return 'rate_limit';
    }

    // Default to server error
    return 'server_error';
  }

  static getErrorSeverity(errorType: IntegrationError['errorType']): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorType) {
      case 'authentication_error':
        return 'critical';
      case 'server_error':
        return 'high';
      case 'timeout':
      case 'connection_error':
        return 'medium';
      case 'rate_limit':
        return 'medium';
      case 'validation_error':
        return 'low';
      default:
        return 'medium';
    }
  }

  static shouldAlert(errorType: IntegrationError['errorType'], retryCount: number): boolean {
    // Always alert on authentication errors
    if (errorType === 'authentication_error') {
      return true;
    }

    // Alert on server errors after first retry
    if (errorType === 'server_error' && retryCount >= 1) {
      return true;
    }

    // Alert on persistent timeout/connection issues
    if ((errorType === 'timeout' || errorType === 'connection_error') && retryCount >= 3) {
      return true;
    }

    // Don't alert on validation errors or first occurrence of rate limits
    return false;
  }
}

// =====================================
// INTEGRATION CLIENT BASE CLASS
// =====================================

export abstract class IntegrationClient extends EventEmitter {
  protected readonly endpoint: IntegrationEndpoint;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryHandler: RetryHandler;
  private readonly requestLog: Map<string, IntegrationError> = new Map();

  constructor(endpoint: IntegrationEndpoint) {
    super();
    this.endpoint = endpoint;
    this.circuitBreaker = new CircuitBreaker(endpoint.id, endpoint.circuitBreakerConfig);
    this.retryHandler = new RetryHandler(endpoint.retryConfig);

    // Forward circuit breaker events
    this.circuitBreaker.on('stateChange', (event) => this.emit('circuitBreakerStateChange', event));
    this.circuitBreaker.on('circuitOpen', (event) => this.emit('circuitBreakerOpen', event));
  }

  protected async makeRequest<T>(request: IntegrationRequest): Promise<IntegrationResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    let attempts = 0;
    let lastError: IntegrationError | undefined;

    const operation = async (): Promise<T> => {
      attempts++;
      try {
        const response = await this.executeRequest<T>(request, requestId);
        return response;
      } catch (error) {
        const integrationError = this.createIntegrationError(error, request, requestId, attempts - 1);
        lastError = integrationError;
        
        // Log error for monitoring
        this.logError(integrationError);
        
        throw error;
      }
    };

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return this.retryHandler.execute(operation, { 
          endpointId: this.endpoint.id, 
          requestId 
        });
      });

      const totalTime = Date.now() - startTime;
      return {
        success: true,
        data: result,
        attempts,
        totalTime
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      return {
        success: false,
        error: lastError,
        attempts,
        totalTime
      };
    }
  }

  protected abstract executeRequest<T>(request: IntegrationRequest, requestId: string): Promise<T>;

  private createIntegrationError(
    error: any, 
    request: IntegrationRequest, 
    requestId: string, 
    retryCount: number
  ): IntegrationError {
    const errorType = ErrorClassifier.classifyError(error, error.response);
    
    return {
      id: requestId,
      endpointId: this.endpoint.id,
      errorType,
      errorCode: error.response?.status?.toString() || error.code,
      message: error.message || 'Unknown error',
      requestData: {
        method: request.method,
        path: request.path,
        headers: this.sanitizeHeaders(request.headers || {}),
        metadata: request.metadata
      },
      responseData: error.response ? {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      } : null,
      retryCount,
      occurredAt: new Date(),
      resolved: false
    };
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private logError(error: IntegrationError): void {
    this.requestLog.set(error.id, error);
    
    // Emit error event for monitoring
    this.emit('integrationError', error);
    
    // Check if we should alert
    if (ErrorClassifier.shouldAlert(error.errorType, error.retryCount)) {
      this.emit('integrationAlert', {
        error,
        severity: ErrorClassifier.getErrorSeverity(error.errorType)
      });
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for monitoring and debugging
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  getRecentErrors(limit: number = 10): IntegrationError[] {
    return Array.from(this.requestLog.values())
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  clearErrorLog(): void {
    this.requestLog.clear();
  }
}

// =====================================
// SALESFORCE INTEGRATION CLIENT
// =====================================

export class SalesforceIntegrationClient extends IntegrationClient {
  private accessToken?: string;
  private tokenExpiresAt?: Date;

  protected async executeRequest<T>(request: IntegrationRequest, requestId: string): Promise<T> {
    await this.ensureAuthenticated();

    const url = `${this.endpoint.baseUrl}${request.path}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...request.headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.endpoint.timeout);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.endpoint.timeout}ms`);
      }
      
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return;
    }

    // Implement OAuth2 flow or use stored credentials
    // This is a simplified example
    try {
      const tokenResponse = await this.requestAccessToken();
      this.accessToken = tokenResponse.access_token;
      this.tokenExpiresAt = new Date(Date.now() + (tokenResponse.expires_in * 1000));
    } catch (error) {
      throw new Error('Failed to authenticate with Salesforce: ' + error.message);
    }
  }

  private async requestAccessToken(): Promise<{ access_token: string; expires_in: number }> {
    // This would integrate with your secrets management system
    // to get OAuth credentials and request tokens
    throw new Error('OAuth implementation required');
  }
}

// =====================================
// COMPANYCAM INTEGRATION CLIENT
// =====================================

export class CompanyCamIntegrationClient extends IntegrationClient {
  private readonly apiKey: string;

  constructor(endpoint: IntegrationEndpoint, apiKey: string) {
    super(endpoint);
    this.apiKey = apiKey;
  }

  protected async executeRequest<T>(request: IntegrationRequest, requestId: string): Promise<T> {
    const url = `${this.endpoint.baseUrl}${request.path}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...request.headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.endpoint.timeout);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.endpoint.timeout}ms`);
      }
      
      throw error;
    }
  }
}

// =====================================
// INTEGRATION MANAGER
// =====================================

export class IntegrationManager extends EventEmitter {
  private clients: Map<string, IntegrationClient> = new Map();
  private endpoints: Map<string, IntegrationEndpoint> = new Map();

  registerEndpoint(endpoint: IntegrationEndpoint): void {
    this.endpoints.set(endpoint.id, endpoint);
  }

  createClient(endpointId: string, credentials?: any): IntegrationClient {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint ${endpointId} not found`);
    }

    let client: IntegrationClient;

    switch (endpoint.serviceType) {
      case 'salesforce':
        client = new SalesforceIntegrationClient(endpoint);
        break;
      case 'companycam':
        client = new CompanyCamIntegrationClient(endpoint, credentials?.apiKey);
        break;
      default:
        throw new Error(`Unsupported service type: ${endpoint.serviceType}`);
    }

    // Forward all events from client
    client.on('integrationError', (error) => this.emit('integrationError', error));
    client.on('integrationAlert', (alert) => this.emit('integrationAlert', alert));
    client.on('circuitBreakerStateChange', (event) => this.emit('circuitBreakerStateChange', event));
    client.on('circuitBreakerOpen', (event) => this.emit('circuitBreakerOpen', event));

    this.clients.set(endpointId, client);
    return client;
  }

  getClient(endpointId: string): IntegrationClient | undefined {
    return this.clients.get(endpointId);
  }

  getAllClients(): IntegrationClient[] {
    return Array.from(this.clients.values());
  }

  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [endpointId, client] of this.clients) {
      const stats = client.getCircuitBreakerStats();
      const recentErrors = client.getRecentErrors(5);
      
      status[endpointId] = {
        circuitBreaker: stats,
        recentErrors: recentErrors.length,
        lastError: recentErrors[0]?.occurredAt || null,
        healthy: stats.state === CircuitBreakerState.CLOSED
      };
    }

    return status;
  }
}

// =====================================
// DEFAULT CONFIGURATIONS
// =====================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringWindow: 300000 // 5 minutes
};

// Singleton instance for global use
export const integrationManager = new IntegrationManager();