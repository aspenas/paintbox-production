'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, User, Building2, Target, UserPlus, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { secureAPIClient } from '@/lib/services/secure-api-client';
import { 
  SecureSalesforceSearchRequest, 
  SalesforceRecord, 
  ValidationError 
} from '@/lib/types/api';
import { useDebounce } from '@/hooks/useDebounce';

interface SalesforceSearchProps {
  onResultSelect?: (record: SalesforceRecord) => void;
  entityType?: 'Contact' | 'Account' | 'Opportunity' | 'Lead';
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

interface SearchState {
  query: string;
  results: SalesforceRecord[];
  loading: boolean;
  error: string | null;
  selectedIndex: number;
  hasSearched: boolean;
  validationErrors: ValidationError[];
}

const ENTITY_CONFIGS = {
  Contact: {
    icon: User,
    searchFields: ['Name', 'Email', 'Phone', 'MobilePhone'],
    returnFields: ['Id', 'Name', 'FirstName', 'LastName', 'Email', 'Phone', 'MobilePhone', 'Account.Name'],
    displayName: 'Contacts',
    placeholder: 'Search contacts by name, email, or phone...'
  },
  Account: {
    icon: Building2,
    searchFields: ['Name', 'Phone', 'Website'],
    returnFields: ['Id', 'Name', 'Type', 'Industry', 'Phone', 'Website', 'BillingCity', 'BillingState'],
    displayName: 'Accounts',
    placeholder: 'Search accounts by name, phone, or website...'
  },
  Opportunity: {
    icon: Target,
    searchFields: ['Name', 'Account.Name', 'StageName'],
    returnFields: ['Id', 'Name', 'Account.Name', 'StageName', 'Amount', 'CloseDate'],
    displayName: 'Opportunities',
    placeholder: 'Search opportunities by name or account...'
  },
  Lead: {
    icon: UserPlus,
    searchFields: ['Name', 'Email', 'Phone', 'Company'],
    returnFields: ['Id', 'Name', 'FirstName', 'LastName', 'Email', 'Phone', 'Company', 'Status'],
    displayName: 'Leads',
    placeholder: 'Search leads by name, email, phone, or company...'
  }
};

export default function SalesforceSearch({
  onResultSelect,
  entityType = 'Contact',
  placeholder,
  className = '',
  autoFocus = false
}: SalesforceSearchProps) {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    selectedIndex: -1,
    hasSearched: false,
    validationErrors: []
  });

  const debouncedQuery = useDebounce(state.query, 300);
  const config = ENTITY_CONFIGS[entityType];
  const IconComponent = config.icon;

  // Memoized search request
  const searchRequest = useMemo((): SecureSalesforceSearchRequest => ({
    query: debouncedQuery,
    entityType,
    searchFields: config.searchFields,
    returnFields: config.returnFields,
    limit: 10,
    filters: {}
  }), [debouncedQuery, entityType, config]);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setState(prev => ({ 
        ...prev, 
        results: [], 
        error: null, 
        validationErrors: [],
        hasSearched: false 
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, validationErrors: [] }));

    try {
      const response = await secureAPIClient.searchSalesforce(searchRequest);
      
      setState(prev => ({
        ...prev,
        results: response.data,
        loading: false,
        hasSearched: true,
        selectedIndex: -1
      }));
    } catch (error) {
      console.error('Salesforce search error:', error);
      
      let errorMessage = 'Search failed. Please try again.';
      let validationErrors: ValidationError[] = [];
      
      if (error instanceof Error) {
        if (error.message.includes('Validation failed')) {
          errorMessage = 'Invalid search parameters.';
          // Extract validation errors if they exist in the error message
          validationErrors = [{ 
            field: 'query', 
            message: error.message, 
            code: 'VALIDATION_ERROR' 
          }];
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        validationErrors,
        hasSearched: true
      }));
    }
  }, [searchRequest]);

  // Effect for debounced search
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, query: e.target.value }));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (state.results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.results.length - 1)
        }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, -1)
        }));
        break;
      case 'Enter':
        e.preventDefault();
        if (state.selectedIndex >= 0 && state.results[state.selectedIndex]) {
          handleResultSelect(state.results[state.selectedIndex]);
        }
        break;
      case 'Escape':
        setState(prev => ({ ...prev, selectedIndex: -1, results: [] }));
        break;
    }
  };

  // Handle result selection
  const handleResultSelect = (record: SalesforceRecord) => {
    if (onResultSelect) {
      onResultSelect(record);
    }
    setState(prev => ({ ...prev, results: [], selectedIndex: -1, query: '' }));
  };

  // Render search result item
  const renderResultItem = (record: SalesforceRecord, index: number) => {
    const isSelected = index === state.selectedIndex;
    
    return (
      <div
        key={record.Id}
        className={`p-3 cursor-pointer transition-colors duration-150 ${
          isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
        }`}
        onClick={() => handleResultSelect(record)}
        onMouseEnter={() => setState(prev => ({ ...prev, selectedIndex: index }))}
      >
        <div className="flex items-start gap-3">
          <IconComponent className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {record.Name || `${record.FirstName || ''} ${record.LastName || ''}`.trim()}
            </div>
            {record.Email && (
              <div className="text-sm text-gray-600 truncate">{record.Email}</div>
            )}
            {record.Phone && (
              <div className="text-sm text-gray-600">{record.Phone}</div>
            )}
            {record.Account?.Name && (
              <div className="text-sm text-gray-500 truncate">
                {record.Account.Name}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Validation error display
  const validationErrorsDisplay = state.validationErrors.length > 0 && (
    <div className="px-4 py-3 bg-red-50 border-l-4 border-red-500">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="ml-2">
          <h4 className="text-sm font-medium text-red-800">Validation Errors</h4>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {state.validationErrors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={state.query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="paintbox-input pl-10 pr-10"
          placeholder={placeholder || config.placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {state.loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {(state.results.length > 0 || state.error || state.validationErrors.length > 0 || (state.hasSearched && state.query.length >= 2)) && (
        <div className="absolute z-50 w-full mt-1 paintbox-card max-h-96 overflow-hidden">
          {/* Validation Errors */}
          {validationErrorsDisplay}
          
          {/* Error Display */}
          {state.error && (
            <div className="px-4 py-3 bg-red-50 border-l-4 border-red-500">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="ml-2 text-sm text-red-700">{state.error}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {state.results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <div className="px-4 py-2 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {config.displayName} ({state.results.length})
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
              {state.results.map((record, index) => renderResultItem(record, index))}
            </div>
          ) : state.hasSearched && state.query.length >= 2 && !state.loading && !state.error && (
            <div className="px-4 py-6 text-center text-gray-500">
              <IconComponent className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No {config.displayName.toLowerCase()} found for "{state.query}"</p>
              <p className="text-xs mt-1">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      )}

      {/* Search Tips */}
      {!state.hasSearched && state.query.length === 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-medium">Search tips:</span> Enter at least 2 characters. 
          Use * for wildcards. Search is case-insensitive.
        </div>
      )}
    </div>
  );
}