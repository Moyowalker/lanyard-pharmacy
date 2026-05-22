import {
  ORDER_STATUSES,
  PRESCRIPTION_STATUSES,
  buildAuthorizationHeaders,
  createPlatformApiClient,
  createPlatformSession,
  resolveApiBaseUrl,
  serializePlatformSession,
  type PlatformHealth,
} from '@lanyard/api-contracts';
import {
  AppShell,
  DialogCard,
  EmptyState,
  Field,
  LoadingState,
  Panel,
  PrimaryNav,
  ResponsiveGrid,
  SelectInput,
  StatusBadge,
  TextInput,
} from '@lanyard/ui';

const apiHealth: PlatformHealth = {
  service: 'api',
  status: 'ok',
  timestamp: '2026-05-22T00:00:00.000Z',
  uptimeSeconds: 86400,
  metrics: {
    httpRequestsTotal: 124,
    healthChecksTotal: 6,
    workflowEventsProcessedTotal: 24,
    workflowEventsRetriedTotal: 2,
    workflowEventsDeadLetteredTotal: 0,
    notificationDispatchesTotal: 18,
    queueDepth: 1,
    retryBacklog: 1,
    deadLetterCount: 0,
  },
  alerts: [
    {
      code: 'workflow_retry_backlog',
      severity: 'warning',
      count: 1,
      message: 'One workflow event is queued for retry.',
    },
  ],
};

const storefrontClient = createPlatformApiClient({
  baseUrl: resolveApiBaseUrl('http://localhost:4000'),
});

const storefrontSession = createPlatformSession({
  accessToken: 'demo-storefront-token',
  user: {
    sub: 'cust-demo',
    email: 'ada@example.com',
    roles: ['customer'],
    branchIds: ['branch-main'],
  },
});

const storefrontHeaders = buildAuthorizationHeaders(storefrontSession.accessToken, {
  'x-branch-context': storefrontSession.user.branchIds[0] ?? '',
});

export default function Home() {
  return (
    <AppShell
      eyebrow="Shared Frontend Foundation"
      title="Storefront Experience Scaffold"
      description="Reusable primitives, design tokens, and typed client helpers now power the storefront placeholder instead of the default Next.js shell."
      actions={<StatusBadge tone="success">Foundation ready</StatusBadge>}
      navigation={
        <PrimaryNav
          items={[
            { label: 'Landing', href: '#landing', active: true },
            { label: 'Branch context', href: '#context', badge: 'pickup + delivery' },
            { label: 'Checkout patterns', href: '#checkout' },
          ]}
        />
      }
    >
      <ResponsiveGrid>
        <Panel
          title="Branch and service context"
          description="Shared form primitives define the branch, service, and prescription entry surface."
          actions={<StatusBadge tone="warning">{apiHealth.alerts.length} retry alert</StatusBadge>}
        >
          <div style={{ display: 'grid', gap: '0.85rem' }} id="context">
            <Field label="Branch" hint="Pickup and stock availability follow the active branch context.">
              <SelectInput
                defaultValue="branch-main"
                options={[
                  { label: 'Main Branch', value: 'branch-main' },
                  { label: 'Airport Branch', value: 'branch-airport' },
                ]}
              />
            </Field>
            <Field label="Service mode" hint="Shared validation patterns keep checkout inputs consistent across apps.">
              <SelectInput
                defaultValue="pickup"
                options={[
                  { label: 'Pickup', value: 'pickup' },
                  { label: 'Delivery', value: 'delivery' },
                ]}
              />
            </Field>
            <Field label="Prescription request" hint="Use the same field patterns for uploads, requests, and refill prompts later.">
              <TextInput defaultValue="Need refill support for Rx-1002" />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Typed client and session helpers"
          description="The storefront consumes shared API base-url, auth-header, and session helpers from @lanyard/api-contracts."
        >
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <strong>API base URL</strong>
              <div style={{ fontFamily: 'Consolas, monospace', color: '#4f5a4f' }}>{storefrontClient.baseUrl}</div>
            </div>
            <div>
              <strong>Auth header preview</strong>
              <div style={{ fontFamily: 'Consolas, monospace', color: '#4f5a4f' }}>{storefrontHeaders.Authorization}</div>
            </div>
            <div>
              <strong>Serialized session</strong>
              <div style={{ fontFamily: 'Consolas, monospace', color: '#4f5a4f', wordBreak: 'break-word' }}>
                {serializePlatformSession(storefrontSession)}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Workflow-driven content states" description="Shared states cover loading, empty, and guided follow-up surfaces.">
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <LoadingState title="Fetching live catalog" description="Hook this state to catalog queries once the storefront reads backend data directly." />
            <EmptyState title="No delivery branches nearby" description="Use this empty state when branch availability filters remove all delivery options." />
          </div>
        </Panel>

        <Panel title="Launch dialog pattern" description="The shared dialog card gives checkout and prescription prompts a common structure.">
          <DialogCard
            title="Prescription-required product"
            description="Amoxicillin is still gated behind the prescription request flow."
            footer={<StatusBadge tone="neutral">Review required before checkout</StatusBadge>}
          >
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <StatusBadge tone="success">{ORDER_STATUSES[2]}</StatusBadge>
              <StatusBadge tone="warning">{PRESCRIPTION_STATUSES[0]}</StatusBadge>
              <StatusBadge tone="neutral">health: {apiHealth.status}</StatusBadge>
            </div>
          </DialogCard>
        </Panel>
      </ResponsiveGrid>
    </AppShell>
  );
}
