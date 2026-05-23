'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import type { BranchSummary, CheckoutOrder } from '@lanyard/api-contracts/client';
import {
  EmptyState,
  FeedbackNotice,
  LoadingState,
  Panel,
  ResponsiveGrid,
} from '@lanyard/ui';
import {
  createStorefrontClient,
  fallbackBranches,
  formatPrice,
  getErrorMessage,
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

export function CheckoutConfirm() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [session] = useState(() => readStoredSession());
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      setError('No order ID provided.');
      return;
    }
    if (!session?.accessToken) {
      setIsLoading(false);
      setError('Sign in to view your order.');
      return;
    }
    let isCancelled = false;
    const client = createStorefrontClient(session.accessToken);

    void Promise.all([
      client.getMyOrder(orderId),
      client.listBranches(),
    ]).then(([orderData, branchesData]) => {
      if (isCancelled) return;
      startTransition(() => {
        setOrder(orderData);
        setBranches(branchesData);
        setIsLoading(false);
      });
    }).catch((err: unknown) => {
      if (!isCancelled) {
        startTransition(() => {
          setError(getErrorMessage(err, 'Could not load order confirmation.'));
          setIsLoading(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, [orderId, session?.accessToken]);

  const branchName = (branchId: string) => {
    const b = (branches.length ? branches : fallbackBranches).find((b) => b.id === branchId);
    return b?.name ?? branchId;
  };

  const nav = (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50, background: c.surface,
      borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 1.5rem', height: '3.5rem',
    }}>
      <Link href="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: c.brand, textDecoration: 'none', letterSpacing: '-0.02em' }}>
        Lanyard Pharmacy
      </Link>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link href="/catalog" style={{ color: c.inkSub, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Catalog</Link>
        <Link href="/prescriptions" style={{ color: c.inkSub, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Prescriptions</Link>
        <Link href="/account" style={{ color: c.inkSub, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>My Account</Link>
      </div>
    </nav>
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'system-ui, sans-serif' }}>
        {nav}
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <LoadingState title="Loading" description="Fetching order confirmation…" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'system-ui, sans-serif' }}>
        {nav}
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <EmptyState title="Order not found" description={error ?? 'The order confirmation could not be loaded.'} />
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/" style={{ color: c.brand, fontWeight: 600 }}>← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'system-ui, sans-serif' }}>
      {nav}

      {/* Success hero */}
      <div style={{
        background: 'linear-gradient(135deg, #052e16 0%, #14532d 60%, #166534 100%)',
        color: '#ffffff',
        padding: '3.5rem 1.5rem 3rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '3.5rem', height: '3.5rem', borderRadius: '50%',
            background: 'rgba(187, 247, 208, 0.2)', marginBottom: '1rem',
            fontSize: '1.5rem',
          }}>
            ✓
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Order confirmed!
          </h1>
          <p style={{ color: '#bbf7d0', fontSize: '1rem' }}>
            {order.containsPrescriptionItems
              ? 'A pharmacist will review your prescription items before processing.'
              : `Your order is now ${order.status.replace(/_/g, ' ')} at ${branchName(order.branchId)}.`}
          </p>
          <p style={{ color: '#86efac', fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            Order ID: {order.id}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <ResponsiveGrid>
          <div style={{ gridColumn: '1 / -1' }}>
            <Panel title="Order Summary" description={`${order.items.length} item(s) · ${branchName(order.branchId)}`}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: c.inkMuted, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: c.inkMuted, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: c.inkMuted, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: c.inkSub }}>{item.productId}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: c.ink }}>{item.quantity}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: c.ink }}>{formatPrice(item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: c.inkSub }}>Order Total</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: c.brand, fontSize: '1.05rem' }}>{formatPrice(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </Panel>
          </div>

          {order.containsPrescriptionItems && (
            <div style={{ gridColumn: '1 / -1' }}>
              <FeedbackNotice
                tone="warning"
                title="Prescription review required"
                description="Your prescription will be reviewed by a licensed pharmacist. This typically takes 1–2 business days."
              />
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <Panel title="What's next?" description="">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  href="/account"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: c.brand, color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block' }}
                >
                  View My Account
                </Link>
                <Link
                  href="/catalog"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: c.surfaceAlt, color: c.ink, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block', border: `1px solid ${c.border}` }}
                >
                  Continue Shopping
                </Link>
              </div>
            </Panel>
          </div>
        </ResponsiveGrid>
      </div>
    </div>
  );
}
