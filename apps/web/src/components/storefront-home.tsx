'use client';

import Link from 'next/link';
import type { BranchSummary, CartSummary, CatalogProduct, PlatformSession } from '@lanyard/api-contracts/client';
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { FeedbackNotice, ValidationSummary, type FormFeedback, type FormIssue } from '@lanyard/ui';
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
  type BranchPlanner,
  type ServiceMode,
  type StorefrontCartItem,
} from './storefront-data';

// ─── Design constants ─────────────────────────────────────────────────────────

const c = {
  heroBg: 'linear-gradient(135deg, #071a0e 0%, #0e2e1a 45%, #1a5a36 100%)',
  brand: '#16a34a',
  brandHov: '#15803d',
  brandSoft: '#dcfce7',
  accent: '#4ade80',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  surfaceMint: '#f0fdf4',
  ink: '#0f172a',
  inkSub: '#334155',
  inkMuted: '#64748b',
  border: '#e2e8f0',
  borderMint: '#bbf7d0',
  rx: '#d97706',
  rxSoft: '#fef3c7',
  rxText: '#92400e',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
  shadowHov: '0 8px 32px rgba(0,0,0,0.14)',
  r: '1rem',
  rLg: '1.5rem',
  rSm: '0.5rem',
  rPill: '999px',
} as const;

function getCategoryGradient(category: string): string {
  const map: Record<string, string> = {
    'Pain Relief': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    'Antibiotics': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    'Vitamins': 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
    'Supplements': 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
    'Malaria': 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    'Diabetes': 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
    'Cardiovascular': 'linear-gradient(135deg, #f43f5e 0%, #ef4444 100%)',
    'Respiratory': 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    'Digestive': 'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)',
    'Skincare': 'linear-gradient(135deg, #f9a8d4 0%, #e879f9 100%)',
    'Baby Care': 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%)',
    'Eye & Ear': 'linear-gradient(135deg, #67e8f9 0%, #6ee7b7 100%)',
    'Infectious Disease': 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  };
  return map[category] ?? 'linear-gradient(135deg, #16a34a 0%, #059669 100%)';
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function LeafIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 8C8 10 5.9 16.17 3.82 22.5C5.71 22.84 7.5 22.5 9 21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.82 22.5C5 17 9 13 17 8C22 11 18 16 14 15C15 20 10 25 3.82 22.5Z" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

function CartIconSvg({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldCheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9 12 11 14 15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TruckIconSvg({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8h4l3 5v4h-7V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function UserIconSvg({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PillSvg({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="7" y="17" width="34" height="14" rx="7" fill="rgba(255,255,255,0.28)" />
      <rect x="7" y="17" width="17" height="14" rx="7" fill="rgba(255,255,255,0.55)" />
      <line x1="24" y1="17" x2="24" y2="31" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
    </svg>
  );
}

function BottleSvg({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="16" y="5" width="16" height="7" rx="2" fill="rgba(255,255,255,0.5)" />
      <path d="M13 12h22v26a4 4 0 01-4 4H17a4 4 0 01-4-4V12z" fill="rgba(255,255,255,0.25)" />
      <path d="M13 25h22" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
    </svg>
  );
}

function DropSvg({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 7C24 7 11 21 11 31a13 13 0 0026 0C37 21 24 7 24 7z" fill="rgba(255,255,255,0.28)" />
      <path d="M17 33a7 7 0 007 5" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function getProductIcon(dosageForm: string) {
  const f = dosageForm.toLowerCase();
  if (f.includes('tablet') || f.includes('capsule')) return <PillSvg />;
  if (f.includes('liquid') || f.includes('syrup') || f.includes('suspension')) return <BottleSvg />;
  if (f.includes('drop') || f.includes('solution') || f.includes('injection')) return <DropSvg />;
  return <PillSvg />;
}

const trustFeatures = [
  { icon: <ShieldCheckIcon size={22} />, label: 'Licensed Pharmacists', sub: 'Board-certified on every order' },
  { icon: <ClockIcon size={22} />, label: 'Same-day Pickup', sub: 'Ready within hours, 7 days a week' },
  { icon: <TruckIconSvg size={22} />, label: 'Express Delivery', sub: 'Door-to-door for select branches' },
  { icon: <UserIconSvg size={22} />, label: 'Rx Guidance', sub: 'Prescription review & consultation' },
] as const;

const serviceOptionLabels: Record<ServiceMode, string> = { pickup: 'Pickup', delivery: 'Delivery' };

function validatePlanner(planner: BranchPlanner, branches: BranchSummary[]): FormIssue[] {
  const issues: FormIssue[] = [];
  const branch = branches.find((b) => b.id === planner.branchId);
  if (!planner.branchId) issues.push({ field: 'branchId', message: 'Choose a branch before continuing.' });
  if (!planner.serviceMode) issues.push({ field: 'serviceMode', message: 'Select pickup or delivery.' });
  if (planner.serviceMode === 'delivery' && !planner.deliveryArea.trim()) {
    issues.push({ field: 'deliveryArea', message: 'Enter a postcode or landmark for delivery coverage.' });
  }
  if (planner.serviceMode === 'delivery' && branch && !branch.supportsDelivery) {
    issues.push({ field: 'serviceMode', message: `${branch.name} supports pickup only.` });
  }
  return issues;
}

function buildPlannerFeedback(planner: BranchPlanner, branch: BranchSummary): FormFeedback {
  if (planner.serviceMode === 'delivery') {
    return { tone: 'success', title: `Delivery unlocked for ${branch.name}`, description: `Routing through ${branch.city} stock for ${planner.deliveryArea.trim()} delivery.` };
  }
  return { tone: 'success', title: `Branch set to ${branch.name}`, description: `Catalog and pickup timing scoped to ${branch.city}.` };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type CartViewItem = StorefrontCartItem & { product: CatalogProduct | undefined; lineTotal: number };

function TrustFeature({ icon, label, sub }: { icon: ReactNode; label: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: c.brandSoft, color: c.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: c.ink, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontWeight: 400, fontSize: '0.75rem', color: c.inkMuted, marginTop: '0.15rem' }}>{sub}</div>
      </div>
    </div>
  );
}

function ProductCard({ product, planner, onAddToCart }: { product: CatalogProduct; planner: BranchPlanner; onAddToCart: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        borderRadius: c.r, border: `1px solid ${hovered ? c.brand : c.border}`, background: c.surface,
        overflow: 'hidden', boxShadow: hovered ? c.shadowHov : c.shadow,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ height: '7.5rem', background: getCategoryGradient(product.category), display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
        {product.requiresPrescription && (
          <span style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', background: c.rx, color: '#ffffff', fontWeight: 700, fontSize: '0.625rem', borderRadius: c.rPill, padding: '0.275rem 0.55rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Rx</span>
        )}
        {getProductIcon(product.dosageForm)}
      </div>
      <div style={{ padding: '0.875rem 1rem 1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontWeight: 500, fontSize: '0.6875rem', color: c.inkMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{product.category}</span>
        <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.3, color: c.ink, margin: '0.3rem 0 0.2rem' }}>{product.name}</h3>
        <p style={{ fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.4, color: c.inkMuted, margin: '0 0 auto' }}>{product.dosageForm}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.875rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: c.ink }}>{formatPrice(product.price)}</span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <Link href={`/products/${product.slug}?branchId=${planner.branchId}&serviceMode=${planner.serviceMode}`} style={{ borderRadius: c.rPill, padding: '0.4rem 0.7rem', fontWeight: 500, fontSize: '0.8125rem', background: c.surfaceAlt, color: c.inkSub, border: `1px solid ${c.border}`, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Details
            </Link>
            <button type="button" onClick={onAddToCart} style={{ borderRadius: c.rPill, padding: '0.4rem 0.7rem', fontWeight: 700, fontSize: '0.8125rem', background: c.brand, color: '#ffffff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontFamily: 'inherit' }}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartLineItem({ item, onUpdateQuantity }: { item: CartViewItem; onUpdateQuantity: (productId: string, quantity: number) => void }) {
  const qtyBtnStyle: CSSProperties = { width: '1.75rem', height: '1.75rem', borderRadius: '50%', border: `1px solid ${c.border}`, background: c.surfaceAlt, cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: c.inkSub, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'inherit' };
  return (
    <div style={{ padding: '0.875rem 0', borderBottom: `1px solid ${c.surfaceAlt}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: c.ink }}>{item.product?.name ?? item.productId}</div>
          <div style={{ fontWeight: 400, fontSize: '0.75rem', color: c.inkMuted, marginTop: '0.15rem' }}>{item.product ? `${item.product.category} · ${item.product.dosageForm}` : ''}</div>
        </div>
        {item.product?.requiresPrescription && (
          <span style={{ fontWeight: 700, fontSize: '0.625rem', background: c.rxSoft, color: c.rxText, borderRadius: c.rPill, padding: '0.2rem 0.45rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rx</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button type="button" style={qtyBtnStyle} onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}>−</button>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
          <button type="button" style={qtyBtnStyle} onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}>+</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: c.ink }}>{formatPrice(item.lineTotal)}</span>
          <button type="button" onClick={() => onUpdateQuantity(item.productId, 0)} style={{ fontWeight: 500, fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StorefrontHome() {
  const [branches, setBranches] = useState<BranchSummary[]>(fallbackBranches);
  const [catalog, setCatalog] = useState<CatalogProduct[]>(fallbackCatalogProducts);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const [branchNotice, setBranchNotice] = useState<FormFeedback | null>(null);
  const [catalogNotice, setCatalogNotice] = useState<FormFeedback | null>(null);
  const [authNotice, setAuthNotice] = useState<FormFeedback | null>(null);
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [planner, setPlanner] = useState<BranchPlanner>(DEFAULT_PLANNER);
  const [session, setSession] = useState<PlatformSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cartItems, setCartItems] = useState<StorefrontCartItem[]>([]);
  const [cartNotice, setCartNotice] = useState<FormFeedback | null>(null);
  const [cartPreview, setCartPreview] = useState<CartSummary | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<FormFeedback | null>(null);
  const [isPreviewingCart, setIsPreviewingCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const storedPlanner = readStoredPlanner();
    const storedCart = readStoredCart();

    if (storedPlanner) {
      setPlanner(storedPlanner);
    }

    if (storedCart.length > 0) {
      setCartItems(storedCart);
    }

    setHasHydratedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    persistPlanner(planner);
  }, [hasHydratedStorage, planner]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    persistCart(cartItems);
  }, [cartItems, hasHydratedStorage]);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }

    if (session) {
      persistSession(session);
    } else {
      clearStoredSession();
    }
  }, [hasHydratedStorage, session]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      const publicClient = createStorefrontClient();
      const [liveBranches, liveCatalog] = await Promise.allSettled([publicClient.listBranches(), publicClient.listCatalogProducts()]);
      if (isCancelled) return;
      startTransition(() => {
        if (liveBranches.status === 'fulfilled' && liveBranches.value.length > 0) {
          setBranches(liveBranches.value);
          setPlanner((cur) => ({ ...cur, branchId: liveBranches.value.some((b) => b.id === cur.branchId) ? cur.branchId : (liveBranches.value[0]?.id ?? cur.branchId) }));
          setBranchNotice(null);
        } else {
          setBranchNotice({ tone: 'warning', title: 'Using seeded branch coverage', description: 'Live branch endpoint unavailable right now.' });
        }
        if (liveCatalog.status === 'fulfilled' && liveCatalog.value.length > 0) {
          setCatalog(liveCatalog.value);
          setCatalogNotice(null);
        } else {
          setCatalogNotice({ tone: 'warning', title: 'Using seeded catalog', description: 'Catalog endpoint unavailable; showing seeded products.' });
        }
        setIsLoadingBranches(false);
        setIsLoadingCatalog(false);
      });
    };
    void load();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const restore = async () => {
      try {
        const nextSession = await getOrCreateDemoCustomerSession();
        if (isCancelled) return;
        startTransition(() => {
          setSession(nextSession);
          setAuthNotice({ tone: 'success', title: 'Demo session active', description: 'Cart and checkout running live as Ada Okafor.' });
          setIsAuthenticating(false);
        });
      } catch (error) {
        if (!isCancelled) {
          startTransition(() => {
            setAuthNotice({ tone: 'danger', title: 'Session unavailable', description: getErrorMessage(error, 'Live cart and checkout temporarily unavailable.') });
            setIsAuthenticating(false);
          });
        }
      }
    };
    void restore();
    return () => { isCancelled = true; };
  }, []);

  const selectedBranch = branches.find((b) => b.id === planner.branchId) ?? branches[0];
  const branchCatalog = catalog.filter((p) => p.branchIds.includes(planner.branchId));
  const categoryOptions = ['all', ...Array.from(new Set(branchCatalog.map((p) => p.category))).sort((a, b) => a.localeCompare(b))];
  const filteredProducts = branchCatalog.filter((p) => {
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const searchTarget = `${p.name} ${p.category} ${p.dosageForm}`.toLowerCase();
    return matchesCategory && (deferredSearchTerm.length === 0 || searchTarget.includes(deferredSearchTerm));
  });
  const cartQuantity = cartItems.reduce((t, i) => t + i.quantity, 0);
  const cartView: CartViewItem[] = cartItems.map((item) => {
    const product = catalog.find((p) => p.id === item.productId);
    return { ...item, product, lineTotal: (product?.price ?? 0) * item.quantity };
  });

  function updatePlanner<Key extends keyof BranchPlanner>(field: Key, value: BranchPlanner[Key]) {
    setPlanner((cur) => ({ ...cur, [field]: value }));
    setIssues((cur) => cur.filter((i) => i.field !== field));
    setFeedback(null);
    setCartPreview(null);
  }

  function resetPlanner() {
    setPlanner({ branchId: branches[0]?.id ?? '', serviceMode: 'pickup', deliveryArea: '', basketIntent: '' });
    setIssues([]);
    setFeedback(null);
    setCartPreview(null);
    setCheckoutNotice(null);
  }

  function handlePlannerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBranch) { setIssues([{ field: 'branchId', message: 'Branch coverage unavailable. Reload the page.' }]); return; }
    const nextIssues = validatePlanner(planner, branches);
    setIssues(nextIssues);
    if (nextIssues.length) { setFeedback({ tone: 'danger', title: 'Fix the highlighted fields', description: 'Branch, fulfillment, or delivery details have conflicts.' }); return; }
    setFeedback(buildPlannerFeedback(planner, selectedBranch));
  }

  function addToCart(productId: string, quantity = 1) {
    const product = catalog.find((p) => p.id === productId);
    setCartItems((cur) => {
      const existing = cur.find((i) => i.productId === productId);
      if (!existing) return [...cur, { productId, quantity }];
      return cur.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i);
    });
    setCartNotice({ tone: 'success', title: `${product?.name ?? 'Product'} added`, description: `${serviceOptionLabels[planner.serviceMode]} cart at ${selectedBranch?.name ?? 'branch'}.` });
    setCheckoutNotice(null);
    setIsCartOpen(true);
  }

  function updateCartQuantity(productId: string, nextQty: number) {
    if (nextQty <= 0) { setCartItems((cur) => cur.filter((i) => i.productId !== productId)); setCartPreview(null); return; }
    setCartItems((cur) => cur.map((i) => i.productId === productId ? { ...i, quantity: nextQty } : i));
    setCartPreview(null);
  }

  function isUnauthorizedApiError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.message.includes('"statusCode":401') || error.message.includes('Unauthorized');
  }

  async function withCustomerSessionRetry<T>(run: (accessToken: string, onUnauthorized: () => void) => Promise<T>) {
    let activeSession = session;

    if (!activeSession?.accessToken) {
      activeSession = await getOrCreateDemoCustomerSession();
      startTransition(() => {
        setSession(activeSession);
        setAuthNotice({
          tone: 'success',
          title: 'Demo session refreshed',
          description: 'The storefront restored the seeded Ada Okafor customer session before continuing.',
        });
      });
    }

    const handleUnauthorized = () => {
      clearStoredSession();
      setSession(null);
    };

    try {
      return await run(activeSession.accessToken, handleUnauthorized);
    } catch (error) {
      if (!isUnauthorizedApiError(error)) {
        throw error;
      }

      clearStoredSession();
      const refreshedSession = await getOrCreateDemoCustomerSession();
      startTransition(() => {
        setSession(refreshedSession);
        setAuthNotice({
          tone: 'success',
          title: 'Demo session refreshed',
          description: 'The customer session had expired, so the storefront signed in again automatically and retried the action.',
        });
      });

      return run(refreshedSession.accessToken, handleUnauthorized);
    }
  }

  async function handlePreviewCart() {
    if (!cartItems.length) { setCartNotice({ tone: 'warning', title: 'Cart is empty', description: 'Add at least one product first.' }); setCartPreview(null); return; }
    setIsPreviewingCart(true);
    try {
      const preview = await withCustomerSessionRetry((accessToken, onUnauthorized) => {
        const client = createStorefrontClient(accessToken, onUnauthorized);
        return client.previewCart({ customerId: DEMO_STOREFRONT_CUSTOMER_ID, branchId: planner.branchId, items: cartItems });
      });
      startTransition(() => {
        setCartPreview(preview);
        setCartNotice({ tone: preview.containsPrescriptionItems ? 'warning' : 'success', title: preview.containsPrescriptionItems ? 'Rx items — pending review' : 'Cart validated', description: preview.containsPrescriptionItems ? 'Order will route to pending_review.' : 'Live stock and pricing confirmed.' });
        setCheckoutNotice(null);
      });
    } catch (error) {
      startTransition(() => { setCartPreview(null); setCartNotice({ tone: 'danger', title: 'Preview failed', description: getErrorMessage(error, 'Cart could not be validated.') }); });
    } finally { setIsPreviewingCart(false); }
  }

  async function handleCheckout() {
    if (!cartItems.length) { setCheckoutNotice({ tone: 'warning', title: 'Cart is empty', description: 'Add products before checkout.' }); return; }
    setIsCheckingOut(true);
    try {
      const response = await withCustomerSessionRetry((accessToken, onUnauthorized) => {
        const client = createStorefrontClient(accessToken, onUnauthorized);
        return client.checkout({ customerId: DEMO_STOREFRONT_CUSTOMER_ID, branchId: planner.branchId, items: cartItems });
      });
      startTransition(() => {
        setCartPreview(response.cart);
        setCartItems([]);
        setCheckoutNotice({ tone: 'success', title: `Order ${response.order.id} placed!`, description: response.cart.containsPrescriptionItems ? 'Pharmacist review required for Rx items.' : `Confirmed at ${selectedBranch?.name ?? planner.branchId} · status: ${response.order.status}.` });
      });
    } catch (error) {
      startTransition(() => { setCheckoutNotice({ tone: 'danger', title: 'Checkout failed', description: getErrorMessage(error, 'Order could not be created.') }); });
    } finally { setIsCheckingOut(false); }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const heroBtnActive: CSSProperties = { padding: '0.6rem 0', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.875rem', border: `1px solid ${c.brand}`, background: c.brand, color: '#ffffff', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' };
  const heroBtnInactive: CSSProperties = { padding: '0.6rem 0', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' };
  const heroInputStyle: CSSProperties = { width: '100%', padding: '0.7rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit' };
  const plannerIssue = (field: string) => issues.find((i) => i.field === field)?.message;
  const navLink = (light: boolean): CSSProperties => ({ padding: '0.4rem 0.75rem', borderRadius: c.rPill, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, color: light ? 'rgba(255,255,255,0.82)' : c.inkSub, whiteSpace: 'nowrap' });

  return (
    <div style={{ minHeight: '100vh', background: c.surface }}>

      {/* Cart backdrop */}
      {isCartOpen && (
        <div onClick={() => setIsCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }} aria-hidden="true" />
      )}

      {/* Sticky nav */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, height: '3.75rem', background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent', backdropFilter: scrolled ? 'blur(14px)' : 'none', borderBottom: scrolled ? `1px solid ${c.border}` : 'none', transition: 'background 0.25s ease, backdrop-filter 0.25s ease, border-color 0.25s ease' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: '100%', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: scrolled ? c.ink : '#ffffff', flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, background: c.brand, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <LeafIcon size={17} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>Lanyard</span>
            <span style={{ fontWeight: 400, fontSize: '1rem', opacity: 0.65 }}>Pharmacy</span>
          </a>
          <nav style={{ flex: 1, display: 'flex', gap: '0.125rem' }}>
            <a href="#catalog" style={navLink(!scrolled)}>Catalog</a>
            <Link href="/prescriptions" style={navLink(!scrolled)}>Prescriptions</Link>
            <Link href="/account" style={navLink(!scrolled)}>My Account</Link>
          </nav>
          <button type="button" onClick={() => setIsCartOpen(true)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.375rem', background: scrolled ? c.surfaceAlt : 'rgba(255,255,255,0.12)', border: `1px solid ${scrolled ? c.border : 'rgba(255,255,255,0.2)'}`, borderRadius: c.rPill, padding: '0.425rem 0.9rem', cursor: 'pointer', color: scrolled ? c.ink : '#ffffff', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s', fontFamily: 'inherit' }}>
            <CartIconSvg size={16} />
            <span>Cart</span>
            {cartQuantity > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: '1.125rem', height: '1.125rem', background: c.brand, color: '#ffffff', borderRadius: '999px', fontSize: '0.625rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.25rem' }}>{cartQuantity > 9 ? '9+' : cartQuantity}</span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: c.heroBg, minHeight: '100vh', padding: '5.5rem 1.5rem 4.5rem', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-8%', width: '55vw', height: '70vh', background: 'radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-12%', left: '10%', width: '35vw', height: '45vh', background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', flexWrap: 'wrap', gap: '3rem 4.5rem', alignItems: 'center' }}>

          {/* Left: copy */}
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: c.rPill, padding: '0.3rem 0.875rem 0.3rem 0.625rem', marginBottom: '1.75rem' }}>
              <div style={{ width: 7, height: 7, background: c.accent, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <span style={{ color: c.accent, fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.06em' }}>{branches.length} branches serving you</span>
            </div>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 1.375rem', letterSpacing: '-0.035em' }}>
              Healthcare<br />that fits<br /><span style={{ color: c.accent }}>your life.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '1.0625rem', lineHeight: 1.75, margin: '0 0 2.5rem', maxWidth: 440 }}>
              Browse thousands of products, request prescriptions online, and pick up same-day — or get it delivered to your door.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a href="#catalog" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: c.brand, color: '#ffffff', borderRadius: c.rPill, padding: '0.8rem 1.625rem', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none' }}>Browse catalog →</a>
              <Link href="/prescriptions" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.09)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: c.rPill, padding: '0.8rem 1.625rem', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}>Prescriptions</Link>
            </div>
          </div>

          {/* Right: planner card */}
          <div style={{ flex: '1 1 340px', minWidth: 0, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: c.rLg, padding: '1.875rem' }}>
            <h2 style={{ color: '#ffffff', fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.375rem', letterSpacing: '-0.01em' }}>Set your branch</h2>
            <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.8125rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>Your branch drives catalog availability, stock, and fulfillment options.</p>

            <ValidationSummary issues={issues} />

            {feedback && (
              <div style={{ background: feedback.tone === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${feedback.tone === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ color: feedback.tone === 'success' ? '#86efac' : '#fca5a5', fontSize: '0.8125rem', lineHeight: 1.55, margin: 0 }}>
                  <strong style={{ fontWeight: 700 }}>{feedback.title}</strong> — {feedback.description}
                </p>
              </div>
            )}

            <form onSubmit={handlePlannerSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem' }}>Branch</label>
                <select value={planner.branchId} onChange={(e) => updatePlanner('branchId', e.target.value)} style={{ ...heroInputStyle, WebkitAppearance: 'none', cursor: 'pointer' }}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.city}{b.supportsDelivery ? '' : ' (pickup only)'}</option>)}
                </select>
                {plannerIssue('branchId') && <p style={{ color: '#fca5a5', fontSize: '0.75rem', margin: '0.3rem 0 0' }}>{plannerIssue('branchId')}</p>}
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem' }}>Fulfillment</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {(['pickup', 'delivery'] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => updatePlanner('serviceMode', mode)} style={planner.serviceMode === mode ? heroBtnActive : heroBtnInactive}>
                      {mode === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                    </button>
                  ))}
                </div>
                {plannerIssue('serviceMode') && <p style={{ color: '#fca5a5', fontSize: '0.75rem', margin: '0.3rem 0 0' }}>{plannerIssue('serviceMode')}</p>}
              </div>
              {planner.serviceMode === 'delivery' && (
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem' }}>Delivery area</label>
                  <input type="text" value={planner.deliveryArea} onChange={(e) => updatePlanner('deliveryArea', e.target.value)} placeholder="Postcode or landmark" style={{ ...heroInputStyle, borderColor: plannerIssue('deliveryArea') ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.15)' }} />
                  {plannerIssue('deliveryArea') && <p style={{ color: '#fca5a5', fontSize: '0.75rem', margin: '0.3rem 0 0' }}>{plannerIssue('deliveryArea')}</p>}
                </div>
              )}
              <button type="submit" disabled={isLoadingBranches} style={{ padding: '0.8rem', borderRadius: '0.75rem', background: c.brand, color: '#ffffff', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit', opacity: isLoadingBranches ? 0.6 : 1 }}>
                {isLoadingBranches ? 'Loading branches…' : 'Confirm location'}
              </button>
              <button type="button" onClick={resetPlanner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', padding: 0, textAlign: 'center', fontFamily: 'inherit' }}>Reset</button>
            </form>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ background: c.surfaceMint, borderBottom: `1px solid ${c.borderMint}`, padding: '1.75rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.5rem' }}>
          {trustFeatures.map((f) => <TrustFeature key={f.label} icon={f.icon} label={f.label} sub={f.sub} />)}
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" style={{ padding: '4rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.3rem', letterSpacing: '-0.02em', color: c.ink }}>Browse our catalog</h2>
              <p style={{ color: c.inkMuted, margin: 0, fontSize: '0.9375rem' }}>
                {isLoadingCatalog ? 'Loading products…' : `${branchCatalog.length} products at ${selectedBranch?.name ?? 'your branch'}`}
              </p>
            </div>
            {selectedBranch && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: c.surfaceMint, border: `1px solid ${c.borderMint}`, borderRadius: c.rPill, padding: '0.425rem 0.875rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.brand }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: c.brandHov }}>{selectedBranch.name} · {planner.serviceMode === 'pickup' ? 'Pickup' : 'Delivery'}</span>
              </div>
            )}
          </div>

          {branchNotice && <div style={{ marginBottom: '1rem' }}><FeedbackNotice {...branchNotice} /></div>}
          {catalogNotice && <div style={{ marginBottom: '1rem' }}><FeedbackNotice {...catalogNotice} /></div>}
          {authNotice && <div style={{ marginBottom: '1rem' }}><FeedbackNotice {...authNotice} /></div>}
          {cartNotice && <div style={{ marginBottom: '1rem' }}><FeedbackNotice {...cartNotice} /></div>}

          {/* Category chips + search */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {categoryOptions.map((cat) => (
              <button key={cat} type="button" onClick={() => setCategoryFilter(cat)} style={{ borderRadius: c.rPill, padding: '0.4375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', background: categoryFilter === cat ? c.brand : '#ffffff', color: categoryFilter === cat ? '#ffffff' : c.inkMuted, border: `1px solid ${categoryFilter === cat ? c.brand : c.border}`, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {cat === 'all' ? `All (${branchCatalog.length})` : cat}
              </button>
            ))}
            <div style={{ flex: '0 0 auto', minWidth: '14rem', position: 'relative', marginLeft: 'auto' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search products…" style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '0.875rem', paddingTop: '0.4375rem', paddingBottom: '0.4375rem', borderRadius: c.rPill, border: `1px solid ${c.border}`, fontSize: '0.8125rem', color: c.ink, background: '#ffffff', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))', gap: '1.25rem' }}>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} planner={planner} onAddToCart={() => addToCart(product.id)} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '5rem 1rem', color: c.inkMuted }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: c.ink, margin: '0 0 0.5rem' }}>No products found</h3>
              <p style={{ margin: '0 0 1.5rem', lineHeight: 1.6 }}>Try a different category, search term, or branch.</p>
              {(categoryFilter !== 'all' || searchTerm) && (
                <button type="button" onClick={() => { setCategoryFilter('all'); setSearchTerm(''); }} style={{ padding: '0.5rem 1.25rem', borderRadius: c.rPill, background: c.surfaceAlt, border: `1px solid ${c.border}`, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: c.inkSub, fontFamily: 'inherit' }}>Clear filters</button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Cart drawer */}
      <aside aria-label="Shopping cart" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(26rem, 100vw)', zIndex: 50, background: c.surface, boxShadow: '-4px 0 48px rgba(0,0,0,0.18)', transform: isCartOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.125rem 1.5rem', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <CartIconSvg size={18} />
            <span style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Your cart</span>
            {cartQuantity > 0 && <span style={{ background: c.surfaceMint, color: c.brandHov, border: `1px solid ${c.borderMint}`, borderRadius: c.rPill, padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}>{cartQuantity} {cartQuantity === 1 ? 'item' : 'items'}</span>}
          </div>
          <button type="button" onClick={() => setIsCartOpen(false)} style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.inkMuted, fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit' }} aria-label="Close cart">✕</button>
        </div>
        {selectedBranch && (
          <div style={{ padding: '0.5rem 1.5rem', background: c.surfaceAlt, borderBottom: `1px solid ${c.border}`, fontSize: '0.75rem', color: c.inkMuted, display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.brand }} />
            <span>{selectedBranch.name} · {planner.serviceMode === 'pickup' ? 'Pickup' : 'Delivery'}</span>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {isAuthenticating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: c.surfaceMint, borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: c.brandHov }}>
              <div style={{ width: 8, height: 8, background: c.brand, borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
              Connecting customer session…
            </div>
          )}
          {checkoutNotice && <div style={{ marginBottom: '0.75rem' }}><FeedbackNotice {...checkoutNotice} /></div>}
          {cartView.length > 0 ? (
            <>
              {cartView.map((item) => <CartLineItem key={item.productId} item={item} onUpdateQuantity={updateCartQuantity} />)}
              {cartPreview && (
                <div style={{ marginTop: '1.25rem', background: c.surfaceMint, border: `1px solid ${c.borderMint}`, borderRadius: c.r, padding: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: c.brandHov, marginBottom: '0.75rem' }}>Order summary — {selectedBranch?.name}</div>
                  {cartPreview.items.map((item) => (
                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: c.inkSub, marginBottom: '0.3rem' }}>
                      <span>{item.name} ×{item.quantity}</span>
                      <span style={{ fontWeight: 600 }}>{formatPrice(item.lineTotal)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${c.borderMint}`, marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: c.ink }}>
                    <span>Total</span>
                    <span style={{ color: c.brand }}>{formatPrice(cartPreview.total)}</span>
                  </div>
                  {cartPreview.containsPrescriptionItems && <p style={{ fontSize: '0.75rem', color: c.rx, margin: '0.625rem 0 0' }}>⚠ Contains Rx items — pharmacist review required</p>}
                  {cartPreview.nextOrderStatus && <p style={{ fontSize: '0.75rem', color: c.inkMuted, margin: '0.3rem 0 0' }}>Next status: <strong style={{ color: c.inkSub }}>{cartPreview.nextOrderStatus}</strong></p>}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <div style={{ color: '#d1d5db', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><CartIconSvg size={48} /></div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.4rem', color: c.ink }}>Your cart is empty</h3>
              <p style={{ color: c.inkMuted, fontSize: '0.875rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Browse the catalog and add products to get started.</p>
              <button type="button" onClick={() => setIsCartOpen(false)} style={{ background: c.brand, color: '#ffffff', borderRadius: c.rPill, padding: '0.55rem 1.375rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Browse catalog</button>
            </div>
          )}
        </div>
        {cartView.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${c.border}`, display: 'grid', gap: '0.5rem', flexShrink: 0 }}>
            <button type="button" onClick={() => void handlePreviewCart()} disabled={isPreviewingCart || isCheckingOut} style={{ padding: '0.75rem', borderRadius: '0.75rem', background: c.surfaceMint, color: c.brandHov, border: `1px solid ${c.borderMint}`, fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', opacity: isPreviewingCart || isCheckingOut ? 0.55 : 1, fontFamily: 'inherit' }}>
              {isPreviewingCart ? 'Calculating…' : 'Preview order'}
            </button>
            <button type="button" onClick={() => void handleCheckout()} disabled={isCheckingOut || isPreviewingCart} style={{ padding: '0.75rem', borderRadius: '0.75rem', background: c.brand, color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', opacity: isCheckingOut || isPreviewingCart ? 0.55 : 1, fontFamily: 'inherit' }}>
              {isCheckingOut ? 'Placing order…' : 'Checkout now →'}
            </button>
          </div>
        )}
      </aside>

    </div>
  );
}
