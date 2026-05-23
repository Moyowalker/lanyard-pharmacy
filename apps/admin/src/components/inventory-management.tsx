'use client';

import Link from 'next/link';
import { startTransition, useEffect, useState, type FormEvent } from 'react';
import type {
  AdjustInventoryBatchRequest,
  BranchSummary,
  CatalogProduct,
  InventoryBatchRecord,
  LowStockAlertRecord,
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
  TextInput,
  UnauthorizedState,
  ValidationSummary,
  getFieldIssue,
  type FormFeedback,
  type FormIssue,
} from '@lanyard/ui';
import { createAdminApiClient, persistAdminBranchId, readAdminBranchId, readAdminSession } from './admin-session';

const navItems = [
  { label: 'Shell', href: '/', active: false },
  { label: 'Dashboard', href: '/dashboard', active: false },
  { label: 'Catalog', href: '/catalog', active: false },
  { label: 'Inventory', href: '/inventory', active: true },
  { label: 'Orders', href: '/orders', active: false },
  { label: 'Prescriptions', href: '/prescriptions', active: false },
  { label: 'Customers', href: '/customers', active: false },
  { label: 'Audit', href: '/audit', active: false },
];

type AdjustForm = {
  batchId: string;
  quantityDelta: string;
  reason: string;
};

function validateAdjustForm(form: AdjustForm): FormIssue[] {
  const issues: FormIssue[] = [];
  if (!form.batchId) {
    issues.push({ field: 'batchId', message: 'Select an inventory batch to adjust.' });
  }
  const delta = parseInt(form.quantityDelta, 10);
  if (!form.quantityDelta.trim() || Number.isNaN(delta) || delta === 0) {
    issues.push({ field: 'quantityDelta', message: 'Enter a non-zero integer quantity delta (positive to add, negative to remove).' });
  }
  if (!form.reason.trim()) {
    issues.push({ field: 'reason', message: 'Provide a reason for this adjustment so the audit trail is meaningful.' });
  }
  return issues;
}

export function InventoryManagement() {
  const [session] = useState(() => readAdminSession());
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => readAdminBranchId() ?? '');
  const [batches, setBatches] = useState<InventoryBatchRecord[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlertRecord[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [branchNotice, setBranchNotice] = useState<FormFeedback | null>(null);
  const [inventoryNotice, setInventoryNotice] = useState<FormFeedback | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ batchId: '', quantityDelta: '', reason: '' });
  const [adjustIssues, setAdjustIssues] = useState<FormIssue[]>([]);
  const [adjustFeedback, setAdjustFeedback] = useState<FormFeedback | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    const publicClient = createAdminApiClient(null);
    let isCancelled = false;

    void Promise.all([
      publicClient.listBranches(),
      publicClient.listCatalogProducts(),
    ]).then(([branchesData, productsData]) => {
      if (isCancelled) return;
      startTransition(() => {
        setBranches(branchesData);
        setProducts(productsData);
        if (!selectedBranchId && branchesData.length > 0) {
          setSelectedBranchId(branchesData[0]?.id ?? '');
        }
        setIsLoadingBranches(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setBranchNotice({ tone: 'warning', title: 'Branch data unavailable', description: 'Could not load branches from the API.' });
          setIsLoadingBranches(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedBranchId || !session) return;

    let isCancelled = false;
    setIsLoadingInventory(true);
    setBatches([]);
    setAlerts([]);

    void Promise.all([
      apiClient.getBranchInventory(selectedBranchId),
      apiClient.listLowStockAlerts(selectedBranchId),
    ]).then(([batchData, alertData]) => {
      if (isCancelled) return;
      startTransition(() => {
        setBatches(batchData);
        setAlerts(alertData);
        setInventoryNotice(null);
        setIsLoadingInventory(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setInventoryNotice({ tone: 'warning', title: 'Inventory data unavailable', description: 'Could not load inventory data for this branch. Is the API running?' });
          setIsLoadingInventory(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, [selectedBranchId, session]);

  function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId);
    persistAdminBranchId(branchId);
    setAdjustForm({ batchId: '', quantityDelta: '', reason: '' });
    setAdjustIssues([]);
    setAdjustFeedback(null);
  }

  function updateAdjustForm<K extends keyof AdjustForm>(field: K, value: AdjustForm[K]) {
    setAdjustForm((c) => ({ ...c, [field]: value }));
    setAdjustIssues((c) => c.filter((i) => i.field !== field));
    setAdjustFeedback(null);
  }

  async function handleAdjustSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = validateAdjustForm(adjustForm);
    setAdjustIssues(issues);
    if (issues.length) {
      setAdjustFeedback({ tone: 'danger', title: 'Fix the adjustment form', description: 'All fields are required before submitting a stock adjustment.' });
      return;
    }

    setIsAdjusting(true);
    try {
      const payload: AdjustInventoryBatchRequest = {
        quantityDelta: parseInt(adjustForm.quantityDelta, 10),
        reason: adjustForm.reason.trim(),
      };
      const updated = await apiClient.adjustInventoryBatch(adjustForm.batchId, payload);
      startTransition(() => {
        setBatches((current) =>
          current.map((b) =>
            b.id === adjustForm.batchId
              ? { ...b, availableQuantity: updated.availableQuantity, reservedQuantity: updated.reservedQuantity }
              : b,
          ),
        );
        setAdjustFeedback({
          tone: 'success',
          title: 'Adjustment recorded',
          description: `Batch ${adjustForm.batchId.slice(0, 12)}… updated. New available quantity: ${updated.availableQuantity}.`,
        });
        setAdjustForm((c) => ({ ...c, quantityDelta: '', reason: '' }));
        // Reload alerts after adjustment
        void apiClient.listLowStockAlerts(selectedBranchId).then((alertData) => {
          startTransition(() => setAlerts(alertData));
        });
      });
    } catch {
      startTransition(() =>
        setAdjustFeedback({ tone: 'danger', title: 'Adjustment failed', description: 'The stock adjustment could not be applied. The quantity delta may have driven stock below zero, or you may lack the required role.' }),
      );
    } finally {
      setIsAdjusting(false);
    }
  }

  function productName(productId: string) {
    return products.find((p) => p.id === productId)?.name ?? productId;
  }

  if (!session) {
    return (
      <DashboardShell navigation={navItems} heading="Inventory Management" description="Sign in to manage inventory.">
        <UnauthorizedState title="No active session" description="Go back to the admin shell to authenticate before accessing inventory management." />
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Go to admin shell</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const activeBranch = branches.find((b) => b.id === selectedBranchId) ?? branches[0] ?? null;

  return (
    <DashboardShell
      navigation={navItems}
      heading="Stock Visibility & Adjustments"
      description="View branch stock levels, monitor low-stock alerts, and record audited adjustments."
      actions={
        <>
          {activeBranch ? <StatusBadge tone="neutral" dot>{activeBranch.name}</StatusBadge> : null}
          {alerts.length > 0 ? (
            <StatusBadge tone="danger" dot>{alerts.length} low-stock alert{alerts.length !== 1 ? 's' : ''}</StatusBadge>
          ) : null}
        </>
      }
    >
      {/* Metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Batches" value={batches.length} />
        <StatCard label="Total available" value={batches.reduce((s, b) => s + b.availableQuantity, 0)} tone="success" />
        <StatCard label="Total reserved" value={batches.reduce((s, b) => s + b.reservedQuantity, 0)} />
        <StatCard label="Low-stock alerts" value={alerts.length} tone={alerts.length > 0 ? 'danger' : 'success'} />
      </div>

      <ResponsiveGrid>
        {/* Branch selector */}
        <Panel title="Branch context" description="Select the branch to view and adjust inventory for.">
          {branchNotice ? <FeedbackNotice {...branchNotice} /> : null}
          {isLoadingBranches ? (
            <LoadingState title="Loading branches" description="Fetching branch list…" />
          ) : branches.length > 0 ? (
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
          ) : null}
        </Panel>

        {/* Low-stock alerts */}
        <Panel
          title="Low-stock alerts"
          description="Products at or below their minimum threshold at the selected branch."
          actions={
            alerts.length > 0 ? (
              <StatusBadge tone="danger">{alerts.length} active</StatusBadge>
            ) : (
              <StatusBadge tone="success">all clear</StatusBadge>
            )
          }
        >
          {isLoadingInventory ? (
            <LoadingState title="Loading alerts" description="Fetching low-stock alerts…" />
          ) : (
            <DataTable
              rows={alerts}
              emptyState={<EmptyState title="No alerts" description="All products at this branch are above minimum thresholds." />}
              columns={[
                {
                  key: 'product',
                  header: 'Product',
                  render: (row) => (
                    <span style={{ fontSize: '0.875rem' }}>{productName(row.productId)}</span>
                  ),
                },
                {
                  key: 'available',
                  header: 'Available',
                  align: 'right',
                  render: (row) => (
                    <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#dc2626' }}>
                      {row.availableQuantity}
                    </span>
                  ),
                },
                {
                  key: 'threshold',
                  header: 'Threshold',
                  align: 'right',
                  render: (row) => row.threshold,
                },
                {
                  key: 'severity',
                  header: 'Severity',
                  align: 'right',
                  render: (row) => (
                    <StatusBadge tone={row.availableQuantity === 0 ? 'danger' : 'warning'}>
                      {row.availableQuantity === 0 ? 'out of stock' : 'low stock'}
                    </StatusBadge>
                  ),
                },
              ]}
            />
          )}
        </Panel>

        {/* Stock batches */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel
            title="Inventory batches"
            description={`${batches.length} batch${batches.length !== 1 ? 'es' : ''} at ${activeBranch?.name ?? 'selected branch'}.`}
          >
            {inventoryNotice ? <FeedbackNotice {...inventoryNotice} /> : null}
            {isLoadingInventory ? (
              <LoadingState title="Loading inventory" description="Fetching branch stock batches…" />
            ) : (
              <DataTable
                rows={batches}
                emptyState={<EmptyState title="No stock batches" description="No inventory batches exist for this branch yet." />}
                columns={[
                  {
                    key: 'batch',
                    header: 'Batch code',
                    render: (row) => (
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' }}>{row.batchCode}</span>
                    ),
                  },
                  {
                    key: 'product',
                    header: 'Product',
                    render: (row) => productName(row.productId),
                  },
                  {
                    key: 'available',
                    header: 'Available',
                    align: 'right',
                    render: (row) => (
                      <span
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: row.availableQuantity === 0 ? '#dc2626' : row.availableQuantity < 10 ? '#d97706' : '#0f172a',
                        }}
                      >
                        {row.availableQuantity}
                      </span>
                    ),
                  },
                  {
                    key: 'reserved',
                    header: 'Reserved',
                    align: 'right',
                    render: (row) => row.reservedQuantity,
                  },
                  {
                    key: 'expiry',
                    header: 'Expiry',
                    render: (row) => {
                      const date = new Date(row.expiryDate);
                      const isExpired = date < new Date();
                      const isSoon = !isExpired && date < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      return (
                      <span style={{ color: isExpired ? '#dc2626' : isSoon ? '#d97706' : undefined }}>
                          {date.toLocaleDateString()}
                          {isExpired ? ' ⚠ expired' : isSoon ? ' ⚠ soon' : ''}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'adjust',
                    header: 'Adjust',
                    align: 'right',
                    render: (row) => (
                      <Button
                        size="sm"
                        variant={adjustForm.batchId === row.id ? 'secondary' : 'primary'}
                        onClick={() => updateAdjustForm('batchId', adjustForm.batchId === row.id ? '' : row.id)}
                      >
                        {adjustForm.batchId === row.id ? 'Selected ✓' : 'Adjust'}
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </Panel>
        </div>

        {/* Adjustment form */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel
            title="Stock adjustment"
            description="Record an audited quantity change for a specific batch. Positive delta adds stock, negative delta removes it."
          >
            {adjustFeedback ? <FeedbackNotice {...adjustFeedback} /> : null}
            <ValidationSummary issues={adjustIssues} />
            <form onSubmit={(e) => void handleAdjustSubmit(e)} style={{ display: 'grid', gap: '0.85rem', maxWidth: '32rem' }}>
              <Field
                label="Batch"
                hint="Click 'Adjust' on a row above to pre-fill the batch, or select manually."
                error={getFieldIssue(adjustIssues, 'batchId')}
              >
                <SelectInput
                  value={adjustForm.batchId}
                  onChange={(e) => updateAdjustForm('batchId', e.target.value)}
                  aria-invalid={Boolean(getFieldIssue(adjustIssues, 'batchId'))}
                  options={[
                    { label: 'Select a batch', value: '' },
                    ...batches.map((b) => ({
                      label: `${b.batchCode} — ${productName(b.productId)} (${b.availableQuantity} available)`,
                      value: b.id,
                    })),
                  ]}
                />
              </Field>

              <Field
                label="Quantity delta"
                hint="Use a positive number to add units, or a negative number to remove them (e.g. −5 for a shrinkage correction)."
                error={getFieldIssue(adjustIssues, 'quantityDelta')}
              >
                <TextInput
                  type="number"
                  value={adjustForm.quantityDelta}
                  onChange={(e) => updateAdjustForm('quantityDelta', e.target.value)}
                  aria-invalid={Boolean(getFieldIssue(adjustIssues, 'quantityDelta'))}
                  placeholder="e.g. 50 or −10"
                />
              </Field>

              <Field
                label="Reason"
                hint="Provide a clear reason for the audit record, such as 'Supplier delivery', 'Damaged stock write-off', or 'Cycle count correction'."
                error={getFieldIssue(adjustIssues, 'reason')}
              >
                <TextInput
                  value={adjustForm.reason}
                  onChange={(e) => updateAdjustForm('reason', e.target.value)}
                  aria-invalid={Boolean(getFieldIssue(adjustIssues, 'reason'))}
                  placeholder="e.g. Supplier delivery batch #2026-05"
                />
              </Field>

              <Button type="submit" variant="primary" disabled={isAdjusting}>
                {isAdjusting ? 'Saving…' : 'Record adjustment'}
              </Button>
            </form>
          </Panel>
        </div>
      </ResponsiveGrid>
    </DashboardShell>
  );
}
