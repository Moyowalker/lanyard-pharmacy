'use client';

import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import { ORDER_STATUSES, PRESCRIPTION_STATUSES, type PlatformHealth, type PlatformHealthAlert } from '@lanyard/api-contracts';
import type {
  AdminPrescriptionRecord,
  BranchSummary,
  CustomerOrderSummary,
  UpdateOrderStatusRequest,
} from '@lanyard/api-contracts/client';
import {
  Button,
  DashboardShell,
  DataTable,
  EmptyState,
  FeedbackNotice,
  Field,
  LoadingState,
  Panel,
  ResponsiveGrid,
  SelectInput,
  StatCard,
  StatusBadge,
  UnauthorizedState,
  type FormFeedback,
} from '@lanyard/ui';
import { createAdminApiClient, persistAdminBranchId, readAdminBranchId, readAdminSession } from './admin-session';

type OrderStatus = (typeof ORDER_STATUSES)[number];

const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];
const TERMINAL_PRESCRIPTION_STATUSES = ['fulfilled', 'rejected'] as const;

const navItems = [
  { label: 'Shell', href: '/', active: false },
  { label: 'Dashboard', href: '/dashboard', active: true },
  { label: 'Catalog', href: '/catalog', active: false },
  { label: 'Inventory', href: '/inventory', active: false },
];

const statusTone = (status: OrderStatus): 'neutral' | 'warning' | 'success' | 'danger' => {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'pending_review' || status === 'awaiting_payment') return 'warning';
  return 'neutral';
};

const prescriptionTone = (status: string): 'neutral' | 'warning' | 'success' | 'danger' => {
  if (status === 'fulfilled' || status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'submitted' || status === 'under_review') return 'warning';
  return 'neutral';
};

export function OpsDashboard() {
  const [session] = useState(() => readAdminSession());
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => readAdminBranchId() ?? '');
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [prescriptions, setPrescriptions] = useState<AdminPrescriptionRecord[]>([]);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(true);
  const [ordersNotice, setOrdersNotice] = useState<FormFeedback | null>(null);
  const [prescriptionsNotice, setPrescriptionsNotice] = useState<FormFeedback | null>(null);
  const [healthNotice, setHealthNotice] = useState<FormFeedback | null>(null);
  const [pendingOrderStatus, setPendingOrderStatus] = useState<Record<string, string>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingPrescriptionId, setUpdatingPrescriptionId] = useState<string | null>(null);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    const publicClient = createAdminApiClient(null);

    void publicClient.listBranches().then((liveBranches) => {
      startTransition(() => {
        setBranches(liveBranches);
        if (!selectedBranchId && liveBranches.length > 0) {
          setSelectedBranchId(liveBranches[0]?.id ?? '');
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!session) {
      setIsLoadingOrders(false);
      setIsLoadingPrescriptions(false);
      return;
    }

    let isCancelled = false;

    void apiClient.listAdminOrders().then((data) => {
      if (isCancelled) return;
      startTransition(() => {
        setOrders(data);
        setIsLoadingOrders(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setOrdersNotice({ tone: 'warning', title: 'Orders unavailable', description: 'Could not load orders from the API. Is the backend running?' });
          setIsLoadingOrders(false);
        });
      }
    });

    void apiClient.listPrescriptionQueue().then((data) => {
      if (isCancelled) return;
      startTransition(() => {
        setPrescriptions(data);
        setIsLoadingPrescriptions(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setPrescriptionsNotice({ tone: 'warning', title: 'Prescription queue unavailable', description: 'Could not load prescription queue from the API.' });
          setIsLoadingPrescriptions(false);
        });
      }
    });

    void apiClient.getApiHealth().then((data) => {
      if (isCancelled) return;
      startTransition(() => setHealth(data));
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setHealthNotice({ tone: 'warning', title: 'Health unavailable', description: 'API health endpoint did not respond.' });
        });
      }
    });

    return () => { isCancelled = true; };
  }, [session]);

  function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId);
    persistAdminBranchId(branchId);
  }

  async function handleOrderStatusTransition(orderId: string) {
    const nextStatus = pendingOrderStatus[orderId] as OrderStatus | undefined;
    if (!nextStatus || !session) return;

    setUpdatingOrderId(orderId);
    try {
      const payload: UpdateOrderStatusRequest = { status: nextStatus };
      await apiClient.updateOrderStatus(orderId, payload);
      startTransition(() => {
        setOrders((current) =>
          current.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
        );
        setPendingOrderStatus((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
        setOrdersNotice({ tone: 'success', title: 'Order updated', description: `Order ${orderId} moved to ${nextStatus.replace(/_/g, ' ')}.` });
      });
    } catch {
      startTransition(() =>
        setOrdersNotice({ tone: 'danger', title: 'Status update failed', description: 'The order status could not be changed. Check API and branch-scope access.' }),
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handlePrescriptionAction(
    prescriptionId: string,
    action: 'start_review' | 'approve' | 'reject' | 'clarification' | 'fulfill',
  ) {
    if (!session) return;
    setUpdatingPrescriptionId(prescriptionId);
    try {
      let updated: AdminPrescriptionRecord;

      if (action === 'start_review') {
        updated = await apiClient.startPrescriptionReview(prescriptionId);
      } else if (action === 'fulfill') {
        updated = await apiClient.fulfillPrescription(prescriptionId);
      } else {
        const apiAction = action === 'clarification' ? 'request_clarification' : action;
        updated = await apiClient.reviewPrescription(prescriptionId, apiAction as 'approve' | 'reject' | 'request_clarification');
      }

      startTransition(() => {
        setPrescriptions((current) =>
          current.map((p) => (p.id === prescriptionId ? { ...p, status: updated.status } : p)),
        );
        setPrescriptionsNotice({ tone: 'success', title: 'Prescription updated', description: `Prescription ${prescriptionId} is now ${updated.status.replace(/_/g, ' ')}.` });
      });
    } catch {
      startTransition(() =>
        setPrescriptionsNotice({ tone: 'danger', title: 'Action failed', description: 'The prescription action could not be completed.' }),
      );
    } finally {
      setUpdatingPrescriptionId(null);
    }
  }

  if (!session) {
    return (
      <DashboardShell
        navigation={navItems}
        heading="Operations Dashboard"
        description="Sign in from the admin shell to access the operations dashboard."
      >
        <UnauthorizedState
          title="No active session"
          description="Go back to the admin shell to authenticate before accessing the operations dashboard."
        />
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Go to admin shell</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const activeBranch = branches.find((b) => b.id === selectedBranchId) ?? branches[0] ?? null;
  const branchOrders = selectedBranchId
    ? orders.filter((o) => o.branchId === selectedBranchId)
    : orders;
  const urgentOrders = branchOrders.filter((o) =>
    (['pending_review', 'awaiting_payment', 'processing'] as OrderStatus[]).includes(o.status),
  );
  const pendingPrescriptions = prescriptions.filter((p) =>
    (['submitted', 'under_review'] as Array<typeof PRESCRIPTION_STATUSES[number]>).includes(
      p.status as typeof PRESCRIPTION_STATUSES[number],
    ),
  );
  const alertCount = health?.alerts.length ?? 0;

  return (
    <DashboardShell
      navigation={navItems}
      heading="Operations Dashboard"
      description="Branch-scoped order queue, prescription workflow, and live health signals."
      actions={
        <>
          {activeBranch ? <StatusBadge tone="neutral" dot>{activeBranch.name}</StatusBadge> : null}
          {alertCount > 0 ? <StatusBadge tone="danger" dot>{alertCount} alert{alertCount !== 1 ? 's' : ''}</StatusBadge> : null}
        </>
      }
    >
      {/* Metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Branch orders" value={branchOrders.length} />
        <StatCard label="Needing attention" value={urgentOrders.length} tone={urgentOrders.length > 0 ? 'warning' : 'success'} />
        <StatCard label="Prescriptions pending" value={pendingPrescriptions.length} tone={pendingPrescriptions.length > 0 ? 'warning' : 'success'} />
        <StatCard label="Health alerts" value={alertCount} tone={alertCount > 0 ? 'danger' : 'success'} />
      </div>

      <ResponsiveGrid>
        {/* Branch selector */}
        <Panel title="Branch context" description="All order and activity data below is scoped to the active branch.">
          {branches.length > 0 ? (
            <Field label="Active branch">
              <SelectInput
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                options={branches.map((b) => ({
                  label: `${b.name} · ${b.city}${b.supportsDelivery ? ' · delivery' : ''}`,
                  value: b.id,
                }))}
              />
            </Field>
          ) : (
            <LoadingState title="Loading branches" description="Fetching branch list…" />
          )}
        </Panel>

        {/* Health alerts */}
        {health ? (
          <Panel
            title="Platform health"
            description="Live alert signals from the API and worker health endpoints."
            actions={<StatusBadge tone={health.status === 'ok' ? 'success' : 'danger'}>{health.status}</StatusBadge>}
          >
            {health.alerts.length === 0 ? (
              <FeedbackNotice tone="success" title="All clear" description="No active health alerts on any monitored service." />
            ) : null}
            {health.alerts.map((alert: PlatformHealthAlert) => (
              <FeedbackNotice
                key={alert.code}
                tone={alert.severity === 'critical' ? 'danger' : 'warning'}
                title={alert.code.replace(/_/g, ' ')}
                description={alert.message}
              />
            ))}
          </Panel>
        ) : healthNotice ? (
          <Panel title="Platform health" description="Health endpoint status.">
            <FeedbackNotice {...healthNotice} />
          </Panel>
        ) : null}

        {/* Orders queue */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel
            title="Orders queue"
            description={`${branchOrders.length} order${branchOrders.length !== 1 ? 's' : ''} at ${activeBranch?.name ?? 'selected branch'}.`}
            actions={<StatusBadge tone={urgentOrders.length > 0 ? 'warning' : 'neutral'}>{urgentOrders.length} urgent</StatusBadge>}
          >
            {ordersNotice ? <FeedbackNotice {...ordersNotice} /> : null}
            {isLoadingOrders ? (
              <LoadingState title="Loading orders" description="Fetching branch orders…" />
            ) : (
              <DataTable
                rows={branchOrders}
                emptyState={<EmptyState title="No orders" description="No orders found for this branch yet." />}
                columns={[
                  {
                    key: 'id',
                    header: 'Order ID',
                    render: (row) => (
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', color: '#64748b' }}>
                        {row.id.slice(0, 12)}…
                      </span>
                    ),
                  },
                  {
                    key: 'customer',
                    header: 'Customer',
                    render: (row) => (
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', color: '#64748b' }}>
                        {row.customerId.slice(0, 10)}…
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status.replace(/_/g, ' ')}</StatusBadge>,
                  },
                  {
                    key: 'total',
                    header: 'Total',
                    align: 'right',
                    render: (row) => `₦${(row.total / 100).toLocaleString()}`,
                  },
                  {
                    key: 'rx',
                    header: 'Rx',
                    align: 'center',
                    render: (row) =>
                      row.containsPrescriptionItems ? (
                        <StatusBadge tone="warning">Rx</StatusBadge>
                      ) : null,
                  },
                  {
                    key: 'transition',
                    header: 'Transition to',
                    render: (row) => {
                      if (TERMINAL_ORDER_STATUSES.includes(row.status)) {
                        return <StatusBadge tone="neutral">terminal</StatusBadge>;
                      }
                      return (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <select
                            value={pendingOrderStatus[row.id] ?? ''}
                            onChange={(e) =>
                              setPendingOrderStatus((c) => ({ ...c, [row.id]: e.target.value }))
                            }
                            style={{
                              borderRadius: '0.375rem',
                              border: '1px solid #e2e8f0',
                              padding: '0.3rem 0.5rem',
                              fontSize: '0.8125rem',
                              background: '#fff',
                            }}
                          >
                            <option value="">Pick status</option>
                            {ORDER_STATUSES.filter((s) => s !== row.status).map((s) => (
                              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant={pendingOrderStatus[row.id] ? 'primary' : 'secondary'}
                            disabled={!pendingOrderStatus[row.id] || updatingOrderId === row.id}
                            onClick={() => void handleOrderStatusTransition(row.id)}
                          >
                            {updatingOrderId === row.id ? '…' : 'Apply'}
                          </Button>
                        </div>
                      );
                    },
                  },
                ]}
              />
            )}
          </Panel>
        </div>

        {/* Prescriptions queue */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel
            title="Prescription queue"
            description={`${prescriptions.length} prescription${prescriptions.length !== 1 ? 's' : ''} across all branches.`}
            actions={<StatusBadge tone={pendingPrescriptions.length > 0 ? 'warning' : 'neutral'}>{pendingPrescriptions.length} pending</StatusBadge>}
          >
            {prescriptionsNotice ? <FeedbackNotice {...prescriptionsNotice} /> : null}
            {isLoadingPrescriptions ? (
              <LoadingState title="Loading prescriptions" description="Fetching prescription queue…" />
            ) : (
              <DataTable
                rows={prescriptions}
                emptyState={<EmptyState title="Queue is clear" description="No prescriptions are awaiting review." />}
                columns={[
                  {
                    key: 'id',
                    header: 'Prescription ID',
                    render: (row) => (
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', color: '#64748b' }}>
                        {row.id.slice(0, 12)}…
                      </span>
                    ),
                  },
                  {
                    key: 'customer',
                    header: 'Customer',
                    render: (row) => (
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', color: '#64748b' }}>
                        {row.customerId.slice(0, 10)}…
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <StatusBadge tone={prescriptionTone(row.status)}>{row.status.replace(/_/g, ' ')}</StatusBadge>,
                  },
                  {
                    key: 'uploaded',
                    header: 'Uploaded',
                    render: (row) => new Date(row.uploadedAt).toLocaleDateString(),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (row) => {
                      const isTerminal = (TERMINAL_PRESCRIPTION_STATUSES as readonly string[]).includes(row.status);
                      if (isTerminal) {
                        return <StatusBadge tone={row.status === 'fulfilled' ? 'success' : 'danger'}>{row.status}</StatusBadge>;
                      }
                      const isUpdating = updatingPrescriptionId === row.id;
                      return (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {row.status === 'submitted' && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isUpdating}
                              onClick={() => void handlePrescriptionAction(row.id, 'start_review')}
                            >
                              {isUpdating ? '…' : 'Start review'}
                            </Button>
                          )}
                          {row.status === 'under_review' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={isUpdating}
                                onClick={() => void handlePrescriptionAction(row.id, 'approve')}
                              >
                                {isUpdating ? '…' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isUpdating}
                                onClick={() => void handlePrescriptionAction(row.id, 'clarification')}
                              >
                                Clarify
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isUpdating}
                                onClick={() => void handlePrescriptionAction(row.id, 'reject')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {row.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isUpdating}
                              onClick={() => void handlePrescriptionAction(row.id, 'fulfill')}
                            >
                              {isUpdating ? '…' : 'Fulfill'}
                            </Button>
                          )}
                          {row.status === 'clarification_requested' && (
                            <StatusBadge tone="warning">awaiting customer</StatusBadge>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
              />
            )}
          </Panel>
        </div>
      </ResponsiveGrid>
    </DashboardShell>
  );
}
