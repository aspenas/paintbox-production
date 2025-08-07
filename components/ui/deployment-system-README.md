# Deployment System UI Components

Production-ready UI components for the Paintbox deployment system, designed for field technicians using tablets and responsive web interfaces.

## Components Overview

### Week 1 Focus Components

#### 1. DeploymentStatusDashboard
Main dashboard showing current deployment status, recent deployments, and rollback options.

**Features:**
- Real-time deployment status tracking
- One-click rollback functionality
- Environment-specific deployment triggers
- Mobile-responsive design for tablets

**Usage:**
```typescript
import { DeploymentStatusDashboard } from '@/components/ui';

<DeploymentStatusDashboard
  deployments={deployments}
  onTriggerDeployment={triggerDeployment}
  onRollback={rollbackDeployment}
  onViewLogs={handleViewLogs}
  loading={loading.deployments}
  error={errors.deployments}
/>
```

#### 2. IntegrationErrorHandler
Error display and retry interface for Salesforce/CompanyCam integration failures.

**Features:**
- Automatic retry functionality with exponential backoff
- Error categorization (connection, auth, rate limit, etc.)
- Affected operations tracking
- Manual resolution marking

**Usage:**
```typescript
import { IntegrationErrorHandler } from '@/components/ui';

<IntegrationErrorHandler
  errors={integrationErrors}
  onRetry={retryIntegrationError}
  onResolve={resolveIntegrationError}
  onViewDetails={handleViewDetails}
  loading={loading.integrationErrors}
  error={errors.integrationErrors}
/>
```

#### 3. HealthCheckMonitor
Real-time health monitoring dashboard with system metrics.

**Features:**
- Service health status indicators
- Response time tracking
- System resource monitoring (CPU, memory, connections)
- Auto-refresh with manual override

**Usage:**
```typescript
import { HealthCheckMonitor } from '@/components/ui';

<HealthCheckMonitor
  healthChecks={healthChecks}
  systemMetrics={systemMetrics}
  onRefresh={refreshAll}
  onViewDetails={handleViewDetails}
  loading={loading.healthChecks}
  error={errors.healthChecks}
  refreshInterval={30000}
/>
```

### Week 2 Focus Components

#### 4. SecretsRotationManager
Security management interface for rotating API keys and credentials.

**Features:**
- Immediate and scheduled secret rotation
- Affected services tracking
- Rotation history and status
- Service notification management

**Usage:**
```typescript
import { SecretsRotationManager } from '@/components/ui';

<SecretsRotationManager
  rotations={secretRotations}
  onRotateSecret={rotateSecret}
  onViewDetails={handleViewDetails}
  loading={loading.secretRotations}
  error={errors.secretRotations}
/>
```

#### 5. TabletLayout
Mobile-responsive layout component optimized for tablet access.

**Features:**
- Touch-friendly navigation with swipe gestures
- Collapsible sidebar for mobile
- Real-time system status indicator
- User profile and time display for field work

**Usage:**
```typescript
import { TabletLayout } from '@/components/ui';

<TabletLayout currentPage={currentPage} onNavigate={setCurrentPage}>
  {/* Your page content */}
</TabletLayout>
```

#### 6. DeploymentLogsViewer
Real-time deployment log viewer with WebSocket connection.

**Features:**
- Real-time log streaming via WebSocket
- Log filtering by level, service, and search terms
- Pause/resume functionality
- Export logs to text file
- Auto-scroll with manual override

**Usage:**
```typescript
import { DeploymentLogsViewer } from '@/components/ui';

<DeploymentLogsViewer
  deploymentId={selectedDeployment}
  onClose={() => setShowLogsViewer(false)}
  height="80vh"
/>
```

## Hooks

### useDeploymentSystem
Comprehensive state management hook for all deployment system data.

**Features:**
- Centralized state management
- Automatic data fetching and refresh
- Error handling and loading states
- Action methods for all operations

**Usage:**
```typescript
import { useDeploymentSystem } from '@/hooks/useDeploymentSystem';

const {
  deployments,
  healthChecks,
  integrationErrors,
  secretRotations,
  systemMetrics,
  loading,
  errors,
  triggerDeployment,
  rollbackDeployment,
  retryIntegrationError,
  resolveIntegrationError,
  rotateSecret,
  refreshAll
} = useDeploymentSystem();
```

### useDeploymentLogs
WebSocket-based hook for real-time deployment log streaming.

**Features:**
- WebSocket connection management
- Automatic reconnection on disconnect
- Log buffering for performance
- Connection status tracking

**Usage:**
```typescript
import { useDeploymentLogs } from '@/hooks/useDeploymentLogs';

const {
  logs,
  connected,
  loading,
  error,
  lastUpdate,
  connect,
  disconnect,
  clearLogs,
  exportLogs
} = useDeploymentLogs(deploymentId, {
  maxLogs: 1000,
  autoConnect: true
});
```

## Design System

All components use the Paintbox design system with:

- **Colors**: CSS custom properties (--color-paintbox-*)
- **Typography**: Tailwind typography classes
- **Spacing**: Consistent padding/margin scale
- **Components**: Reusable .paintbox-* CSS classes
- **Animations**: Performance-optimized transitions
- **Accessibility**: WCAG 2.1 AA compliant

## Mobile Responsiveness

Components are designed mobile-first with:

- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Targets**: Minimum 44px for interactive elements
- **Gestures**: Swipe navigation on tablets
- **Typography**: Scalable text sizes
- **Loading States**: Touch-friendly spinners and indicators

## API Integration

Components expect the following API endpoints to be available:

- `POST /deployments` - Trigger new deployments
- `GET /deployments/{id}/logs` - Real-time deployment monitoring
- `GET /health-checks/{id}/results` - Health monitoring
- `POST /secrets/rotate` - Secret rotation
- `GET /integrations/errors` - Integration failure tracking

See `/lib/types/api.ts` for complete TypeScript interfaces.

## Production Considerations

1. **Error Boundaries**: Wrap components in React error boundaries
2. **Loading States**: All components include comprehensive loading states
3. **WebSocket Fallbacks**: Components gracefully handle connection failures
4. **Performance**: Components use React.memo and useCallback for optimization
5. **Security**: All API calls should be authenticated and rate-limited
6. **Monitoring**: Components include telemetry hooks for production monitoring

## Example Implementation

See `/app/deployment-system/page.tsx` for a complete working example of all components integrated together.