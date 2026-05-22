import {
  HEALTH_ALERT_CODES,
  WORKFLOW_EVENT_STATUSES,
  createPlatformApiClient,
  createPlatformSession,
  parsePlatformSession,
  resolveApiBaseUrl,
  serializePlatformSession,
  type PlatformHealth,
} from '@lanyard/api-contracts';
import {
  AppShell,
  DataTable,
  ErrorState,
  Panel,
  PrimaryNav,
  ResponsiveGrid,
  StatusBadge,
  UnauthorizedState,
} from '@lanyard/ui';

const workerHealth: PlatformHealth = {
  service: 'worker',
  status: 'degraded',
  timestamp: '2026-05-22T00:00:00.000Z',
  uptimeSeconds: 43210,
  metrics: {
    httpRequestsTotal: 14,
    healthChecksTotal: 4,
    workflowEventsProcessedTotal: 31,
    workflowEventsRetriedTotal: 3,
    workflowEventsDeadLetteredTotal: 1,
    notificationDispatchesTotal: 27,
    queueDepth: 2,
    retryBacklog: 1,
    deadLetterCount: 1,
  },
  alerts: [
    {
      code: 'workflow_dead_letters_present',
      severity: 'critical',
      count: 1,
      message: 'One workflow event requires manual intervention.',
    },
  ],
};

const adminClient = createPlatformApiClient({
  baseUrl: resolveApiBaseUrl('http://localhost:4000'),
});

const adminSession = createPlatformSession({
  accessToken: 'demo-admin-token',
  user: {
    sub: 'admin-001',
    email: 'admin@lanyardpharmacy.com',
    roles: ['super_admin'],
    branchIds: ['branch-main', 'branch-airport'],
  },
});

const restoredSession = parsePlatformSession(serializePlatformSession(adminSession));

const queueRows = [
  {
    area: 'Worker queue',
    value: `${workerHealth.metrics.queueDepth} pending or processing`,
    tone: 'warning' as const,
  },
  {
    area: 'Retry backlog',
    value: `${workerHealth.metrics.retryBacklog} awaiting replay`,
    tone: 'warning' as const,
  },
  {
    area: 'Dead letters',
    value: `${workerHealth.metrics.deadLetterCount} requiring intervention`,
    tone: 'danger' as const,
  },
];

export default function Home() {
  return (
    <AppShell
      eyebrow="Shared Frontend Foundation"
      title="Admin Operations Scaffold"
      description="Shared shells, tables, state cards, and typed auth helpers now anchor the admin placeholder instead of a default starter page."
      actions={<StatusBadge tone="danger">{workerHealth.metrics.deadLetterCount} dead letter</StatusBadge>}
      navigation={
        <PrimaryNav
          items={[
            { label: 'Dashboard', href: '#dashboard', active: true },
            { label: 'Queue health', href: '#queue', badge: `${workerHealth.alerts.length} alert` },
            { label: 'Access states', href: '#access' },
          ]}
        />
      }
    >
      <ResponsiveGrid>
        <Panel title="Shared auth helpers" description="The admin app restores session state and shares a typed client configuration with the storefront.">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <strong>API base URL</strong>
              <div style={{ fontFamily: 'Consolas, monospace', color: '#4f5a4f' }}>{adminClient.baseUrl}</div>
            </div>
            <div>
              <strong>Restored admin identity</strong>
              <div style={{ fontFamily: 'Consolas, monospace', color: '#4f5a4f' }}>
                {restoredSession?.user.email} :: {restoredSession?.user.roles.join(', ')}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Queue and alert monitoring"
          description="Shared table and badge primitives support the future operations dashboard and audit monitoring views."
          actions={<StatusBadge tone="warning">{HEALTH_ALERT_CODES.join(' / ')}</StatusBadge>}
        >
          <DataTable
            rows={queueRows}
            columns={[
              {
                key: 'area',
                header: 'Surface',
                render: (row) => row.area,
              },
              {
                key: 'value',
                header: 'Current signal',
                render: (row) => row.value,
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <StatusBadge tone={row.tone}>{row.tone}</StatusBadge>,
                align: 'right',
              },
            ]}
          />
        </Panel>

        <Panel title="Shared state handling" description="Unauthorized and error patterns are shared now instead of being re-invented per page.">
          <div id="access" style={{ display: 'grid', gap: '0.85rem' }}>
            <UnauthorizedState
              title="Branch context required"
              description="Prompt the user to switch into an allowed branch before showing protected inventory or prescription queues."
            />
            <ErrorState
              title="Queue health degraded"
              description="Escalate when dead-letter counts remain above zero after replay and remediation steps."
            />
          </div>
        </Panel>

        <Panel title="Workflow contract coverage" description="Shared workflow status constants keep the admin shell and worker health language aligned.">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} id="queue">
            {WORKFLOW_EVENT_STATUSES.map((status) => (
              <StatusBadge key={status} tone={status === 'dead_lettered' ? 'danger' : status === 'retrying' ? 'warning' : 'neutral'}>
                {status}
              </StatusBadge>
            ))}
          </div>
        </Panel>
      </ResponsiveGrid>
    </AppShell>
  );
}
