'use client';

import { startTransition, useEffect, useState } from 'react';
import type {
  AdminPrescriptionRecord,
} from '@lanyard/api-contracts/client';
import {
  Button,
  DashboardShell,
  DataTable,
  EmptyState,
  FeedbackNotice,
  LoadingState,
  Panel,
  ResponsiveGrid,
  StatCard,
  StatusBadge,
  TextInput,
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
  { label: 'Prescriptions', href: '/prescriptions', active: true },
  { label: 'Customers', href: '/customers', active: false },
  { label: 'Users', href: '/users', active: false },
  { label: 'Audit', href: '/audit', active: false },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'clarification_requested', label: 'Clarification Requested' },
];

export function PrescriptionReview() {
  const [session] = useState(() => readAdminSession());
  const [prescriptions, setPrescriptions] = useState<AdminPrescriptionRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<FormFeedback | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    if (!session) return;
    let isCancelled = false;

    void apiClient.listPrescriptionQueue().then((data) => {
      if (isCancelled) return;
      startTransition(() => {
        setPrescriptions(data);
        setIsLoading(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setNotice({ tone: 'warning', title: 'Load failed', description: 'Could not load prescription queue.' });
          setIsLoading(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, []);

  if (!session) return <UnauthorizedState title="Access denied" description="You must be signed in as an admin to review prescriptions." />;

  const filtered = statusFilter === 'all'
    ? prescriptions
    : prescriptions.filter((p) => p.status === statusFilter);

  const handleAction = (id: string, action: 'approve' | 'reject' | 'request_clarification') => {
    setActioningId(id);
    void apiClient.reviewPrescription(id, action)
      .then((updated) => {
        startTransition(() => {
          setPrescriptions((prev) => prev.map((p) => p.id === id ? updated : p));
          setActioningId(null);
          setNotice({ tone: 'success', title: 'Updated', description: `Prescription ${id.slice(0, 8)} marked as ${updated.status}.` });
        });
      })
      .catch(() => {
        startTransition(() => {
          setNotice({ tone: 'danger', title: 'Action failed', description: `Could not update prescription ${id.slice(0, 8)}.` });
          setActioningId(null);
        });
      });
  };

  const handleStartReview = (id: string) => {
    setActioningId(id);
    void apiClient.startPrescriptionReview(id)
      .then((updated) => {
        startTransition(() => {
          setPrescriptions((prev) => prev.map((p) => p.id === id ? updated : p));
          setActioningId(null);
        });
      })
      .catch(() => {
        startTransition(() => {
          setNotice({ tone: 'danger', title: 'Action failed', description: `Could not start review for ${id.slice(0, 8)}.` });
          setActioningId(null);
        });
      });
  };

  const handleFulfill = (id: string) => {
    setActioningId(id);
    void apiClient.fulfillPrescription(id)
      .then((updated) => {
        startTransition(() => {
          setPrescriptions((prev) => prev.map((p) => p.id === id ? updated : p));
          setActioningId(null);
        });
      })
      .catch(() => {
        startTransition(() => {
          setNotice({ tone: 'danger', title: 'Fulfill failed', description: `Could not fulfill prescription ${id.slice(0, 8)}.` });
          setActioningId(null);
        });
      });
  };

  const totalCount = prescriptions.length;
  const submittedCount = prescriptions.filter((p) => p.status === 'submitted').length;
  const underReviewCount = prescriptions.filter((p) => p.status === 'under_review').length;
  const approvedCount = prescriptions.filter((p) => p.status === 'approved').length;

  const tableColumns = [
    { key: 'id', header: 'ID', render: (p: AdminPrescriptionRecord) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.id.slice(0, 12)}…</span>
    )},
    { key: 'customer', header: 'Customer ID', render: (p: AdminPrescriptionRecord) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.customerId.slice(0, 12)}…</span>
    )},
    { key: 'order', header: 'Order', render: (p: AdminPrescriptionRecord) => p.orderId ? (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.orderId.slice(0, 12)}…</span>
    ) : <span style={{ color: '#9ca3af' }}>none</span> },
    { key: 'status', header: 'Status', render: (p: AdminPrescriptionRecord) => (
      <StatusBadge tone={p.status === 'approved' || p.status === 'fulfilled' ? 'success' : p.status === 'rejected' ? 'danger' : p.status === 'under_review' ? 'warning' : 'neutral'}>{p.status.replace(/_/g, ' ')}</StatusBadge>
    ) },
    { key: 'uploaded', header: 'Uploaded', render: (p: AdminPrescriptionRecord) => new Date(p.uploadedAt).toLocaleDateString() },
    { key: 'reviewer', header: 'Reviewer', render: (p: AdminPrescriptionRecord) => p.reviewedBy ?? <span style={{ color: '#9ca3af' }}>—</span> },
    { key: 'actions', header: 'Actions', render: (p: AdminPrescriptionRecord) => {
      const isActioning = actioningId === p.id;
      if (p.status === 'submitted') {
        return (
          <Button size="sm" disabled={isActioning} onClick={() => handleStartReview(p.id)}>
            Start Review
          </Button>
        );
      }
      if (p.status === 'under_review') {
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <TextInput
              value={actionNotes[p.id] ?? ''}
              onChange={(e) => setActionNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
              placeholder="Notes (optional)"
            />
            <Button size="sm" disabled={isActioning} onClick={() => handleAction(p.id, 'approve')}>Approve</Button>
            <Button size="sm" disabled={isActioning} onClick={() => handleAction(p.id, 'reject')}>Reject</Button>
            <Button size="sm" disabled={isActioning} onClick={() => handleAction(p.id, 'request_clarification')}>Clarify</Button>
          </div>
        );
      }
      if (p.status === 'approved') {
        return (
          <Button size="sm" disabled={isActioning} onClick={() => handleFulfill(p.id)}>
            Fulfill
          </Button>
        );
      }
      return <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>;
    }},
  ];

  return (
    <DashboardShell
      navigation={navItems}
      heading="Prescription Review"
      description="Review and action customer prescription submissions."
    >
      {notice && <FeedbackNotice tone={notice.tone} title={notice.title} description={notice.description} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total" value={String(totalCount)} />
        <StatCard label="Submitted" value={String(submittedCount)} />
        <StatCard label="Under Review" value={String(underReviewCount)} />
        <StatCard label="Approved" value={String(approvedCount)} />
      </div>

      <ResponsiveGrid>
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Filter by Status" description="">
            <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer' }}
          >
            {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          </Panel>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title={`Prescriptions (${filtered.length})`} description="Use the action buttons to progress prescriptions through the review workflow.">
            {isLoading ? (
              <LoadingState title="Loading" description="Fetching prescriptions…" />
            ) : filtered.length === 0 ? (
              <EmptyState title="No prescriptions found" description="No prescriptions match the current filter." />
            ) : (
              <DataTable
                columns={tableColumns}
                rows={filtered}
              />
            )}
          </Panel>
        </div>
      </ResponsiveGrid>
    </DashboardShell>
  );
}
