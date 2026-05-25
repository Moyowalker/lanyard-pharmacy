'use client';

import { startTransition, useEffect, useState } from 'react';
import type {
  BranchSummary,
  CustomerOrderSummary,
  CustomerProfile,
} from '@lanyard/api-contracts/client';
import {
  DashboardShell,
  DataTable,
  EmptyState,
  FeedbackNotice,
  LoadingState,
  Panel,
  ResponsiveGrid,
  SelectInput,
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
  { label: 'Orders', href: '/orders', active: true },
  { label: 'Prescriptions', href: '/prescriptions', active: false },
  { label: 'Customers', href: '/customers', active: false },
  { label: 'Users', href: '/users', active: false },
  { label: 'Audit', href: '/audit', active: false },
];

const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'awaiting_payment', label: 'Awaiting Payment' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready_for_dispatch', label: 'Ready for Dispatch' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  draft: ['pending_review', 'cancelled'],
  pending_review: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['processing', 'cancelled'],
  processing: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function OrderManagement() {
  const [session] = useState(() => readAdminSession());
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<FormFeedback | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    if (!session) return;
    let isCancelled = false;

    void Promise.all([
      apiClient.listAdminOrders(),
      apiClient.listCustomers(),
      apiClient.listBranches(),
    ]).then(([ordersData, customersData, branchesData]) => {
      if (isCancelled) return;
      startTransition(() => {
        setOrders(ordersData);
        setCustomers(customersData);
        setBranches(branchesData);
        setIsLoading(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setNotice({ tone: 'warning', title: 'Load failed', description: 'Could not load order data from the API.' });
          setIsLoading(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, []);

  if (!session) return <UnauthorizedState title="Access denied" description="You must be signed in as an admin to manage orders." />;

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (branchFilter && o.branchId !== branchFilter) return false;
    return true;
  });

  const customerName = (customerId: string) => {
    const c = customers.find((c) => c.id === customerId);
    return c ? `${c.firstName} ${c.lastName}` : customerId.slice(0, 8);
  };

  const branchName = (branchId: string) => {
    const b = branches.find((b) => b.id === branchId);
    return b?.name ?? branchId.slice(0, 8);
  };

  const handleStatusUpdate = (orderId: string, nextStatus: string) => {
    if (!nextStatus) return;
    setUpdatingOrderId(orderId);
    void apiClient.updateOrderStatus(orderId, { status: nextStatus as CustomerOrderSummary['status'] })
      .then((updated) => {
        startTransition(() => {
          setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: updated.status as CustomerOrderSummary['status'] } : o));
          setUpdatingOrderId(null);
        });
      })
      .catch(() => {
        startTransition(() => {
          setNotice({ tone: 'danger', title: 'Update failed', description: `Could not update order ${orderId}.` });
          setUpdatingOrderId(null);
        });
      });
  };

  const totalOrders = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'pending_review').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  const branchOptions = [
    { value: '', label: 'All branches' },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  const tableColumns = [
    { key: 'id', header: 'Order ID', render: (o: CustomerOrderSummary) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.id.slice(0, 16)}…</span>
    )},
    { key: 'customer', header: 'Customer', render: (o: CustomerOrderSummary) => customerName(o.customerId) },
    { key: 'branch', header: 'Branch', render: (o: CustomerOrderSummary) => branchName(o.branchId) },
    { key: 'status', header: 'Status', render: (o: CustomerOrderSummary) => (
      <StatusBadge tone={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : o.status === 'processing' || o.status === 'in_transit' ? 'warning' : 'neutral'}>{o.status.replace(/_/g, ' ')}</StatusBadge>
    ) },
    { key: 'rx', header: 'Rx', render: (o: CustomerOrderSummary) => o.containsPrescriptionItems ? (
      <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '9999px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>Rx</span>
    ) : null },
    { key: 'total', header: 'Total', render: (o: CustomerOrderSummary) => formatPrice(o.total) },
    { key: 'created', header: 'Created', render: (o: CustomerOrderSummary) => new Date(o.createdAt).toLocaleDateString() },
    { key: 'action', header: 'Update Status', render: (o: CustomerOrderSummary) => {
      const nextOptions = NEXT_STATUS_OPTIONS[o.status] ?? [];
      if (nextOptions.length === 0) return <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>;
      return (
        <SelectInput
          value=""
          onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
          options={[{ value: '', label: 'Move to…' }, ...nextOptions.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]}
          disabled={updatingOrderId === o.id}
        />
      );
    }},
  ];

  return (
    <DashboardShell
      navigation={navItems}
      heading="Order Management"
      description="Review, filter, and update pharmacy orders."
    >
      {notice && <FeedbackNotice tone={notice.tone} title={notice.title} description={notice.description} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Orders" value={String(totalOrders)} />
        <StatCard label="Pending Review" value={String(pendingCount)} />
        <StatCard label="Processing" value={String(processingCount)} />
        <StatCard label="Cancelled" value={String(cancelledCount)} />
      </div>

      <ResponsiveGrid>
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Filters" description="Narrow the orders list by status or branch.">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '12rem' }}>
                <SelectInput
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={ORDER_STATUS_OPTIONS}
                />
              </div>
              <div style={{ flex: 1, minWidth: '12rem' }}>
                <SelectInput
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  options={branchOptions}
                />
              </div>
            </div>
          </Panel>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title={`Orders (${filtered.length})`} description="Click 'Update Status' to advance an order through its workflow.">
            {isLoading ? (
              <LoadingState title="Loading" description="Fetching orders…" />
            ) : filtered.length === 0 ? (
              <EmptyState title="No orders found" description="No orders match the current filters." />
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
