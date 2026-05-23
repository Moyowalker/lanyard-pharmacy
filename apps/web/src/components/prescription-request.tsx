'use client';

import Link from 'next/link';
import type { BranchSummary, CustomerOrderSummary, CustomerPrescriptionSummary, PlatformSession } from '@lanyard/api-contracts/client';
import { startTransition, useEffect, useState, type FormEvent } from 'react';
import {
  DataTable,
  EmptyState,
  FeedbackNotice,
  Field,
  LoadingState,
  Panel,
  ResponsiveGrid,
  SelectInput,
  StatusBadge,
  ValidationSummary,
  getFieldIssue,
  type FormFeedback,
  type FormIssue,
} from '@lanyard/ui';
import {
  DEMO_STOREFRONT_CUSTOMER_ID,
  clearStoredSession,
  createStorefrontClient,
  fallbackBranches,
  formatPrice,
  getErrorMessage,
  getOrCreateDemoCustomerSession,
  persistSession,
  readStoredSession,
} from './storefront-data';

type PrescriptionRequestForm = {
  requestType: 'general' | 'existing_order';
  orderId: string;
};

const c = {
  brand: '#16a34a',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  ink: '#0f172a',
  inkSub: '#334155',
  inkMuted: '#64748b',
  border: '#e2e8f0',
  rPill: '999px',
} as const;

function toPrescriptionTone(status: CustomerPrescriptionSummary['status']) {
  switch (status) {
    case 'approved':
    case 'fulfilled':
      return 'success' as const;
    case 'rejected':
      return 'danger' as const;
    case 'under_review':
    case 'clarification_requested':
      return 'warning' as const;
    default:
      return 'neutral' as const;
  }
}

function toOrderTone(status: CustomerOrderSummary['status']) {
  switch (status) {
    case 'delivered':
    case 'ready_for_dispatch':
      return 'success' as const;
    case 'pending_review':
    case 'awaiting_payment':
      return 'warning' as const;
    case 'cancelled':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function validateRequest(form: PrescriptionRequestForm, eligibleOrders: CustomerOrderSummary[]): FormIssue[] {
  const issues: FormIssue[] = [];

  if (form.requestType === 'existing_order' && !form.orderId) {
    issues.push({
      field: 'orderId',
      message: 'Choose an eligible order before linking a prescription request to an existing cart or order.',
    });
  }

  if (form.requestType === 'existing_order' && form.orderId && !eligibleOrders.some((order) => order.id === form.orderId)) {
    issues.push({
      field: 'orderId',
      message: 'The selected order is no longer eligible for prescription review. Refresh the page and choose another order.',
    });
  }

  return issues;
}

export function PrescriptionRequest() {
  const [session, setSession] = useState<PlatformSession | null>(null);
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const [branches, setBranches] = useState<BranchSummary[]>(fallbackBranches);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [prescriptions, setPrescriptions] = useState<CustomerPrescriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [authNotice, setAuthNotice] = useState<FormFeedback | null>(null);
  const [dataNotice, setDataNotice] = useState<FormFeedback | null>(null);
  const [feedback, setFeedback] = useState<FormFeedback | null>({
    tone: 'neutral',
    title: 'Request-first prescription flow ready',
    description: 'Link a prescription request to an existing regulated order or submit a general pharmacist request without an order.',
  });
  const [form, setForm] = useState<PrescriptionRequestForm>({
    requestType: 'existing_order',
    orderId: '',
  });

  useEffect(() => {
    setHasHydratedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    if (session) {
      persistSession(session);
      return;
    }

    clearStoredSession();
  }, [hasHydratedStorage, session]);

  useEffect(() => {
    let isCancelled = false;

    const loadPrescriptionSurface = async () => {
      try {
        const nextSession = await getOrCreateDemoCustomerSession();

        if (isCancelled) {
          return;
        }

        const authenticatedClient = createStorefrontClient(nextSession.accessToken, () => {
          clearStoredSession();
          setSession(null);
          setAuthNotice({
            tone: 'warning',
            title: 'Customer session expired',
            description: 'Reload the page to restore the seeded customer session before requesting another prescription review.',
          });
        });
        const publicClient = createStorefrontClient();
        const [branchResult, ordersResult, prescriptionsResult] = await Promise.allSettled([
          publicClient.listBranches(),
          authenticatedClient.listMyOrders(),
          authenticatedClient.listMyPrescriptions(),
        ]);

        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setSession(nextSession);
          setAuthNotice({
            tone: 'success',
            title: 'Demo customer session ready',
            description: 'Prescription requests now post to the live backend using the seeded Ada Okafor customer account.',
          });

          const failures: string[] = [];

          if (branchResult.status === 'fulfilled' && branchResult.value.length > 0) {
            setBranches(branchResult.value);
          } else {
            failures.push('live branch labels');
          }

          if (ordersResult.status === 'fulfilled') {
            setOrders(ordersResult.value);
          } else {
            failures.push('eligible prescription orders');
          }

          if (prescriptionsResult.status === 'fulfilled') {
            setPrescriptions(prescriptionsResult.value);
          } else {
            failures.push('existing prescription history');
          }

          setDataNotice(
            failures.length > 0
              ? {
                  tone: 'warning',
                  title: 'Some request context is using fallback state',
                  description: `The page could not load ${failures.join(', ')} from live APIs, so some panels may be incomplete until the backend responds again.`,
                }
              : null,
          );
          setIsLoading(false);
        });
      } catch (error) {
        if (!isCancelled) {
          startTransition(() => {
            setAuthNotice({
              tone: 'danger',
              title: 'Prescription request unavailable',
              description: getErrorMessage(error, 'The storefront could not restore the seeded customer session for prescription requests.'),
            });
            setIsLoading(false);
          });
        }
      }
    };

    void loadPrescriptionSurface();

    return () => {
      isCancelled = true;
    };
  }, []);

  const eligibleOrders = orders.filter((order) => order.containsPrescriptionItems || order.status === 'pending_review');
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

  useEffect(() => {
    if (eligibleOrders.length === 0 && form.requestType === 'existing_order') {
      setForm({
        requestType: 'general',
        orderId: '',
      });
    }
  }, [eligibleOrders.length, form.requestType]);

  function updateForm<Key extends keyof PrescriptionRequestForm>(field: Key, value: PrescriptionRequestForm[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setIssues((current) => current.filter((issue) => issue.field !== field));
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken) {
      setFeedback({
        tone: 'warning',
        title: 'Customer session required',
        description: 'The demo customer session is not ready yet, so the prescription request cannot be sent to the backend.',
      });
      return;
    }

    const nextIssues = validateRequest(form, eligibleOrders);
    setIssues(nextIssues);

    if (nextIssues.length) {
      setFeedback({
        tone: 'danger',
        title: 'Fix the request details',
        description: 'Prescription requests now block invalid order linkage before the backend submission is attempted.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const authenticatedClient = createStorefrontClient(session.accessToken, () => {
        clearStoredSession();
        setSession(null);
      });
      const response = await authenticatedClient.submitPrescription({
        customerId: DEMO_STOREFRONT_CUSTOMER_ID,
        orderId: form.requestType === 'existing_order' ? form.orderId : undefined,
      });

      startTransition(() => {
        setPrescriptions((current) => [response.prescription, ...current.filter((item) => item.id !== response.prescription.id)]);
        setFeedback({
          tone: response.prescription.orderId ? 'warning' : 'success',
          title: `Prescription ${response.prescription.id} submitted`,
          description: response.prescription.orderId
            ? `The request is now linked to order ${response.prescription.orderId} and entered the live review queue.`
            : 'The request is now in the live review queue as a general pharmacist request without an existing order.',
        });
        setForm({
          requestType: eligibleOrders.length > 0 ? 'existing_order' : 'general',
          orderId: '',
        });
        setIssues([]);
      });
    } catch (error) {
      startTransition(() => {
        setFeedback({
          tone: 'danger',
          title: 'Prescription request failed',
          description: getErrorMessage(error, 'The backend could not accept this prescription request.'),
        });
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'Inter, -apple-system, sans-serif', color: c.ink }}>
      <header style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: '3.75rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: c.ink, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, background: c.brand, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17 8C8 10 5.9 16.17 3.82 22.5C5.71 22.84 7.5 22.5 9 21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3.82 22.5C5 17 9 13 17 8C22 11 18 16 14 15C15 20 10 25 3.82 22.5Z" fill="currentColor" fillOpacity="0.9" /></svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>Lanyard</span>
            <span style={{ fontWeight: 400, fontSize: '1rem', opacity: 0.65 }}>Pharmacy</span>
          </a>
          <nav style={{ flex: 1, display: 'flex', gap: '0.125rem' }}>
            <a href="/" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, color: c.inkSub }}>Catalog</a>
            <Link href="/prescriptions" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, color: c.brand }}>Prescriptions</Link>
            <Link href="/account" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, color: c.inkSub }}>My Account</Link>
          </nav>
        </div>
      </header>
      <div style={{ background: 'linear-gradient(135deg, #071a0e 0%, #0e2e1a 45%, #1a5a36 100%)', padding: '2.5rem 1.5rem 3rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Prescriptions</p>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.025em' }}>Prescription Requests</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>Request pharmacist review for regulated products.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <StatusBadge tone="warning">{eligibleOrders.length} eligible orders</StatusBadge>
            <StatusBadge tone="neutral">{prescriptions.length} tracked prescriptions</StatusBadge>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <ResponsiveGrid>
        <div id="request">
          <Panel
            title="Prescription request form"
            description="The current backend supports a request-first prescription workflow by linking the seeded customer to an optional regulated order."
            actions={<StatusBadge tone="warning">live request workflow</StatusBadge>}
          >
            {authNotice ? <FeedbackNotice {...authNotice} /> : null}
            {dataNotice ? <FeedbackNotice {...dataNotice} /> : null}
            {feedback ? <FeedbackNotice {...feedback} /> : null}
            <ValidationSummary issues={issues} />
            {isLoading ? <LoadingState title="Loading request context" description="Fetching the customer session, eligible orders, and existing prescription statuses." /> : null}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
              <Field label="Request type" hint="Use a linked order when a regulated basket is already in review. Otherwise submit a general pharmacist request.">
                <SelectInput
                  value={form.requestType}
                  onChange={(event) => updateForm('requestType', event.target.value === 'general' ? 'general' : 'existing_order')}
                  options={[
                    { label: 'Link to an existing regulated order', value: 'existing_order' },
                    { label: 'General pharmacist request without order', value: 'general' },
                  ]}
                />
              </Field>

              {form.requestType === 'existing_order' ? (
                <Field
                  label="Eligible order"
                  hint="Only orders that already contain prescription items or are waiting for pharmacist review appear here."
                  error={getFieldIssue(issues, 'orderId')}
                >
                  <SelectInput
                    value={form.orderId}
                    onChange={(event) => updateForm('orderId', event.target.value)}
                    aria-invalid={Boolean(getFieldIssue(issues, 'orderId'))}
                    options={[
                      { label: 'Select a regulated order', value: '' },
                      ...eligibleOrders.map((order) => ({
                        label: `${order.id} · ${branchNames.get(order.branchId) ?? order.branchId} · ${order.status} · ${formatPrice(order.total)}`,
                        value: order.id,
                      })),
                    ]}
                  />
                </Field>
              ) : null}

              <button type="submit" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.8rem', borderRadius: c.rPill, background: c.brand, color: '#ffffff', border: `1px solid ${c.brand}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'inherit', opacity: isSubmitting ? 0.6 : 1 }} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting request...' : 'Submit prescription request'}
              </button>
            </form>
          </Panel>
        </div>

        <Panel title="Eligible regulated orders" description="These are the live orders that can be linked directly into the prescription review queue.">
          {eligibleOrders.length ? (
            <DataTable
              rows={eligibleOrders}
              columns={[
                {
                  key: 'order',
                  header: 'Order',
                  render: (row) => row.id,
                },
                {
                  key: 'branch',
                  header: 'Branch',
                  render: (row) => branchNames.get(row.branchId) ?? row.branchId,
                },
                {
                  key: 'status',
                  header: 'Order status',
                  render: (row) => <StatusBadge tone={toOrderTone(row.status)}>{row.status}</StatusBadge>,
                },
                {
                  key: 'total',
                  header: 'Total',
                  render: (row) => formatPrice(row.total),
                  align: 'right',
                },
              ]}
            />
          ) : (
            <EmptyState title="No regulated orders available" description="Create or preview a cart with prescription items first, then return here to link the request to a live order." />
          )}
        </Panel>

        <Panel title="Prescription status history" description="Customers can now track live prescription statuses outside the checkout flow.">
          {prescriptions.length ? (
            <DataTable
              rows={prescriptions}
              columns={[
                {
                  key: 'prescription',
                  header: 'Prescription',
                  render: (row) => row.id,
                },
                {
                  key: 'order',
                  header: 'Linked order',
                  render: (row) => row.orderId ?? 'General request',
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <StatusBadge tone={toPrescriptionTone(row.status)}>{row.status}</StatusBadge>,
                },
                {
                  key: 'uploaded',
                  header: 'Submitted',
                  render: (row) => formatDateTime(row.uploadedAt),
                  align: 'right',
                },
              ]}
            />
          ) : (
            <EmptyState title="No prescription requests yet" description="Submit a prescription request above to create the first live prescription record for this account." />
          )}
        </Panel>
      </ResponsiveGrid>
      </div>
    </div>
  );
}