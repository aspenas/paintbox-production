'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  GitBranch, 
  Target, 
  Database, 
  ArrowRight, 
  Zap, 
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from 'lucide-react';

interface DependencyNode {
  id: string;
  type: 'formula' | 'input' | 'result';
  label: string;
  value?: any;
  formula?: string;
  dependencies: string[];
  dependents: string[];
  x: number;
  y: number;
  level: number;
  status: 'idle' | 'calculating' | 'completed' | 'error';
}

interface DependencyEdge {
  from: string;
  to: string;
  label?: string;
  active: boolean;
}

interface DependencyVisualizationProps {
  formulas: Record<string, string>;
  inputs: Record<string, any>;
  onNodeClick?: (nodeId: string) => void;
  onFormulaSelect?: (formula: string) => void;
  className?: string;
  showValues?: boolean;
  animate?: boolean;
}

export default function DependencyVisualization({
  formulas,
  inputs,
  onNodeClick,
  onFormulaSelect,
  className = '',
  showValues = true,
  animate = true
}: DependencyVisualizationProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showNodeValues, setShowNodeValues] = useState(showValues);
  const [isExpanded, setIsExpanded] = useState(false);
  const [calculationTrace, setCalculationTrace] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Extract cell references from formula
  const extractCellRefs = (formula: string): string[] => {
    const cellRegex = /[A-Z]+[0-9]+/g;
    return formula.match(cellRegex) || [];
  };

  // Build dependency graph
  const dependencyGraph = useMemo(() => {
    const nodes: Record<string, DependencyNode> = {};
    const edges: DependencyEdge[] = [];

    // Create input nodes
    Object.entries(inputs).forEach(([cellRef, value]) => {
      nodes[cellRef] = {
        id: cellRef,
        type: 'input',
        label: cellRef,
        value,
        dependencies: [],
        dependents: [],
        x: 0,
        y: 0,
        level: 0,
        status: 'completed'
      };
    });

    // Create formula nodes and edges
    Object.entries(formulas).forEach(([cellRef, formula]) => {
      const dependencies = extractCellRefs(formula);
      
      nodes[cellRef] = {
        id: cellRef,
        type: 'formula',
        label: cellRef,
        formula,
        dependencies,
        dependents: [],
        x: 0,
        y: 0,
        level: 0,
        status: 'idle'
      };

      // Create edges
      dependencies.forEach(dep => {
        if (nodes[dep]) {
          edges.push({
            from: dep,
            to: cellRef,
            active: false
          });
          nodes[dep].dependents.push(cellRef);
        }
      });
    });

    // Calculate levels (topological ordering)
    const calculateLevels = () => {
      const visited = new Set<string>();
      const levels: Record<string, number> = {};

      const dfs = (nodeId: string): number => {
        if (visited.has(nodeId)) return levels[nodeId] || 0;
        visited.add(nodeId);

        const node = nodes[nodeId];
        if (!node) return 0;

        if (node.type === 'input') {
          levels[nodeId] = 0;
          return 0;
        }

        let maxLevel = 0;
        node.dependencies.forEach(dep => {
          maxLevel = Math.max(maxLevel, dfs(dep) + 1);
        });

        levels[nodeId] = maxLevel;
        node.level = maxLevel;
        return maxLevel;
      };

      Object.keys(nodes).forEach(nodeId => dfs(nodeId));
    };

    calculateLevels();

    // Position nodes
    const levelWidth = 200;
    const nodeHeight = 80;
    const levelsMap: Record<number, string[]> = {};

    // Group nodes by level
    Object.values(nodes).forEach(node => {
      if (!levelsMap[node.level]) levelsMap[node.level] = [];
      levelsMap[node.level].push(node.id);
    });

    // Position nodes within levels
    Object.entries(levelsMap).forEach(([level, nodeIds]) => {
      const levelNum = parseInt(level);
      nodeIds.forEach((nodeId, index) => {
        const node = nodes[nodeId];
        node.x = levelNum * levelWidth + 100;
        node.y = index * nodeHeight + 100;
      });
    });

    return { nodes, edges };
  }, [formulas, inputs]);

  // Handle node selection
  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    const node = dependencyGraph.nodes[nodeId];
    
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
    
    if (node.type === 'formula' && onFormulaSelect && node.formula) {
      onFormulaSelect(node.formula);
    }
  };

  // Trace calculation path
  const traceCalculation = (targetNodeId: string) => {
    const trace: string[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = dependencyGraph.nodes[nodeId];
      if (!node) return;

      trace.push(nodeId);

      // Visit dependencies first (inputs)
      node.dependencies.forEach(dep => {
        if (dependencyGraph.nodes[dep]) {
          dfs(dep);
        }
      });
    };

    dfs(targetNodeId);
    setCalculationTrace(trace);

    // Animate the trace
    if (animate) {
      trace.forEach((nodeId, index) => {
        setTimeout(() => {
          dependencyGraph.nodes[nodeId].status = 'calculating';
          // Force re-render
          setCalculationTrace([...trace]);
        }, index * 300);
      });

      setTimeout(() => {
        trace.forEach(nodeId => {
          dependencyGraph.nodes[nodeId].status = 'completed';
        });
        setCalculationTrace([...trace]);
      }, trace.length * 300 + 500);
    }
  };

  // Get node color based on type and status
  const getNodeColor = (node: DependencyNode) => {
    if (node.id === selectedNode) {
      return 'fill-purple-500 stroke-purple-700';
    }

    switch (node.status) {
      case 'calculating':
        return 'fill-yellow-200 stroke-yellow-500';
      case 'error':
        return 'fill-red-200 stroke-red-500';
      case 'completed':
        switch (node.type) {
          case 'input':
            return 'fill-blue-200 stroke-blue-500';
          case 'formula':
            return 'fill-green-200 stroke-green-500';
          default:
            return 'fill-gray-200 stroke-gray-500';
        }
      default:
        return 'fill-gray-100 stroke-gray-400';
    }
  };

  // Get node icon
  const getNodeIcon = (node: DependencyNode) => {
    switch (node.type) {
      case 'input':
        return Database;
      case 'formula':
        return Target;
      default:
        return AlertTriangle;
    }
  };

  // Calculate SVG dimensions
  const svgBounds = useMemo(() => {
    const nodes = Object.values(dependencyGraph.nodes);
    if (nodes.length === 0) return { width: 400, height: 300 };

    const maxX = Math.max(...nodes.map(n => n.x)) + 150;
    const maxY = Math.max(...nodes.map(n => n.y)) + 100;

    return {
      width: Math.max(maxX, 400),
      height: Math.max(maxY, 300)
    };
  }, [dependencyGraph.nodes]);

  return (
    <div className={`paintbox-section ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold paintbox-gradient-text">
            Dependency Graph
          </h3>
          <div className="text-sm text-gray-500">
            {Object.keys(dependencyGraph.nodes).length} nodes, {dependencyGraph.edges.length} edges
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNodeValues(!showNodeValues)}
            className={`p-2 rounded-md transition-colors ${
              showNodeValues ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
            }`}
            title={showNodeValues ? 'Hide values' : 'Show values'}
          >
            {showNodeValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 border-2 border-blue-500 rounded"></div>
          <span className="text-sm">Input</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 border-2 border-green-500 rounded"></div>
          <span className="text-sm">Formula</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-500 rounded"></div>
          <span className="text-sm">Calculating</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-gray-500" />
          <span className="text-sm">Dependency</span>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className={`bg-white rounded-lg border overflow-auto ${isExpanded ? 'h-[600px]' : 'h-[400px]'}`}>
        <svg
          ref={svgRef}
          width={svgBounds.width}
          height={svgBounds.height}
          className="min-w-full min-h-full"
        >
          {/* Define arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6b7280"
              />
            </marker>
          </defs>

          {/* Render edges */}
          {dependencyGraph.edges.map((edge, index) => {
            const fromNode = dependencyGraph.nodes[edge.from];
            const toNode = dependencyGraph.nodes[edge.to];
            
            if (!fromNode || !toNode) return null;

            const isActive = calculationTrace.includes(edge.from) && calculationTrace.includes(edge.to);

            return (
              <line
                key={`${edge.from}-${edge.to}-${index}`}
                x1={fromNode.x + 60}
                y1={fromNode.y + 30}
                x2={toNode.x}
                y2={toNode.y + 30}
                stroke={isActive ? '#8b5cf6' : '#6b7280'}
                strokeWidth={isActive ? 3 : 2}
                markerEnd="url(#arrowhead)"
                className="transition-all duration-300"
              />
            );
          })}

          {/* Render nodes */}
          {Object.values(dependencyGraph.nodes).map((node) => {
            const Icon = getNodeIcon(node);
            const colorClass = getNodeColor(node);
            const isCalculating = node.status === 'calculating';

            return (
              <g key={node.id}>
                {/* Node background */}
                <rect
                  x={node.x}
                  y={node.y}
                  width="120"
                  height="60"
                  rx="8"
                  className={`${colorClass} cursor-pointer stroke-2 transition-all duration-200 hover:stroke-purple-500`}
                  onClick={() => handleNodeClick(node.id)}
                />

                {/* Node icon */}
                <foreignObject
                  x={node.x + 8}
                  y={node.y + 8}
                  width="20"
                  height="20"
                >
                  <div className="flex items-center justify-center">
                    {isCalculating ? (
                      <RefreshCw className="w-4 h-4 text-gray-600 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                </foreignObject>

                {/* Node label */}
                <text
                  x={node.x + 35}
                  y={node.y + 22}
                  className="fill-gray-900 text-sm font-medium"
                  fontSize="14"
                >
                  {node.label}
                </text>

                {/* Node value */}
                {showNodeValues && node.value !== undefined && (
                  <text
                    x={node.x + 35}
                    y={node.y + 40}
                    className="fill-gray-600 text-xs font-mono"
                    fontSize="12"
                  >
                    {typeof node.value === 'number' 
                      ? node.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : node.value.toString()
                    }
                  </text>
                )}

                {/* Node formula preview */}
                {node.formula && node.id === selectedNode && (
                  <text
                    x={node.x + 35}
                    y={node.y + 52}
                    className="fill-purple-600 text-xs font-mono"
                    fontSize="10"
                  >
                    {node.formula.slice(0, 15)}...
                  </text>
                )}

                {/* Selection indicator */}
                {node.id === selectedNode && (
                  <rect
                    x={node.x - 3}
                    y={node.y - 3}
                    width="126"
                    height="66"
                    rx="11"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details */}
      {selectedNode && dependencyGraph.nodes[selectedNode] && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">
              {dependencyGraph.nodes[selectedNode].label}
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Type:</strong> {dependencyGraph.nodes[selectedNode].type}
            </div>
            <div>
              <strong>Level:</strong> {dependencyGraph.nodes[selectedNode].level}
            </div>
            
            {dependencyGraph.nodes[selectedNode].formula && (
              <div className="md:col-span-2">
                <strong>Formula:</strong>
                <code className="ml-2 bg-white px-2 py-1 rounded font-mono text-xs">
                  {dependencyGraph.nodes[selectedNode].formula}
                </code>
              </div>
            )}
            
            {dependencyGraph.nodes[selectedNode].dependencies.length > 0 && (
              <div>
                <strong>Dependencies:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dependencyGraph.nodes[selectedNode].dependencies.map(dep => (
                    <span key={dep} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {dependencyGraph.nodes[selectedNode].dependents.length > 0 && (
              <div>
                <strong>Dependents:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dependencyGraph.nodes[selectedNode].dependents.map(dep => (
                    <span key={dep} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => traceCalculation(selectedNode)}
              className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 flex items-center gap-1"
            >
              <Zap className="w-4 h-4" />
              Trace Calculation
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {Object.keys(dependencyGraph.nodes).length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">No Dependencies Found</p>
          <p className="text-sm">Add some formulas to see the dependency graph</p>
        </div>
      )}
    </div>
  );
}