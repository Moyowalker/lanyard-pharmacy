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
  SelectInput,
  StatusBadge,
  TextInput,
  UnauthorizedState,
  ValidationSummary,
  getFieldIssue,
  type FormFeedback,
  type FormIssue,
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
  { label: 'Users', href: '/users', active: false },
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

const formGridStyle = {
  display: 'grid',
  gap: '1rem',
} as const;

const pairedFieldGridStyle = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
} as const;

const sectionCardStyle = {
  display: 'grid',
  gap: '0.75rem',
  padding: '1rem',
  borderRadius: '0.875rem',
  border: '1px solid #e2e8f0',
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
} as const;

const helperCardGridStyle = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
} as const;

const helperCardStyle = {
  display: 'grid',
  gap: '0.2rem',
  padding: '0.9rem 1rem',
  borderRadius: '0.875rem',
  border: '1px solid #dbeafe',
  background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)',
} as const;

const chipGroupStyle = {
  display: 'flex',
  gap: '0.45rem',
  flexWrap: 'wrap',
} as const;

function createChipStyle(selected: boolean, color: string) {
  return {
    borderRadius: '999px',
    padding: '0.45rem 0.8rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    border: `1px solid ${selected ? color : '#dbe2ea'}`,
    background: selected ? color : '#ffffff',
    color: selected ? '#ffffff' : '#0f172a',
    boxShadow: selected ? `0 8px 18px ${color}2b` : 'none',
    cursor: 'pointer',
  } as const;
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

function validateCreateProductForm(form: CreateProductForm): FormIssue[] {
  const issues: FormIssue[] = [];
  const priceNgn = Number.parseFloat(form.priceNgn);

  if (!form.name.trim()) {
    issues.push({ field: 'name', message: 'Enter the shopper-facing product name.' });
  }

  if (!form.category.trim()) {
    issues.push({ field: 'category', message: 'Provide a category so the catalog can be filtered clearly.' });
  }

  if (!form.dosageForm.trim()) {
    issues.push({ field: 'dosageForm', message: 'Provide the dosage form shown to customers.' });
  }

  if (!form.priceNgn.trim() || !Number.isFinite(priceNgn) || priceNgn <= 0) {
    issues.push({ field: 'priceNgn', message: 'Enter a positive price in naira.' });
  }

  if (form.branchIds.length === 0) {
    issues.push({ field: 'branchIds', message: 'Select at least one branch for the initial rollout.' });
  }

  return issues;
}

export function CatalogManagement() {
  const [session] = useState(() => readAdminSession());
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageNotice, setPageNotice] = useState<FormFeedback | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createForm, setCreateForm] = useState<CreateProductForm>(initialCreateProductForm);
  const [createIssues, setCreateIssues] = useState<FormIssue[]>([]);
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
          setPageNotice({ tone: 'warning', title: 'Data unavailable', description: 'Could not load catalog or branch data from the live API.' });
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

    setCreateIssues((current) => current.filter((issue) => issue.field !== 'branchIds'));
  }

  function updateCreateForm<Key extends keyof CreateProductForm>(field: Key, value: CreateProductForm[Key]) {
    setCreateForm((current) => ({ ...current, [field]: value }));
    setCreateIssues((current) => current.filter((issue) => issue.field !== field));
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const issues = validateCreateProductForm(createForm);
    setCreateIssues(issues);

    if (issues.length > 0) {
      return;
    }

    const name = createForm.name.trim();
    const category = createForm.category.trim();
    const dosageForm = createForm.dosageForm.trim();
    const slug = createForm.slug.trim();
    const priceNgn = Number.parseFloat(createForm.priceNgn);

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
        setCreateIssues([]);
        setSelectedProductId(createdProduct.id);
        setPageNotice({
          tone: 'success',
          title: 'Product created',
          description: `${createdProduct.name} is now available in ${createdProduct.branchIds.length} branch${createdProduct.branchIds.length === 1 ? '' : 'es'}.`,
        });
      });
    } catch {
      startTransition(() => {
        setPageNotice({
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
        setPageNotice({
          tone: 'success',
          title: 'Availability updated',
          description: `Product is now ${!currentlyAvailable ? 'available' : 'unavailable'} at the selected branch.`,
        });
      });
    } catch {
      startTransition(() =>
        setPageNotice({ tone: 'danger', title: 'Update failed', description: 'Could not update branch availability. Check your access level.' }),
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
      <ResponsiveGrid minWidth="20rem">
        {pageNotice ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <FeedbackNotice {...pageNotice} />
          </div>
        ) : null}

        <Panel title="Create product" description="Add new products to the catalog and assign their initial branch availability.">
          <form onSubmit={(event) => void handleCreateProduct(event)} style={formGridStyle}>
            <ValidationSummary issues={createIssues} title="Review the product details before creating this catalog item." />

            <div style={helperCardGridStyle}>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Pricing</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                  {createForm.priceNgn.trim() ? `₦${Number.parseFloat(createForm.priceNgn || '0').toLocaleString()}` : 'Enter amount'}
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Input is in naira; the API stores kobo.</span>
              </div>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Coverage</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{createForm.branchIds.length} branch{createForm.branchIds.length === 1 ? '' : 'es'} selected</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Choose where the product launches first.</span>
              </div>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Prescription</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{createForm.requiresPrescription ? 'Rx required' : 'Over-the-counter'}</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>This policy appears in the storefront and fulfillment flow.</span>
              </div>
            </div>

            <div style={pairedFieldGridStyle}>
              <Field label="Product name" hint="Use the customer-facing catalog name." error={getFieldIssue(createIssues, 'name')}>
                <TextInput
                  value={createForm.name}
                  onChange={(event) => updateCreateForm('name', event.target.value)}
                  placeholder="Panadol Advance"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'name'))}
                />
              </Field>
              <Field label="Slug (optional)" hint="Leave blank to auto-generate from the product name.">
                <TextInput
                  value={createForm.slug}
                  onChange={(event) => updateCreateForm('slug', event.target.value)}
                  placeholder="panadol-advance"
                />
              </Field>
            </div>

            <div style={pairedFieldGridStyle}>
              <Field label="Category" hint="Use a shopper-facing grouping." error={getFieldIssue(createIssues, 'category')}>
                <TextInput
                  value={createForm.category}
                  onChange={(event) => updateCreateForm('category', event.target.value)}
                  placeholder="Pain Management"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'category'))}
                />
              </Field>
              <Field label="Dosage form" hint="Example: tablet, capsule, syrup." error={getFieldIssue(createIssues, 'dosageForm')}>
                <TextInput
                  value={createForm.dosageForm}
                  onChange={(event) => updateCreateForm('dosageForm', event.target.value)}
                  placeholder="tablet"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'dosageForm'))}
                />
              </Field>
              <Field label="Price (NGN)" hint="Whole naira amount shown on the storefront." error={getFieldIssue(createIssues, 'priceNgn')}>
                <TextInput
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={createForm.priceNgn}
                  onChange={(event) => updateCreateForm('priceNgn', event.target.value)}
                  placeholder="4500"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'priceNgn'))}
                />
              </Field>
            </div>

            <div style={sectionCardStyle}>
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>Prescription policy</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Set how the product should behave in catalog browsing and checkout.</span>
              </div>
              <div style={chipGroupStyle}>
                <button
                  type="button"
                  style={createChipStyle(createForm.requiresPrescription, '#ea580c')}
                  onClick={() => updateCreateForm('requiresPrescription', true)}
                >
                  Rx required
                </button>
                <button
                  type="button"
                  style={createChipStyle(!createForm.requiresPrescription, '#16a34a')}
                  onClick={() => updateCreateForm('requiresPrescription', false)}
                >
                  Over-the-counter
                </button>
              </div>
            </div>

            <div style={sectionCardStyle}>
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>Initial branch availability</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Select the branches that should carry this product immediately.</span>
              </div>
              <div style={chipGroupStyle}>
                {branches.map((branch) => {
                  const selected = createForm.branchIds.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      style={createChipStyle(selected, '#0f766e')}
                      onClick={() => toggleCreateBranch(branch.id)}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
              {getFieldIssue(createIssues, 'branchIds') ? (
                <span style={{ color: '#b91c1c', fontSize: '0.8125rem', fontWeight: 500 }}>{getFieldIssue(createIssues, 'branchIds')}</span>
              ) : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>New products stay selected so you can adjust branch availability immediately after creation.</span>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create product'}
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Filters" description="Narrow the product list by name, category, or dosage form.">
          <div style={formGridStyle}>
            <div style={helperCardGridStyle}>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Visible</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{filtered.length} product{filtered.length === 1 ? '' : 's'}</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Matching the current filter set.</span>
              </div>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Categories</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{categories.length || 'No'} configured</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Filter by live catalog categories.</span>
              </div>
            </div>

            <div style={pairedFieldGridStyle}>
              <Field label="Search products" hint="Search by name, category, or dosage form.">
                <TextInput
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Name, category, or dosage form…"
                />
              </Field>
              <Field label="Category" hint="Show all categories or narrow to one.">
                <SelectInput
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  options={[
                    { label: 'All categories', value: '' },
                    ...categories.map((category) => ({ label: category, value: category })),
                  ]}
                />
              </Field>
            </div>
          </div>
        </Panel>

        {selectedProduct ? (
          <Panel
            title={selectedProduct.name}
            description={`${selectedProduct.category} · ${selectedProduct.dosageForm} · ₦${(selectedProduct.price / 100).toLocaleString()}`}
            actions={
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedProduct.requiresPrescription ? <StatusBadge tone="warning">Rx required</StatusBadge> : null}
                <Button size="sm" variant="ghost" onClick={() => setSelectedProductId(null)}>Close</Button>
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
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      padding: '0.75rem 0.875rem',
                      borderRadius: '0.75rem',
                      border: `1px solid ${available ? '#16a34a' : '#e2e8f0'}`,
                      background: available ? '#dcfce7' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '0.2rem' }}>
                      <strong style={{ fontSize: '0.875rem', fontWeight: 600 }}>{branch.name}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                        {branch.city}{branch.supportsDelivery ? ' · delivery' : ''}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={available ? 'danger' : 'primary'}
                      disabled={isToggling}
                      onClick={() => void handleToggleBranchAvailability(selectedProduct.id, branch.id, available)}
                    >
                      {isToggling ? 'Updating…' : available ? 'Remove' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Product catalog" description={`Showing ${filtered.length} of ${products.length} products.`}>
            {isLoading ? (
              <LoadingState title="Loading catalog" description="Fetching all products from the catalog API..." />
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
