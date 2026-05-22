'use client';

import Link from 'next/link';
import type { BranchSummary, CartSummaryItem, CatalogProduct, PlatformSession } from '@lanyard/api-contracts/client';
import { startTransition, useEffect, useState } from 'react';
import {
  DialogCard,
  EmptyState,
  FeedbackNotice,
  Field,
  LoadingState,
  Panel,
  ResponsiveGrid,
  SelectInput,
  StatusBadge,
  TextInput,
  type FormFeedback,
} from '@lanyard/ui';
import {
  DEFAULT_PLANNER,
  DEMO_STOREFRONT_CUSTOMER_ID,
  clearStoredSession,
  createStorefrontClient,
  fallbackBranches,
  fallbackCatalogProducts,
  formatPrice,
  getErrorMessage,
  getOrCreateDemoCustomerSession,
  persistCart,
  persistPlanner,
  persistSession,
  readStoredCart,
  readStoredPlanner,
  readStoredSession,
  type ServiceMode,
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

type StorefrontProductDetailProps = {
  slug: string;
  initialBranchId?: string;
  initialServiceMode?: ServiceMode;
};

export function StorefrontProductDetail({ slug, initialBranchId, initialServiceMode = 'pickup' }: StorefrontProductDetailProps) {
  const storedPlanner = readStoredPlanner() ?? DEFAULT_PLANNER;
  const [branches, setBranches] = useState<BranchSummary[]>(fallbackBranches);
  const [catalog, setCatalog] = useState<CatalogProduct[]>(fallbackCatalogProducts);
  const [session, setSession] = useState<PlatformSession | null>(() => readStoredSession());
  const [branchId, setBranchId] = useState(initialBranchId ?? storedPlanner.branchId);
  const [serviceMode, setServiceMode] = useState<ServiceMode>(initialServiceMode);
  const [quantity, setQuantity] = useState('1');
  const [authNotice, setAuthNotice] = useState<FormFeedback | null>(null);
  const [catalogNotice, setCatalogNotice] = useState<FormFeedback | null>(null);
  const [stockNotice, setStockNotice] = useState<FormFeedback | null>(null);
  const [stockPreview, setStockPreview] = useState<CartSummaryItem | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isPreviewingStock, setIsPreviewingStock] = useState(false);

  const publicClient = createStorefrontClient();

  useEffect(() => {
    if (session) {
      persistSession(session);
      return;
    }

    clearStoredSession();
  }, [session]);

  useEffect(() => {
    persistPlanner({
      ...(readStoredPlanner() ?? DEFAULT_PLANNER),
      branchId,
      serviceMode,
    });
  }, [branchId, serviceMode]);

  useEffect(() => {
    let isCancelled = false;

    const loadProductData = async () => {
      const [liveBranches, liveCatalog] = await Promise.allSettled([
        publicClient.listBranches(),
        publicClient.listCatalogProducts(),
      ]);

      if (isCancelled) {
        return;
      }

      startTransition(() => {
        if (liveBranches.status === 'fulfilled' && liveBranches.value.length > 0) {
          setBranches(liveBranches.value);
        } else {
          setCatalogNotice({
            tone: 'warning',
            title: 'Using seeded branch coverage',
            description: 'The live branch endpoint is unavailable, so branch selection is using the seeded fallback data.',
          });
        }

        if (liveCatalog.status === 'fulfilled' && liveCatalog.value.length > 0) {
          setCatalog(liveCatalog.value);
          setCatalogNotice(null);
        } else {
          setCatalogNotice({
            tone: 'warning',
            title: 'Using seeded product detail data',
            description: 'The live catalog endpoint is unavailable, so this product detail page is using seeded fallback product data.',
          });
        }

        setIsLoadingData(false);
      });
    };

    void loadProductData();

    return () => {
      isCancelled = true;
    };
  }, [publicClient]);

  useEffect(() => {
    let isCancelled = false;

    const restoreOrCreateCustomerSession = async () => {
      try {
        const nextSession = await getOrCreateDemoCustomerSession();

        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setSession(nextSession);
          setAuthNotice({
            tone: 'success',
            title: 'Demo customer session ready',
            description: 'Live branch stock visibility is coming from the backend order preview using the seeded Ada Okafor customer account.',
          });
          setIsAuthenticating(false);
        });
      } catch (error) {
        if (!isCancelled) {
          startTransition(() => {
            setAuthNotice({
              tone: 'danger',
              title: 'Customer session unavailable',
              description: getErrorMessage(error, 'The storefront could not sign in the seeded customer, so live stock visibility is unavailable right now.'),
            });
            setIsAuthenticating(false);
          });
        }
      }
    };

    void restoreOrCreateCustomerSession();

    return () => {
      isCancelled = true;
    };
  }, [publicClient]);

  const product = catalog.find((entry) => entry.slug === slug) ?? null;
  const availableBranches = product ? branches.filter((branch) => product.branchIds.includes(branch.id)) : [];
  const selectedBranch = availableBranches.find((branch) => branch.id === branchId) ?? availableBranches[0] ?? branches.find((branch) => branch.id === branchId) ?? null;

  useEffect(() => {
    if (!product || availableBranches.length === 0) {
      return;
    }

    if (!availableBranches.some((branch) => branch.id === branchId)) {
      setBranchId(availableBranches[0]?.id ?? branchId);
    }
  }, [availableBranches, branchId, product]);

  useEffect(() => {
    if (!product || !selectedBranch || !session?.accessToken) {
      return;
    }

    const requestedQuantity = Number(quantity);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      setStockPreview(null);
      setStockNotice({
        tone: 'warning',
        title: 'Quantity must be at least one',
        description: 'Enter a whole number quantity before the storefront can preview branch-aware stock through the backend order flow.',
      });
      return;
    }

    let isCancelled = false;
    const authenticatedClient = createStorefrontClient(session.accessToken, () => {
      clearStoredSession();
      setSession(null);
      setAuthNotice({
        tone: 'warning',
        title: 'Customer session expired',
        description: 'Reload the page to re-establish the seeded customer session before requesting another stock preview.',
      });
    });

    const previewStock = async () => {
      setIsPreviewingStock(true);

      try {
        const preview = await authenticatedClient.previewCart({
          customerId: DEMO_STOREFRONT_CUSTOMER_ID,
          branchId: selectedBranch.id,
          items: [{ productId: product.id, quantity: requestedQuantity }],
        });

        if (isCancelled) {
          return;
        }

        const lineItem = preview.items[0] ?? null;
        startTransition(() => {
          setStockPreview(lineItem);
          setStockNotice({
            tone: preview.containsPrescriptionItems ? 'warning' : 'success',
            title: lineItem ? `${lineItem.availableQuantity} units visible at ${selectedBranch.name}` : 'No stock preview returned',
            description: preview.containsPrescriptionItems
              ? 'The backend preview confirmed branch stock but still routed this product through pharmacist review because it requires a prescription.'
              : 'The backend preview confirmed branch stock, quantity, and pricing for the current product selection.',
          });
        });
      } catch (error) {
        if (!isCancelled) {
          startTransition(() => {
            setStockPreview(null);
            setStockNotice({
              tone: 'danger',
              title: 'Stock preview unavailable',
              description: getErrorMessage(error, 'The backend preview rejected the current branch and quantity combination for this product.'),
            });
          });
        }
      } finally {
        if (!isCancelled) {
          setIsPreviewingStock(false);
        }
      }
    };

    void previewStock();

    return () => {
      isCancelled = true;
    };
  }, [branchId, product, quantity, selectedBranch, session]);

  function addToCart() {
    if (!product) {
      return;
    }

    const requestedQuantity = Math.max(1, Number(quantity) || 1);
    const currentCart = readStoredCart();
    const existingItem = currentCart.find((item) => item.productId === product.id);
    const nextCart = existingItem
      ? currentCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + requestedQuantity,
              }
            : item,
        )
      : [...currentCart, { productId: product.id, quantity: requestedQuantity }];

    persistCart(nextCart);
    persistPlanner({
      ...(readStoredPlanner() ?? DEFAULT_PLANNER),
      branchId,
      serviceMode,
      basketIntent: product.name,
    });
    setStockNotice({
      tone: 'success',
      title: `${product.name} added to cart`,
      description: `The cart now holds ${requestedQuantity} more unit(s) for ${selectedBranch?.name ?? branchId}. Return to the storefront cart panel to preview or checkout.`,
    });
  }

  if (!product && !isLoadingData) {
    return (
      <div style={{ minHeight: '100vh', background: c.surfaceAlt, fontFamily: 'Inter, -apple-system, sans-serif', color: c.ink }}>
        <header style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: '3.75rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: c.ink }}>
              <div style={{ width: 30, height: 30, background: c.brand, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17 8C8 10 5.9 16.17 3.82 22.5C5.71 22.84 7.5 22.5 9 21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3.82 22.5C5 17 9 13 17 8C22 11 18 16 14 15C15 20 10 25 3.82 22.5Z" fill="currentColor" fillOpacity="0.9" /></svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>Lanyard</span>
              <span style={{ fontWeight: 400, fontSize: '1rem', opacity: 0.65 }}>Pharmacy</span>
            </a>
          </div>
        </header>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem' }}>
          <EmptyState title="Unknown product" description="Return to the storefront catalog and choose another product from the active branch selection." />
        </div>
      </div>
    );
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
            <a href="/" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, color: c.brand }}>← Catalog</a>
            <Link href="/prescriptions" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, color: c.inkSub }}>Prescriptions</Link>
            <Link href="/account" style={{ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, color: c.inkSub }}>My Account</Link>
          </nav>
        </div>
      </header>
      <div style={{ background: 'linear-gradient(135deg, #071a0e 0%, #0e2e1a 45%, #1a5a36 100%)', padding: '2.5rem 1.5rem 3rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Product Detail</p>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.025em' }}>{product?.name ?? 'Loading product…'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>{product ? `${product.category} · ${product.dosageForm}` : 'Fetching product details…'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <StatusBadge tone={product?.requiresPrescription ? 'warning' : 'success'}>
              {product?.requiresPrescription ? 'Prescription required' : 'Standard product'}
            </StatusBadge>
            <StatusBadge tone="neutral">{selectedBranch?.name ?? 'Branch unavailable'}</StatusBadge>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <ResponsiveGrid>
        <Panel title="Product profile" description="This page turns a catalog summary into a branch-aware detail surface with real stock validation.">
          {catalogNotice ? <FeedbackNotice {...catalogNotice} /> : null}
          {authNotice ? <FeedbackNotice {...authNotice} /> : null}
          {isLoadingData ? <LoadingState title="Loading product detail" description="Pulling the live catalog and branch context for this product." /> : null}
          {product ? (
            <DialogCard
              title={product.name}
              description={`${product.category} · ${product.dosageForm} · ${formatPrice(product.price)}`}
              footer={
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <StatusBadge tone={product.requiresPrescription ? 'warning' : 'success'}>
                    {product.requiresPrescription ? 'Prescription review before payment' : 'Eligible for direct payment after preview'}
                  </StatusBadge>
                  <StatusBadge tone="neutral">{product.branchIds.length} stocked branches</StatusBadge>
                </div>
              }
            >
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                <div>
                  <strong>Current service mode</strong>
                  <p style={{ margin: '0.2rem 0 0', color: c.inkMuted }}>
                    {serviceMode === 'delivery'
                      ? 'Delivery messaging stays visible so customers understand courier coverage before checkout begins.'
                      : 'Pickup messaging stays visible so stock, branch, and handoff expectations remain aligned.'}
                  </p>
                </div>
                <div>
                  <strong>Branch coverage</strong>
                  <p style={{ margin: '0.2rem 0 0', color: c.inkMuted }}>
                    {availableBranches.map((branch) => branch.name).join(', ') || 'No stocked branches found for this product.'}
                  </p>
                </div>
              </div>
            </DialogCard>
          ) : null}
        </Panel>

        <div id="stock">
          <Panel title="Branch-aware stock visibility" description="Stock preview comes from the backend cart preview endpoint so the product detail page can show real branch quantities before checkout.">
            {stockNotice ? <FeedbackNotice {...stockNotice} /> : null}
            {isAuthenticating ? <LoadingState title="Restoring demo customer" description="Signing in the seeded customer account so branch-aware stock preview can call the protected order preview endpoint." /> : null}

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <Field label="Branch" hint="Only branches that stock this product appear here.">
                <SelectInput
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  options={availableBranches.map((branch) => ({
                    label: `${branch.name} · ${branch.city}${branch.supportsDelivery ? ' · pickup + delivery' : ' · pickup only'}`,
                    value: branch.id,
                  }))}
                />
              </Field>

              <Field label="Service mode" hint="This changes customer guidance while keeping the same backend product and stock validation surface.">
                <SelectInput
                  value={serviceMode}
                  onChange={(event) => setServiceMode(event.target.value === 'delivery' ? 'delivery' : 'pickup')}
                  options={[
                    { label: 'Pickup', value: 'pickup' },
                    { label: 'Delivery', value: 'delivery' },
                  ]}
                />
              </Field>

              <Field label="Requested quantity" hint="Changing quantity triggers a fresh backend stock preview for this branch.">
                <TextInput type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </Field>
            </div>

            {isPreviewingStock ? <LoadingState title="Previewing stock" description="Running the protected cart preview flow for this product and branch selection." /> : null}

            {stockPreview ? (
              <DialogCard
                title="Live stock preview"
                description={`Stock visibility for ${selectedBranch?.name ?? branchId} at ${formatPrice(stockPreview.unitPrice)} per unit.`}
                footer={<StatusBadge tone={stockPreview.requiresPrescription ? 'warning' : 'success'}>{stockPreview.availableQuantity} available</StatusBadge>}
              >
                <div style={{ display: 'grid', gap: '0.45rem' }}>
                  <span>Requested quantity: {stockPreview.quantity}</span>
                  <span>Branch availability: {stockPreview.availableQuantity}</span>
                  <span>Line total: {formatPrice(stockPreview.lineTotal)}</span>
                </div>
              </DialogCard>
            ) : null}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={addToCart} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.7rem 1.25rem', borderRadius: c.rPill, background: c.brand, color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit' }}>
                Add to cart
              </button>
              {product?.requiresPrescription ? (
                <Link href="/prescriptions" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.7rem 1.25rem', borderRadius: c.rPill, background: c.surface, color: c.ink, border: `1px solid ${c.border}`, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                  Request prescription review
                </Link>
              ) : null}
              <Link href="/#cart" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.7rem 1.25rem', borderRadius: c.rPill, background: c.surface, color: c.ink, border: `1px solid ${c.border}`, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                Return to cart and checkout
              </Link>
            </div>
          </Panel>
        </div>
      </ResponsiveGrid>
      </div>
    </div>
  );
}