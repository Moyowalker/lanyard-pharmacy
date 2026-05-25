'use client';

import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BranchSummary, CatalogProduct } from '@lanyard/api-contracts/client';
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
  StatusBadge,
  TextInput,
  UnauthorizedState,
  type FormFeedback,
} from '@lanyard/ui';
import { createAdminApiClient, readAdminSession } from './admin-session';

const navItems = [
  { label: 'Shell', href: '/', active: false },
  { label: 'Dashboard', href: '/dashboard', active: false },
  { label: 'Catalog', href: '/catalog', active: true },
  { label: 'Inventory', href: '/inventory', active: false },
  { label: 'Orders', href: '/orders', active: false },
  { label: 'Prescriptions', href: '/prescriptions', active: false },
  { label: 'Customers', href: '/customers', active: false },
  { label: 'Audit', href: '/audit', active: false },
];

const categoryColors: Record<string, string> = {
  'Pain Management': '#f87171',
  Antibiotics: '#60a5fa',
  Vitamins: '#34d399',
  Dermatology: '#f59e0b',
  Cardiovascular: '#a78bfa',
  Respiratory: '#38bdf8',
  Diabetes: '#fb923c',
};

function categoryColor(cat: string) {
  return categoryColors[cat] ?? '#94a3b8';
}

type CreateProductForm = {
  name: string;
  slug: string;
  category: string;
  dosageForm: string;
  priceNgn: string;
  requiresPrescription: boolean;
  branchIds: string[];
};

const initialCreateProductForm: CreateProductForm = {
  name: '',
  slug: '',
  category: '',
  dosageForm: '',
  priceNgn: '',
  requiresPrescription: false,
  branchIds: [],
};

export function CatalogManagement() {
  const [session] = useState(() => readAdminSession());
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<FormFeedback | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createForm, setCreateForm] = useState<CreateProductForm>(initialCreateProductForm);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    const publicClient = createAdminApiClient(null);
    let isCancelled = false;

    void Promise.all([
      publicClient.listCatalogProducts(),
      publicClient.listBranches(),
    ]).then(([productsData, branchesData]) => {
      if (isCancelled) return;
      startTransition(() => {
        setProducts(productsData);
        setBranches(branchesData);
        setIsLoading(false);
      });
    }).catch(() => {
      if (!isCancelled) {
        startTransition(() => {
          setNotice({ tone: 'warning', title: 'Data unavailable', description: 'Could not load catalog or branch data. Is the backend running?' });
          setIsLoading(false);
        });
      }
    });

    return () => { isCancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) { seen.add(p.category); }
    return [...seen].sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = searchTerm
        ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.dosageForm.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchCategory = categoryFilter ? p.category === categoryFilter : true;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const selectedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) ?? null : null;

  function toggleCreateBranch(branchId: string) {
    setCreateForm((current) => {
      if (current.branchIds.includes(branchId)) {
        return {
          ...current,
          branchIds: current.branchIds.filter((id) => id !== branchId),
        };
      }

      return {
        ...current,
        branchIds: [...current.branchIds, branchId],
      };
    });
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = createForm.name.trim();
    const category = createForm.category.trim();
    const dosageForm = createForm.dosageForm.trim();
    const slug = createForm.slug.trim();
    const priceNgn = Number.parseFloat(createForm.priceNgn);
    const hasValidPrice = Number.isFinite(priceNgn) && priceNgn > 0;

    if (!name || !category || !dosageForm || !hasValidPrice || createForm.branchIds.length === 0) {
      setNotice({
        tone: 'warning',
        title: 'Incomplete product details',
        description: 'Provide name, category, dosage form, positive price, and at least one branch before creating a product.',
      });
      return;
    }

    if (!session) {
      return;
    }

    setIsCreating(true);

    try {
      const createdProduct = await apiClient.createCatalogProduct({
        name,
        slug: slug || undefined,
        category,
        dosageForm,
        price: Math.round(priceNgn * 100),
        requiresPrescription: createForm.requiresPrescription,
        branchIds: createForm.branchIds,
      });

      startTransition(() => {
        setProducts((current) => [...current, createdProduct].sort((left, right) => left.name.localeCompare(right.name)));
        setCreateForm({
          ...initialCreateProductForm,
          branchIds: createdProduct.branchIds,
        });
        setSelectedProductId(createdProduct.id);
        setNotice({
          tone: 'success',
          title: 'Product created',
          description: `${createdProduct.name} is now available in ${createdProduct.branchIds.length} branch${createdProduct.branchIds.length === 1 ? '' : 'es'}.`,
        });
      });
    } catch {
      startTransition(() => {
        setNotice({
          tone: 'danger',
          title: 'Product creation failed',
          description: 'Could not create product. Check slug uniqueness and branch access, then try again.',
        });
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleBranchAvailability(productId: string, branchId: string, currentlyAvailable: boolean) {
    if (!session) return;
    const key = `${productId}:${branchId}`;
    setTogglingKey(key);
    try {
      await apiClient.setBranchProductAvailability(productId, branchId, !currentlyAvailable);
      startTransition(() => {
        setProducts((current) =>
          current.map((p) => {
            if (p.id !== productId) return p;
            const nextBranchIds = currentlyAvailable
              ? p.branchIds.filter((id) => id !== branchId)
              : [...p.branchIds, branchId];
            return { ...p, branchIds: nextBranchIds };
          }),
        );
        setNotice({
          tone: 'success',
          title: 'Availability updated',
          description: `Product is now ${!currentlyAvailable ? 'available' : 'unavailable'} at the selected branch.`,
        });
      });
    } catch {
      startTransition(() =>
        setNotice({ tone: 'danger', title: 'Update failed', description: 'Could not update branch availability. Check your access level.' }),
      );
    } finally {
      setTogglingKey(null);
    }
  }

  if (!session) {
    return (
      <DashboardShell navigation={navItems} heading="Catalog Management" description="Sign in from the admin shell to manage the product catalog.">
        <UnauthorizedState title="No active session" description="Go back to the admin shell to authenticate before accessing catalog management." />
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Go to admin shell</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      navigation={navItems}
      heading="Products & Availability"
      description="Browse the full product catalog and manage branch availability."
      actions={
        <>
          <StatusBadge tone="neutral" dot>{products.length} products</StatusBadge>
          <StatusBadge tone="neutral" dot>{branches.length} branches</StatusBadge>
        </>
      }
    >
      <ResponsiveGrid>
        <Panel title="Create product" description="Add new products to the catalog and assign their initial branch availability.">
          <form onSubmit={(event) => void handleCreateProduct(event)} style={{ display: 'grid', gap: '0.75rem' }}>
            <Field label="Product name">
              <TextInput
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Panadol Advance"
              />
            </Field>
            <Field label="Slug (optional)">
              <TextInput
                value={createForm.slug}
                onChange={(event) => setCreateForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="panadol-advance"
              />
            </Field>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <Field label="Category">
                <TextInput
                  value={createForm.category}
                  onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Pain Management"
                />
              </Field>
              <Field label="Dosage form">
                <TextInput
                  value={createForm.dosageForm}
                  onChange={(event) => setCreateForm((current) => ({ ...current, dosageForm: event.target.value }))}
                  placeholder="tablet"
                />
              </Field>
              <Field label="Price (NGN)">
                <TextInput
                  value={createForm.priceNgn}
                  onChange={(event) => setCreateForm((current) => ({ ...current, priceNgn: event.target.value }))}
                  placeholder="4500"
                />
              </Field>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Prescription policy</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  size="sm"
                  variant={createForm.requiresPrescription ? 'primary' : 'secondary'}
                  onClick={() => setCreateForm((current) => ({ ...current, requiresPrescription: true }))}
                >
                  Rx required
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!createForm.requiresPrescription ? 'primary' : 'secondary'}
                  onClick={() => setCreateForm((current) => ({ ...current, requiresPrescription: false }))}
                >
                  Over-the-counter
                </Button>
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Initial branch availability</span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {branches.map((branch) => {
                  const selected = createForm.branchIds.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      style={{
                        borderRadius: '999px',
                        padding: '0.3rem 0.7rem',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        border: `1px solid ${selected ? '#16a34a' : '#e2e8f0'}`,
                        background: selected ? '#16a34a' : '#fff',
                        color: selected ? '#fff' : '#0f172a',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleCreateBranch(branch.id)}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create product'}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Filters */}
        <Panel title="Filters" description="Narrow the product list by name, category, or dosage form.">
          {notice ? <FeedbackNotice {...notice} /> : null}
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Field label="Search products">
              <TextInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, category, or dosage form…"
              />
            </Field>
            <div>
              <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Category</span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  style={{
                    borderRadius: '999px',
                    padding: '0.3rem 0.7rem',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    border: `1px solid ${categoryFilter === '' ? '#16a34a' : '#e2e8f0'}`,
                    background: categoryFilter === '' ? '#16a34a' : '#fff',
                    color: categoryFilter === '' ? '#fff' : '#0f172a',
                    cursor: 'pointer',
                  }}
                  onClick={() => setCategoryFilter('')}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    style={{
                      borderRadius: '999px',
                      padding: '0.3rem 0.7rem',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      border: `1px solid ${categoryFilter === cat ? categoryColor(cat) : '#e2e8f0'}`,
                      background: categoryFilter === cat ? categoryColor(cat) : '#fff',
                      color: categoryFilter === cat ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                    }}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Availability editor for selected product */}
        {selectedProduct ? (
          <Panel
            title={selectedProduct.name}
            description={`${selectedProduct.category} · ${selectedProduct.dosageForm} · ₦${(selectedProduct.price / 100).toLocaleString()}`}
            actions={
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedProduct.requiresPrescription ? <StatusBadge tone="warning">Rx required</StatusBadge> : null}
                <Button size="sm" variant="ghost" onClick={() => setSelectedProductId(null)}>✕ Close</Button>
              </div>
            }
          >
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#475569' }}>
              Toggle which branches carry this product.
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {branches.map((branch) => {
                const available = selectedProduct.branchIds.includes(branch.id);
                const key = `${selectedProduct.id}:${branch.id}`;
                const isToggling = togglingKey === key;
                return (
                  <div
                    key={branch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: `1px solid ${available ? '#16a34a' : '#e2e8f0'}`,
                      background: available ? '#dcfce7' : '#fff',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.875rem', fontWeight: 600 }}>{branch.name}</strong>
                      <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.8125rem' }}>
                        {branch.city}{branch.supportsDelivery ? ' · delivery' : ''}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={available ? 'danger' : 'primary'}
                      disabled={isToggling}
                      onClick={() => void handleToggleBranchAvailability(selectedProduct.id, branch.id, available)}
                    >
                      {isToggling ? '…' : available ? 'Remove' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {/* Products table */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Product catalog" description={`Showing ${filtered.length} of ${products.length} products.`}>
            {isLoading ? (
              <LoadingState title="Loading catalog" description="Fetching all products from the catalog API…" />
            ) : (
              <DataTable
                rows={filtered}
                emptyState={<EmptyState title="No products" description="No products match the current filters." />}
                columns={[
                  {
                    key: 'name',
                    header: 'Product',
                    render: (row) => (
                      <div style={{ display: 'grid', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#0f172a' }}>{row.name}</span>
                        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{row.dosageForm}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'category',
                    header: 'Category',
                    render: (row) => (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: '999px',
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          background: `${categoryColor(row.category)}22`,
                          color: categoryColor(row.category),
                          border: `1px solid ${categoryColor(row.category)}55`,
                        }}
                      >
                        {row.category}
                      </span>
                    ),
                  },
                  {
                    key: 'price',
                    header: 'Price',
                    align: 'right',
                    render: (row) => `₦${(row.price / 100).toLocaleString()}`,
                  },
                  {
                    key: 'rx',
                    header: 'Rx',
                    align: 'center',
                    render: (row) =>
                      row.requiresPrescription ? (
                        <StatusBadge tone="warning">Rx</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">OTC</StatusBadge>
                      ),
                  },
                  {
                    key: 'branches',
                    header: 'Branches',
                    align: 'center',
                    render: (row) => (
                      <StatusBadge tone={row.branchIds.length > 0 ? 'success' : 'danger'}>
                        {row.branchIds.length} / {branches.length}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Availability',
                    align: 'right',
                    render: (row) => (
                      <Button
                        size="sm"
                        variant={selectedProductId === row.id ? 'secondary' : 'primary'}
                        onClick={() => setSelectedProductId(selectedProductId === row.id ? null : row.id)}
                      >
                        {selectedProductId === row.id ? 'Done' : 'Manage'}
                      </Button>
                    ),
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
