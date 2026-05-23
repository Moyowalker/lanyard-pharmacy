'use client';

import { startTransition, useEffect, useState } from 'react';
import type {
  AdminPrescriptionRecord,
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
  { label: 'Customers', href: '/customers', active: true },
  { label: 'Audit', href: '/audit', active: false },
];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CustomerSupport() {
  const [session] = useState(() => readAdminSession());
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [prescriptions, setPrescriptions] = useState<AdminPrescriptionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<FormFeedback | null>(null);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    if (!session) return;
    let isCancelled = false;

    void Promise.all([
      apiClient.listCustomers(),
      apiClient.listAdminOrders(),
      apiClient.listPrescriptionQueue(),
    ]).then(([customersData, ordersData, rxData]) => {
      if (isCancelled) return;
      startTransition(() => {
        setCustomers(customersData);
        setOrders(ordersData);
        setPrescriptions(rxData);
        setIsLoading(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setNotice({ tone: 'warning', title: 'Load failed', description: 'Could not load customer data.' });
          setIsLoading(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, []);

  if (!session) return <UnauthorizedState title="Access denied" description="You must be signed in as an admin to view customer data." />;

  const searchLower = searchTerm.toLowerCase();
  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm) return true;
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower)
    );
  });

  const selectedCustomer = selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) : null;
  const customerOrders = selectedCustomerId ? orders.filter((o) => o.customerId === selectedCustomerId) : [];
  const customerPrescriptions = selectedCustomerId ? prescriptions.filter((p) => p.customerId === selectedCustomerId) : [];

  const customerColumns = [
    { key: 'name', header: 'Name', render: (c: CustomerProfile) => (
      <button
        onClick={() => setSelectedCustomerId(c.id === selectedCustomerId ? null : c.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: c.id === selectedCustomerId ? 700 : 400, color: c.id === selectedCustomerId ? '#059669' : 'inherit' }}
      >
        {c.firstName} {c.lastName}
      </button>
    )},
    { key: 'email', header: 'Email', render: (c: CustomerProfile) => c.email },
    { key: 'phone', header: 'Phone', render: (c: CustomerProfile) => c.phone ?? <span style={{ color: '#9ca3af' }}>—</span> },
    { key: 'refill', header: 'Refill Opt-In', render: (c: CustomerProfile) => c.refillReminderOptIn ? (
      <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: '9999px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>Yes</span>
    ) : <span style={{ color: '#9ca3af' }}>No</span> },
  ];

  const orderColumns = [
    { key: 'id', header: 'Order ID', render: (o: CustomerOrderSummary) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.id.slice(0, 14)}…</span>
    )},
    { key: 'status', header: 'Status', render: (o: CustomerOrderSummary) => (
      <StatusBadge tone={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'neutral'}>{o.status.replace(/_/g, ' ')}</StatusBadge>
    ) },
    { key: 'total', header: 'Total', render: (o: CustomerOrderSummary) => formatPrice(o.total) },
    { key: 'date', header: 'Date', render: (o: CustomerOrderSummary) => new Date(o.createdAt).toLocaleDateString() },
  ];

  const rxColumns = [
    { key: 'id', header: 'Prescription ID', render: (p: AdminPrescriptionRecord) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.id.slice(0, 14)}…</span>
    )},
    { key: 'status', header: 'Status', render: (p: AdminPrescriptionRecord) => (
      <StatusBadge tone={p.status === 'approved' || p.status === 'fulfilled' ? 'success' : p.status === 'rejected' ? 'danger' : 'neutral'}>{p.status.replace(/_/g, ' ')}</StatusBadge>
    ) },
    { key: 'uploaded', header: 'Uploaded', render: (p: AdminPrescriptionRecord) => new Date(p.uploadedAt).toLocaleDateString() },
  ];

  return (
    <DashboardShell
      navigation={navItems}
      heading="Customer Support"
      description="Search customers and view their orders and prescriptions."
    >
      {notice && <FeedbackNotice tone={notice.tone} title={notice.title} description={notice.description} />}

      <ResponsiveGrid>
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Search Customers" description="Filter by name or email.">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email…"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </Panel>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title={`Customers (${filteredCustomers.length})`} description="Click a customer name to view their orders and prescriptions.">
            {isLoading ? (
              <LoadingState title="Loading" description="Fetching customers…" />
            ) : filteredCustomers.length === 0 ? (
              <EmptyState title="No customers found" description="No customers match the search." />
            ) : (
              <DataTable
                columns={customerColumns}
                rows={filteredCustomers}
              />
            )}
          </Panel>
        </div>

        {selectedCustomer && (
          <>
            <div style={{ gridColumn: '1 / -1' }}>
              <Panel
                title={`Orders for ${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                description={`${customerOrders.length} order(s) found`}
              >
                {customerOrders.length === 0 ? (
                  <EmptyState title="No orders" description="This customer has no orders." />
                ) : (
                  <DataTable
                    columns={orderColumns}
                    rows={customerOrders}
                  />
                )}
              </Panel>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Panel
                title={`Prescriptions for ${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                description={`${customerPrescriptions.length} prescription(s) found`}
              >
                {customerPrescriptions.length === 0 ? (
                  <EmptyState title="No prescriptions" description="This customer has no prescriptions." />
                ) : (
                  <DataTable
                    columns={rxColumns}
                    rows={customerPrescriptions}
                  />
                )}
              </Panel>
            </div>
          </>
        )}
      </ResponsiveGrid>
    </DashboardShell>
  );
}
