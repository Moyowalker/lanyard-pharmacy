'use client';

import Link from 'next/link';
import type { BranchSummary, CustomerOrderSummary, CustomerPrescriptionSummary, CustomerProfile, PlatformSession } from '@lanyard/api-contracts/client';
import { startTransition, useEffect, useState } from 'react';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FeedbackNotice,
  LoadingState,
  Panel,
  ResponsiveGrid,
  StatusBadge,
  type FormFeedback,
} from '@lanyard/ui';
import {
  clearStoredSession,
  createStorefrontClient,
  fallbackBranches,
  formatPrice,
  getErrorMessage,
  getOrCreateDemoCustomerSession,
  persistSession,
  readStoredSession,
} from './storefront-data';

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CustomerAccount() {
  const [session, setSession] = useState<PlatformSession | null>(() => readStoredSession());
  const [branches, setBranches] = useState<BranchSummary[]>(fallbackBranches);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [prescriptions, setPrescriptions] = useState<CustomerPrescriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<FormFeedback | null>(null);
  const [dataNotice, setDataNotice] = useState<FormFeedback | null>(null);

  useEffect(() => {
    if (session) {
      persistSession(session);
      return;
    }

    clearStoredSession();
  }, [session]);

  useEffect(() => {
    let isCancelled = false;

    const loadAccountSurface = async () => {
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
            description: 'Reload the page to restore the seeded customer account session.',
          });
        });
        const publicClient = createStorefrontClient();
        const [branchResult, profileResult, ordersResult, prescriptionsResult] = await Promise.allSettled([
          publicClient.listBranches(),
          authenticatedClient.getCustomerProfile(),
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
            title: 'Customer account session ready',
            description: 'Profile, orders, and prescription tracking are now reading the live customer self-service APIs.',
          });

          const failures: string[] = [];

          if (branchResult.status === 'fulfilled' && branchResult.value.length > 0) {
            setBranches(branchResult.value);
          } else {
            failures.push('branch labels');
          }

          if (profileResult.status === 'fulfilled') {
            setProfile(profileResult.value);
          } else {
            failures.push('customer profile');
          }

          if (ordersResult.status === 'fulfilled') {
            setOrders(ordersResult.value);
          } else {
            failures.push('order history');
          }

          if (prescriptionsResult.status === 'fulfilled') {
            setPrescriptions(prescriptionsResult.value);
          } else {
            failures.push('prescription tracking');
          }

          setDataNotice(
            failures.length > 0
              ? {
                  tone: 'warning',
                  title: 'Some account data is incomplete',
                  description: `The live account surface could not load ${failures.join(', ')}. The page is still showing any slices that did load successfully.`,
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
              title: 'Customer account unavailable',
              description: getErrorMessage(error, 'The storefront could not restore the seeded customer session for account views.'),
            });
            setIsLoading(false);
          });
        }
      }
    };

    void loadAccountSurface();

    return () => {
      isCancelled = true;
    };
  }, []);

  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

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
            <Link href="/prescriptions" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, color: c.inkSub }}>Prescriptions</Link>
            <Link href="/account" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, color: c.brand }}>My Account</Link>
          </nav>
        </div>
      </header>
      <div style={{ background: 'linear-gradient(135deg, #071a0e 0%, #0e2e1a 45%, #1a5a36 100%)', padding: '2.5rem 1.5rem 3rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>My Account</p>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.025em' }}>Profile & Order History</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>Track your orders and prescription statuses.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <StatusBadge tone="success">{orders.length} orders</StatusBadge>
            <StatusBadge tone="warning">{prescriptions.length} prescriptions</StatusBadge>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <ResponsiveGrid>
        <div id="account">
          <Panel title="Profile and preferences" description="The customer account now resolves the actual seeded customer record instead of showing only auth claims.">
            {authNotice ? <FeedbackNotice {...authNotice} /> : null}
            {dataNotice ? <FeedbackNotice {...dataNotice} /> : null}
            {isLoading ? <LoadingState title="Loading account profile" description="Fetching live customer profile, order history, and prescription tracking." /> : null}

            {profile ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: c.inkMuted }}>Customer</span>
                  <strong style={{ fontSize: '1.0625rem', fontWeight: 600 }}>{profile.firstName} {profile.lastName}</strong>
                </div>
                <div style={{ display: 'grid', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: c.inkMuted }}>Email</span>
                  <span>{profile.email}</span>
                </div>
                <div style={{ display: 'grid', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: c.inkMuted }}>Phone</span>
                  <span>{profile.phone}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <StatusBadge tone={profile.refillReminderOptIn ? 'success' : 'neutral'}>
                    {profile.refillReminderOptIn ? 'Refill reminders enabled' : 'Refill reminders disabled'}
                  </StatusBadge>
                  <StatusBadge tone="neutral">{session?.user.email ?? 'Session pending'}</StatusBadge>
                </div>
              </div>
            ) : !isLoading ? (
              <ErrorState title="Profile unavailable" description="The live customer profile could not be loaded for this seeded account." />
            ) : null}
          </Panel>
        </div>

        <Panel title="Order history" description="Order tracking now reads live customer-scoped order history instead of static examples.">
          {orders.length ? (
            <DataTable
              rows={orders}
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
                  header: 'Status',
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
            <EmptyState title="No orders yet" description="Create a storefront cart and complete checkout to populate live order history for this account." />
          )}
        </Panel>

        <Panel title="Order and prescription status tracking" description="Prescription status now sits alongside order history so customers can follow review and fulfillment progress in one place.">
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
                  key: 'linkedOrder',
                  header: 'Linked order',
                  render: (row) => row.orderId ?? 'General request',
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <StatusBadge tone={toPrescriptionTone(row.status)}>{row.status}</StatusBadge>,
                },
                {
                  key: 'submitted',
                  header: 'Submitted',
                  render: (row) => formatDateTime(row.uploadedAt),
                  align: 'right',
                },
              ]}
            />
          ) : (
            <EmptyState title="No prescription records yet" description="Open the prescription request flow to submit the first live prescription record for this account." />
          )}
        </Panel>
      </ResponsiveGrid>
      </div>
    </div>
  );
}