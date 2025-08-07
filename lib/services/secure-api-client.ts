/**
 * Secure API Client for Paintbox Backend
 * Handles secure communication with backend API endpoints
 */

import { 
  SecureSalesforceSearchRequest, 
  SecureSalesforceSearchResponse,
  SingleCalculationRequest,
  SingleCalculationResponse,
  BatchCalculationRequest,
  BatchCalculationResponse,
  BuildStatus,
  PerformanceMetrics,
  APIResponse,
  ValidationResult
} from '@/lib/types/api';

class SecureAPIClient {
  private baseURL: string;
  private timeout: number = 30000;
  private retryAttempts: number = 3;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': crypto.randomUUID(),
        'X-Timestamp': new Date().toISOString(),
        ...options.headers,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (retryCount < this.retryAttempts && error instanceof Error && !error.message.includes('aborted')) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Salesforce Search Methods
  async searchSalesforce(request: SecureSalesforceSearchRequest): Promise<SecureSalesforceSearchResponse> {
    const validationResult = this.validateSalesforceSearchRequest(request);
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    const response = await this.makeRequest<SecureSalesforceSearchResponse>(
      '/v1/salesforce/search',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Salesforce search failed');
    }

    return response.data!;
  }

  // Formula Calculation Methods
  async calculateFormula(request: SingleCalculationRequest): Promise<SingleCalculationResponse> {
    const response = await this.makeRequest<SingleCalculationResponse>(
      '/v1/calculations',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Formula calculation failed');
    }

    return response.data!;
  }

  async calculateFormulasBatch(request: BatchCalculationRequest): Promise<BatchCalculationResponse> {
    const response = await this.makeRequest<BatchCalculationResponse>(
      '/v1/calculations/batch',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Batch calculation failed');
    }

    return response.data!;
  }

  // Build Status Methods
  async getBuildStatus(): Promise<BuildStatus> {
    const response = await this.makeRequest<BuildStatus>('/v1/build/status');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get build status');
    }

    return response.data!;
  }

  async validateCode(): Promise<BuildStatus> {
    const response = await this.makeRequest<BuildStatus>(
      '/v1/build/validate',
      { method: 'POST' }
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Code validation failed');
    }

    return response.data!;
  }

  // Performance Metrics Methods
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await this.makeRequest<PerformanceMetrics>('/v1/metrics/performance');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get performance metrics');
    }

    return response.data!;
  }

  // Validation Methods
  private validateSalesforceSearchRequest(request: SecureSalesforceSearchRequest): ValidationResult {
    const errors = [];

    if (!request.query || request.query.trim().length === 0) {
      errors.push({
        field: 'query',
        message: 'Query is required and cannot be empty',
        code: 'REQUIRED',
        value: request.query
      });
    }

    if (request.query && request.query.length > 255) {
      errors.push({
        field: 'query',
        message: 'Query cannot exceed 255 characters',
        code: 'MAX_LENGTH',
        value: request.query
      });
    }

    const validEntityTypes = ['Contact', 'Account', 'Opportunity', 'Lead'];
    if (!validEntityTypes.includes(request.entityType)) {
      errors.push({
        field: 'entityType',
        message: `Entity type must be one of: ${validEntityTypes.join(', ')}`,
        code: 'INVALID_VALUE',
        value: request.entityType
      });
    }

    if (!request.searchFields || request.searchFields.length === 0) {
      errors.push({
        field: 'searchFields',
        message: 'At least one search field is required',
        code: 'REQUIRED',
        value: request.searchFields
      });
    }

    if (!request.returnFields || request.returnFields.length === 0) {
      errors.push({
        field: 'returnFields',
        message: 'At least one return field is required',
        code: 'REQUIRED',
        value: request.returnFields
      });
    }

    if (request.limit && (request.limit < 1 || request.limit > 200)) {
      errors.push({
        field: 'limit',
        message: 'Limit must be between 1 and 200',
        code: 'OUT_OF_RANGE',
        value: request.limit
      });
    }

    // Validate against SQL injection patterns
    const sqlInjectionPattern = /('|(--)|(\bor\b)|(\band\b)|(\bunion\b)|(\bselect\b)|(\binsert\b)|(\bupdate\b)|(\bdelete\b)|(\bdrop\b))/i;
    if (sqlInjectionPattern.test(request.query)) {
      errors.push({
        field: 'query',
        message: 'Query contains potentially unsafe characters',
        code: 'SECURITY_VIOLATION',
        value: request.query
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Utility Methods
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  setRetryAttempts(attempts: number): void {
    this.retryAttempts = attempts;
  }
}

export const secureAPIClient = new SecureAPIClient();
export { SecureAPIClient };