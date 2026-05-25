'use client';

import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { PlatformRole } from '@lanyard/api-contracts';
import type { BranchSummary, PlatformUserRecord } from '@lanyard/api-contracts/client';
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
  ValidationSummary,
  getFieldIssue,
  type FormFeedback,
  type FormIssue,
} from '@lanyard/ui';
import { createAdminApiClient, readAdminSession } from './admin-session';

const navItems = [
  { label: 'Shell', href: '/', active: false },
  { label: 'Dashboard', href: '/dashboard', active: false },
  { label: 'Catalog', href: '/catalog', active: false },
  { label: 'Inventory', href: '/inventory', active: false },
  { label: 'Orders', href: '/orders', active: false },
  { label: 'Prescriptions', href: '/prescriptions', active: false },
  { label: 'Customers', href: '/customers', active: false },
  { label: 'Users', href: '/users', active: true },
  { label: 'Audit', href: '/audit', active: false },
];

const allRoles: PlatformRole[] = [
  'customer',
  'pharmacist',
  'branch_manager',
  'inventory_officer',
  'dispatcher',
  'support_admin',
  'super_admin',
];

type CreateUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: PlatformRole[];
  branchIds: string[];
};

const initialCreateUserForm: CreateUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roles: ['support_admin'],
  branchIds: [],
};

const formGridStyle = {
  display: 'grid',
  gap: '1rem',
} as const;

const pairedFieldGridStyle = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
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

const sectionCardStyle = {
  display: 'grid',
  gap: '0.75rem',
  padding: '1rem',
  borderRadius: '0.875rem',
  border: '1px solid #e2e8f0',
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
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

function validateCreateUserForm(form: CreateUserForm): FormIssue[] {
  const issues: FormIssue[] = [];

  if (!form.firstName.trim()) {
    issues.push({ field: 'firstName', message: 'Enter the operator first name.' });
  }

  if (!form.lastName.trim()) {
    issues.push({ field: 'lastName', message: 'Enter the operator last name.' });
  }

  if (!form.email.trim()) {
    issues.push({ field: 'email', message: 'Enter the operator email address.' });
  }

  if (form.password.length < 8) {
    issues.push({ field: 'password', message: 'Passwords must be at least 8 characters long.' });
  }

  if (form.roles.length === 0) {
    issues.push({ field: 'roles', message: 'Select at least one platform role.' });
  }

  return issues;
}

export function UsersManagement() {
  const [session] = useState(() => readAdminSession());
  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageNotice, setPageNotice] = useState<FormFeedback | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateUserForm);
  const [createIssues, setCreateIssues] = useState<FormIssue[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const apiClient = createAdminApiClient(session);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    void Promise.all([
      apiClient.listPlatformUsers(),
      apiClient.listBranches(),
    ]).then(([usersResponse, branchesResponse]) => {
      if (isCancelled) {
        return;
      }

      startTransition(() => {
        setUsers(usersResponse);
        setBranches(branchesResponse);
        setIsLoading(false);
      });
    }).catch(() => {
      if (isCancelled) {
        return;
      }

      startTransition(() => {
        setPageNotice({
          tone: 'danger',
          title: 'User data unavailable',
          description: 'Could not load user-management data from the API.',
        });
        setIsLoading(false);
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [session]);

  const isSuperAdmin = session?.user.roles.includes('super_admin') ?? false;

  const activeUsers = useMemo(() => users.filter((user) => user.isActive).length, [users]);

  function toggleRole(role: PlatformRole) {
    setCreateForm((current) => {
      if (current.roles.includes(role)) {
        return {
          ...current,
          roles: current.roles.filter((entry) => entry !== role),
        };
      }

      return {
        ...current,
        roles: [...current.roles, role],
      };
    });

    setCreateIssues((current) => current.filter((issue) => issue.field !== 'roles'));
  }

  function toggleBranch(branchId: string) {
    setCreateForm((current) => {
      if (current.branchIds.includes(branchId)) {
        return {
          ...current,
          branchIds: current.branchIds.filter((entry) => entry !== branchId),
        };
      }

      return {
        ...current,
        branchIds: [...current.branchIds, branchId],
      };
    });
  }

  function updateCreateForm<Key extends keyof CreateUserForm>(field: Key, value: CreateUserForm[Key]) {
    setCreateForm((current) => ({ ...current, [field]: value }));
    setCreateIssues((current) => current.filter((issue) => issue.field !== field));
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !isSuperAdmin) {
      return;
    }

    const issues = validateCreateUserForm(createForm);
    setCreateIssues(issues);

    if (issues.length > 0) {
      return;
    }

    const firstName = createForm.firstName.trim();
    const lastName = createForm.lastName.trim();
    const email = createForm.email.trim().toLowerCase();

    setIsCreating(true);

    try {
      const createdUser = await apiClient.createPlatformUser({
        firstName,
        lastName,
        email,
        password: createForm.password,
        roles: createForm.roles,
        branchIds: createForm.branchIds,
        isActive: true,
      });

      startTransition(() => {
        setUsers((current) => [...current, createdUser].sort((left, right) => left.email.localeCompare(right.email)));
        setCreateForm(initialCreateUserForm);
        setCreateIssues([]);
        setPageNotice({
          tone: 'success',
          title: 'User created',
          description: `${createdUser.email} can now sign in with assigned roles.`,
        });
      });
    } catch {
      startTransition(() => {
        setPageNotice({
          tone: 'danger',
          title: 'Creation failed',
          description: 'Could not create user. Check for duplicate email or permission issues.',
        });
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleUserActive(user: PlatformUserRecord) {
    if (!session || !isSuperAdmin) {
      return;
    }

    setUpdatingUserId(user.id);

    try {
      const updatedUser = await apiClient.updatePlatformUser(user.id, {
        isActive: !user.isActive,
      });

      startTransition(() => {
        setUsers((current) => current.map((entry) => (entry.id === user.id ? updatedUser : entry)));
        setPageNotice({
          tone: 'success',
          title: 'User updated',
          description: `${updatedUser.email} is now ${updatedUser.isActive ? 'active' : 'inactive'}.`,
        });
      });
    } catch {
      startTransition(() => {
        setPageNotice({
          tone: 'danger',
          title: 'Update failed',
          description: 'Could not update user status. Check your role and try again.',
        });
      });
    } finally {
      setUpdatingUserId(null);
    }
  }

  if (!session) {
    return (
      <DashboardShell navigation={navItems} heading="User Management" description="Sign in from the admin shell to manage operator accounts.">
        <UnauthorizedState title="No active session" description="Go back to the admin shell to authenticate before managing users." />
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Go to admin shell</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardShell navigation={navItems} heading="User Management" description="Only super admins can manage platform users.">
        <UnauthorizedState title="Access denied" description="Super-admin role is required to create or update operator accounts." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      navigation={navItems}
      heading="User Management"
      description="Manage operator accounts, roles, and account activation status."
      actions={
        <>
          <StatusBadge tone="neutral" dot>{users.length} users</StatusBadge>
          <StatusBadge tone="success" dot>{activeUsers} active</StatusBadge>
        </>
      }
    >
      <ResponsiveGrid minWidth="20rem">
        {pageNotice ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <FeedbackNotice {...pageNotice} />
          </div>
        ) : null}

        <Panel title="Create user" description="Provision a new operator account with role and branch scope.">
          <form onSubmit={(event) => void handleCreateUser(event)} style={formGridStyle}>
            <ValidationSummary issues={createIssues} title="Review the operator details before creating the account." />

            <div style={helperCardGridStyle}>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Access</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{createForm.roles.length} role{createForm.roles.length === 1 ? '' : 's'} selected</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Assign only the permissions the operator needs.</span>
              </div>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Scope</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                  {createForm.branchIds.length ? `${createForm.branchIds.length} branches` : 'Global access'}
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Leave branch scope empty when the role should span all branches.</span>
              </div>
              <div style={helperCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2563eb' }}>Account state</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Active on creation</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Use the directory below to deactivate or reactivate later.</span>
              </div>
            </div>

            <div style={pairedFieldGridStyle}>
              <Field label="First name" hint="Operator given name." error={getFieldIssue(createIssues, 'firstName')}>
                <TextInput
                  value={createForm.firstName}
                  onChange={(event) => updateCreateForm('firstName', event.target.value)}
                  placeholder="Amina"
                  autoComplete="given-name"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'firstName'))}
                />
              </Field>
              <Field label="Last name" hint="Operator surname." error={getFieldIssue(createIssues, 'lastName')}>
                <TextInput
                  value={createForm.lastName}
                  onChange={(event) => updateCreateForm('lastName', event.target.value)}
                  placeholder="Okeke"
                  autoComplete="family-name"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'lastName'))}
                />
              </Field>
            </div>

            <div style={pairedFieldGridStyle}>
              <Field label="Email" hint="Used for sign-in and notifications." error={getFieldIssue(createIssues, 'email')}>
                <TextInput
                  type="email"
                  value={createForm.email}
                  onChange={(event) => updateCreateForm('email', event.target.value)}
                  placeholder="operator@lanyardpharmacy.com"
                  autoComplete="email"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'email'))}
                />
              </Field>
              <Field label="Password" hint="Minimum 8 characters." error={getFieldIssue(createIssues, 'password')}>
                <TextInput
                  type="password"
                  value={createForm.password}
                  onChange={(event) => updateCreateForm('password', event.target.value)}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  aria-invalid={Boolean(getFieldIssue(createIssues, 'password'))}
                />
              </Field>
            </div>

            <div style={sectionCardStyle}>
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>Roles</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Combine only the responsibilities this operator should hold.</span>
              </div>
              <div style={chipGroupStyle}>
                {allRoles.map((role) => {
                  const selected = createForm.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      style={createChipStyle(selected, role === 'super_admin' ? '#b91c1c' : '#16a34a')}
                    >
                      {role.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
              {getFieldIssue(createIssues, 'roles') ? (
                <span style={{ color: '#b91c1c', fontSize: '0.8125rem', fontWeight: 500 }}>{getFieldIssue(createIssues, 'roles')}</span>
              ) : null}
            </div>

            <div style={sectionCardStyle}>
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>Branch scope</span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Assign branches when access should be limited to specific locations.</span>
              </div>
              <div style={chipGroupStyle}>
                {branches.map((branch) => {
                  const selected = createForm.branchIds.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => toggleBranch(branch.id)}
                      style={createChipStyle(selected, '#0f766e')}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>New users are created as active accounts and can be managed from the directory below.</span>
              <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating…' : 'Create user'}</Button>
            </div>
          </form>
        </Panel>

        <div style={{ gridColumn: '1 / -1' }}>
          <Panel title="Operator directory" description="Activate or deactivate accounts used by internal teams.">
            {isLoading ? (
              <LoadingState title="Loading users" description="Fetching platform user accounts from the API..." />
            ) : (
              <DataTable
                rows={users}
                emptyState={<EmptyState title="No users" description="Create the first platform user to get started." />}
                columns={[
                  {
                    key: 'name',
                    header: 'User',
                    render: (row) => (
                      <div style={{ display: 'grid', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#0f172a' }}>{row.firstName} {row.lastName}</span>
                        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{row.email}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'roles',
                    header: 'Roles',
                    render: (row) => (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {row.roles.map((role) => (
                          <StatusBadge key={`${row.id}-${role}`} tone="neutral">{role.replace(/_/g, ' ')}</StatusBadge>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: 'branches',
                    header: 'Branches',
                    align: 'center',
                    render: (row) => (
                      <StatusBadge tone={row.branchIds.length ? 'success' : 'warning'}>{row.branchIds.length || 'all'}</StatusBadge>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    align: 'center',
                    render: (row) => (
                      <StatusBadge tone={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'active' : 'inactive'}</StatusBadge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'right',
                    render: (row) => (
                      <Button
                        size="sm"
                        variant={row.isActive ? 'danger' : 'primary'}
                        disabled={updatingUserId === row.id || row.id === session.user.sub}
                        onClick={() => void handleToggleUserActive(row)}
                      >
                        {updatingUserId === row.id ? 'Updating…' : row.isActive ? 'Deactivate' : 'Activate'}
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
