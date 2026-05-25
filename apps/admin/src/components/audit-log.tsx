'use client';

import { startTransition, useEffect, useState } from 'react';
import type {
  AuditEventRecord,
  WorkflowEventRecord,
} from '@lanyard/api-contracts/client';
import {
  DashboardShell,
  DataTable,
  EmptyState,
  FeedbackNotice,
  LoadingState,
  Panel,
  ResponsiveGrid,
  StatCard,
  StatusBadge,
  UnauthorizedState,
  type FormFeedback,
} from '@lanyard/ui';
import { createAdminApiClient, readAdminSession } from './admin-session';

const navItems = [
  { label: 'Shell', href: '/', active: false },
  { label: 'Dashboard', href: '/dashboard', active: false },
  { label: 'Catalog', href: '/catalog', active: false },
  { label: 'Inventory', href: '/inventory', active: false },
  { label: 'Orders', href: '/orders', active: false },
  { label: 'Prescriptions', href: '/prescriptions', active: false },
  { label: 'Customers', href: '/customers', active: false },
  { label: 'Users', href: '/users', active: false },
  { label: 'Audit', href: '/audit', active: true },
];

export function AuditLog() {
  const [session] = useState(() => readAdminSession());
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [notificationEvents, setNotificationEvents] = useState<WorkflowEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<FormFeedback | null>(null);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    if (!session) return;
    let isCancelled = false;

    void Promise.all([
      apiClient.listAuditEvents(200),
      apiClient.listNotificationEvents(200),
    ]).then(([auditData, notifData]) => {
      if (isCancelled) return;
      startTransition(() => {
        setAuditEvents(auditData);
        setNotificationEvents(notifData);
        setIsLoading(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setNotice({ tone: 'warning', title: 'Load failed', description: 'Could not load audit data.' });
          setIsLoading(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, []);

  if (!session) return <UnauthorizedState title="Access denied" description="You must be signed in as an admin to view the audit log." />;

  const totalAudit = auditEvents.length;
  const totalNotif = notificationEvents.length;
  const failedNotif = notificationEvents.filter((e) => e.status === 'dead_lettered' || e.status === 'failed').length;

  const auditColumns = [
    { key: 'actor', header: 'Actor', render: (e: AuditEventRecord) => e.actorEmail ?? <span style={{ color: '#9ca3af' }}>system</span> },
    { key: 'action', header: 'Action', render: (e: AuditEventRecord) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{e.action}</span>
    )},
    { key: 'entityType', header: 'Entity Type', render: (e: AuditEventRecord) => e.entityType },
    { key: 'entityId', header: 'Entity ID', render: (e: AuditEventRecord) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.entityId.slice(0, 16)}…</span>
    )},
    { key: 'timestamp', header: 'Timestamp', render: (e: AuditEventRecord) => new Date(e.createdAt).toLocaleString() },
  ];

  const notifColumns = [
    { key: 'eventType', header: 'Event Type', render: (e: WorkflowEventRecord) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.eventType}</span>
    )},
    { key: 'entity', header: 'Entity', render: (e: WorkflowEventRecord) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.entityType}/{e.entityId.slice(0, 10)}…</span>
    )},
    { key: 'status', header: 'Status', render: (e: WorkflowEventRecord) => (
      <StatusBadge tone={e.status === 'processed' ? 'success' : e.status === 'dead_lettered' ? 'danger' : 'neutral'}>{e.status.replace(/_/g, ' ')}</StatusBadge>
    ) },
    { key: 'attempts', header: 'Attempts', render: (e: WorkflowEventRecord) => `${e.attempts}/${e.maxAttempts}` },
    { key: 'timestamp', header: 'Created', render: (e: WorkflowEventRecord) => new Date(e.createdAt).toLocaleString() },
  ];

  return (
    <DashboardShell
      navigation={navItems}
      heading="Audit Log"
      description="Review all system audit events and notification workflow history."
    >
      {notice && <FeedbackNotice tone={notice.tone} title={notice.title} description={notice.description} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Audit Events" value={String(totalAudit)} />
        <StatCard label="Notifications" value={String(totalNotif)} />
        <StatCard label="Failed Notifications" value={String(failedNotif)} />
      </div>

      <ResponsiveGrid>
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Audit Events" description="Actions taken by users and the system, in reverse chronological order.">
            {isLoading ? (
              <LoadingState title="Loading" description="Fetching audit events…" />
            ) : auditEvents.length === 0 ? (
              <EmptyState title="No audit events" description="No events have been recorded yet." />
            ) : (
              <DataTable
                columns={auditColumns}
                rows={auditEvents}
              />
            )}
          </Panel>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Notification Events" description="Workflow events queued for delivery to customers.">
            {isLoading ? (
              <LoadingState title="Loading" description="Fetching notification events…" />
            ) : notificationEvents.length === 0 ? (
              <EmptyState title="No notification events" description="No notification events have been recorded yet." />
            ) : (
              <DataTable
                columns={notifColumns}
                rows={notificationEvents}
              />
            )}
          </Panel>
        </div>
      </ResponsiveGrid>
    </DashboardShell>
  );
}
