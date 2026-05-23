'use client';

import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import type { BranchSummary, CheckoutOrder } from '@lanyard/api-contracts/client';
import {
  EmptyState,
  FeedbackNotice,
  LoadingState,
  Panel,
  ResponsiveGrid,
  StatusBadge,
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

type Props = { orderId: string };

export function OrderDetail({ orderId }: Props) {
  const [session] = useState(() => readStoredSession());
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          setError(getErrorMessage(err, 'Could not load order details.'));
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
        <Link href="/account" style={{ color: c.brand, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, borderBottom: `2px solid ${c.brand}` }}>My Account</Link>
      </div>
    </nav>
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'system-ui, sans-serif' }}>
        {nav}
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <LoadingState title="Loading" description="Fetching order details…" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'system-ui, sans-serif' }}>
        {nav}
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <EmptyState title="Order not found" description={error ?? 'This order could not be loaded.'} />
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/account" style={{ color: c.brand, fontWeight: 600 }}>← Back to My Account</Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'system-ui, sans-serif' }}>
      {nav}

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #052e16 0%, #14532d 60%, #166534 100%)',
        color: '#ffffff',
        padding: '3rem 1.5rem 2.5rem',
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          <Link href="/account" style={{ color: '#86efac', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            ← Back to My Account
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.75rem', letterSpacing: '-0.03em' }}>
            Order Details
          </h1>
          <p style={{ color: '#bbf7d0', fontFamily: 'monospace', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {order.id}
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge tone="neutral">{order.status.replace(/_/g, ' ')}</StatusBadge>
            <span style={{ color: '#d1fae5', fontSize: '0.875rem' }}>
              {branchName(order.branchId)}
            </span>
            <span style={{ color: '#d1fae5', fontSize: '0.875rem' }}>
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
            {order.containsPrescriptionItems && (
              <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: c.rPill, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                Rx Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <ResponsiveGrid>
          <div style={{ gridColumn: '1 / -1' }}>
            <Panel title="Order Items" description={`${order.items.length} item(s)`}>
              {order.items.length === 0 ? (
                <EmptyState title="No items" description="This order has no line items." />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: c.inkMuted, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product ID</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: c.inkMuted, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: c.inkMuted, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Price</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: c.inkMuted, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: c.inkSub }}>{item.productId}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: c.ink }}>{item.quantity}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: c.ink }}>{formatPrice(item.unitPrice)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: c.ink }}>{formatPrice(item.unitPrice * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: c.inkSub }}>Total</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: c.brand, fontSize: '1.05rem' }}>{formatPrice(order.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Panel>
          </div>

          {order.containsPrescriptionItems && (
            <div style={{ gridColumn: '1 / -1' }}>
              <FeedbackNotice
                tone="warning"
                title="Prescription review required"
                description="One or more items in this order require a valid prescription. A pharmacist will review your submission. You will be notified once approved."
              />
            </div>
          )}
        </ResponsiveGrid>
      </div>
    </div>
  );
}
