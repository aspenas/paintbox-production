'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calculator, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Code,
  Database
} from 'lucide-react';
import { secureAPIClient } from '@/lib/services/secure-api-client';
import { 
  SingleCalculationRequest, 
  BatchCalculationRequest,
  FormulaExecution,
  CalculationContext 
} from '@/lib/types/api';

interface FormulaEngineProps {
  onCalculationComplete?: (result: any, context: CalculationContext) => void;
  onError?: (error: string, context: CalculationContext) => void;
  className?: string;
  autoCalculate?: boolean;
  showBatchMode?: boolean;
}

interface FormulaState {
  formula: string;
  cellReference: string;
  inputs: Record<string, any>;
  result: any;
  loading: boolean;
  error: string | null;
  executionTime: number;
  dependencies: string[];
  cached: boolean;
  history: FormulaExecution[];
  batchMode: boolean;
  batchFormulas: CalculationContext[];
}

const SAMPLE_FORMULAS = [
  { name: 'Labor Cost', formula: '=B2*C2*D2', description: 'Hours × Rate × Multiplier' },
  { name: 'Material Total', formula: '=SUM(E2:E10)', description: 'Sum material costs' },
  { name: 'Tax Calculation', formula: '=F2*0.0875', description: 'Apply tax rate' },
  { name: 'Discount Applied', formula: '=IF(G2>1000,G2*0.1,0)', description: 'Bulk discount logic' },
  { name: 'Timeline Estimate', formula: '=CEILING(H2/8,1)', description: 'Working days needed' }
];

const SAMPLE_INPUTS = {
  'B2': 40,
  'C2': 65,
  'D2': 1.2,
  'E2': 150,
  'E3': 200,
  'E4': 75,
  'E5': 300,
  'E6': 120,
  'E7': 180,
  'E8': 90,
  'E9': 240,
  'E10': 160,
  'F2': 3120,
  'G2': 1500,
  'H2': 56
};

export default function FormulaEngine({
  onCalculationComplete,
  onError,
  className = '',
  autoCalculate = false,
  showBatchMode = true
}: FormulaEngineProps) {
  const [state, setState] = useState<FormulaState>({
    formula: '',
    cellReference: 'A1',
    inputs: SAMPLE_INPUTS,
    result: null,
    loading: false,
    error: null,
    executionTime: 0,
    dependencies: [],
    cached: false,
    history: [],
    batchMode: false,
    batchFormulas: []
  });

  const executionIdRef = useRef<string>('');

  // Auto-calculate effect
  useEffect(() => {
    if (autoCalculate && state.formula && state.formula.startsWith('=')) {
      const timer = setTimeout(() => {
        calculateFormula();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.formula, state.inputs, autoCalculate]);

  // Generate dependencies from formula
  const extractDependencies = useCallback((formula: string): string[] => {
    const cellRegex = /[A-Z]+[0-9]+/g;
    const matches = formula.match(cellRegex) || [];
    return [...new Set(matches)];
  }, []);

  // Build calculation context
  const buildContext = useCallback((): CalculationContext => ({
    formula: state.formula,
    cellReference: state.cellReference,
    dependencies: extractDependencies(state.formula),
    inputs: state.inputs,
    precision: 2,
    cacheKey: `${state.cellReference}_${Date.now()}`
  }), [state.formula, state.cellReference, state.inputs, extractDependencies]);

  // Single formula calculation
  const calculateFormula = async () => {
    if (!state.formula || !state.formula.startsWith('=')) {
      setState(prev => ({ ...prev, error: 'Formula must start with =' }));
      return;
    }

    const context = buildContext();
    const executionId = crypto.randomUUID();
    executionIdRef.current = executionId;

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      dependencies: context.dependencies
    }));

    const execution: FormulaExecution = {
      id: executionId,
      cellReference: context.cellReference,
      formula: context.formula,
      status: 'calculating',
      startTime: new Date(),
      dependencies: context.dependencies,
      cached: false
    };

    setState(prev => ({
      ...prev,
      history: [execution, ...prev.history.slice(0, 19)] // Keep last 20
    }));

    try {
      const request: SingleCalculationRequest = {
        context,
        metadata: {
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        }
      };

      const response = await secureAPIClient.calculateFormula(request);

      if (executionId === executionIdRef.current) {
        const completedExecution: FormulaExecution = {
          ...execution,
          status: 'completed',
          result: response.result,
          endTime: new Date(),
          executionTime: response.calculationTime,
          cached: response.cached
        };

        setState(prev => ({
          ...prev,
          result: response.result,
          loading: false,
          executionTime: response.calculationTime,
          cached: response.cached,
          dependencies: response.dependencies,
          history: [completedExecution, ...prev.history.slice(1)]
        }));

        if (onCalculationComplete) {
          onCalculationComplete(response.result, context);
        }
      }
    } catch (error) {
      if (executionId === executionIdRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
        
        const failedExecution: FormulaExecution = {
          ...execution,
          status: 'error',
          error: errorMessage,
          endTime: new Date()
        };

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          history: [failedExecution, ...prev.history.slice(1)]
        }));

        if (onError) {
          onError(errorMessage, context);
        }
      }
    }
  };

  // Batch calculation
  const calculateBatch = async () => {
    if (state.batchFormulas.length === 0) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const request: BatchCalculationRequest = {
        contexts: state.batchFormulas,
        options: {
          parallel: true,
          maxConcurrency: 5,
          timeout: 30000
        },
        metadata: {
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        }
      };

      const response = await secureAPIClient.calculateFormulasBatch(request);

      setState(prev => ({
        ...prev,
        loading: false,
        result: response.results,
        executionTime: response.totalCalculationTime,
        cached: response.cacheHitRate > 0
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch calculation failed';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  // Add sample formula
  const addSampleFormula = (sample: typeof SAMPLE_FORMULAS[0]) => {
    setState(prev => ({ ...prev, formula: sample.formula }));
  };

  // Add to batch
  const addToBatch = () => {
    if (!state.formula || !state.formula.startsWith('=')) return;

    const context = buildContext();
    setState(prev => ({
      ...prev,
      batchFormulas: [...prev.batchFormulas, context],
      formula: '',
      cellReference: `A${prev.batchFormulas.length + 2}`
    }));
  };

  // Remove from batch
  const removeFromBatch = (index: number) => {
    setState(prev => ({
      ...prev,
      batchFormulas: prev.batchFormulas.filter((_, i) => i !== index)
    }));
  };

  // Handle input change
  const handleInputChange = (key: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setState(prev => ({
      ...prev,
      inputs: { ...prev.inputs, [key]: numericValue }
    }));
  };

  // Render execution status
  const renderExecutionStatus = (execution: FormulaExecution) => {
    const statusColors = {
      pending: 'text-yellow-600',
      calculating: 'text-blue-600',
      completed: 'text-green-600',
      error: 'text-red-600'
    };

    const statusIcons = {
      pending: Clock,
      calculating: RefreshCw,
      completed: CheckCircle,
      error: AlertTriangle
    };

    const Icon = statusIcons[execution.status];

    return (
      <div className={`flex items-center gap-2 ${statusColors[execution.status]}`}>
        <Icon className={`w-4 h-4 ${execution.status === 'calculating' ? 'animate-spin' : ''}`} />
        <span className="text-sm capitalize">{execution.status}</span>
        {execution.executionTime && (
          <span className="text-xs text-gray-500">
            ({execution.executionTime}ms)
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`paintbox-section ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold paintbox-gradient-text">
          Excel Formula Engine
        </h3>
        {showBatchMode && (
          <button
            onClick={() => setState(prev => ({ ...prev, batchMode: !prev.batchMode }))}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              state.batchMode 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Batch Mode
          </button>
        )}
      </div>

      {/* Sample Formulas */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Sample Formulas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {SAMPLE_FORMULAS.map((sample, index) => (
            <button
              key={index}
              onClick={() => addSampleFormula(sample)}
              className="p-2 text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors group"
            >
              <div className="font-mono text-sm text-blue-600 group-hover:text-blue-700">
                {sample.formula}
              </div>
              <div className="text-xs text-gray-500 mt-1">{sample.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Formula Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <label className="paintbox-label">Formula</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={state.formula}
              onChange={(e) => setState(prev => ({ ...prev, formula: e.target.value }))}
              className="paintbox-input font-mono text-sm"
              placeholder="=SUM(A1:A10)"
            />
            {!state.batchMode ? (
              <button
                onClick={calculateFormula}
                disabled={state.loading || !state.formula.startsWith('=')}
                className="paintbox-btn paintbox-btn-primary min-w-[100px]"
              >
                {state.loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Calculate
              </button>
            ) : (
              <button
                onClick={addToBatch}
                disabled={!state.formula.startsWith('=')}
                className="paintbox-btn paintbox-btn-secondary"
              >
                Add to Batch
              </button>
            )}
          </div>
        </div>
        
        <div>
          <label className="paintbox-label">Cell Reference</label>
          <input
            type="text"
            value={state.cellReference}
            onChange={(e) => setState(prev => ({ ...prev, cellReference: e.target.value }))}
            className="paintbox-input font-mono text-sm"
            placeholder="A1"
          />
        </div>
      </div>

      {/* Dependencies */}
      {state.dependencies.length > 0 && (
        <div className="mb-4">
          <label className="paintbox-label">Dependencies</label>
          <div className="flex flex-wrap gap-2">
            {state.dependencies.map((dep) => (
              <div key={dep} className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-md">
                <Database className="w-3 h-3 text-blue-600" />
                <span className="text-sm font-mono text-blue-700">{dep}</span>
                <input
                  type="number"
                  value={state.inputs[dep] || 0}
                  onChange={(e) => handleInputChange(dep, e.target.value)}
                  className="w-20 px-1 py-0 text-xs border rounded"
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Mode */}
      {state.batchMode && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-purple-900">Batch Calculations</h4>
            <button
              onClick={calculateBatch}
              disabled={state.loading || state.batchFormulas.length === 0}
              className="paintbox-btn paintbox-btn-primary"
            >
              {state.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Calculate All
            </button>
          </div>
          
          {state.batchFormulas.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Code className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No formulas in batch</p>
            </div>
          ) : (
            <div className="space-y-2">
              {state.batchFormulas.map((context, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-md">
                  <span className="font-mono text-sm text-purple-600 min-w-[60px]">
                    {context.cellReference}
                  </span>
                  <span className="font-mono text-sm flex-1 truncate">
                    {context.formula}
                  </span>
                  <button
                    onClick={() => removeFromBatch(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result Display */}
      {(state.result !== null || state.error) && (
        <div className="mb-4">
          <label className="paintbox-label">Result</label>
          {state.error ? (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{state.error}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-mono text-lg text-green-700">
                    {typeof state.result === 'number' 
                      ? state.result.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : state.result?.toString() || 'N/A'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-green-600">
                  {state.cached && (
                    <div className="flex items-center gap-1">
                      <Database className="w-4 h-4" />
                      Cached
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {state.executionTime}ms
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execution History */}
      {state.history.length > 0 && (
        <div>
          <label className="paintbox-label">Execution History</label>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {state.history.slice(0, 5).map((execution) => (
              <div key={execution.id} className="p-2 bg-gray-50 rounded-md text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-600">{execution.cellReference}</span>
                    <span className="font-mono text-gray-600 truncate max-w-[200px]">
                      {execution.formula}
                    </span>
                  </div>
                  {renderExecutionStatus(execution)}
                </div>
                {execution.result !== undefined && (
                  <div className="mt-1 text-green-700 font-mono">
                    Result: {execution.result}
                  </div>
                )}
                {execution.error && (
                  <div className="mt-1 text-red-700">
                    Error: {execution.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}