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
  type FormFeedback,
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

export function UsersManagement() {
  const [session] = useState(() => readAdminSession());
  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<FormFeedback | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateUserForm);
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
        setNotice({
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

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !isSuperAdmin) {
      return;
    }

    const firstName = createForm.firstName.trim();
    const lastName = createForm.lastName.trim();
    const email = createForm.email.trim().toLowerCase();

    if (!firstName || !lastName || !email || createForm.password.length < 8 || createForm.roles.length === 0) {
      setNotice({
        tone: 'warning',
        title: 'Incomplete user details',
        description: 'Provide name, email, password (8+ chars), and at least one role before creating a user.',
      });
      return;
    }

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
        setNotice({
          tone: 'success',
          title: 'User created',
          description: `${createdUser.email} can now sign in with assigned roles.`,
        });
      });
    } catch {
      startTransition(() => {
        setNotice({
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
        setNotice({
          tone: 'success',
          title: 'User updated',
          description: `${updatedUser.email} is now ${updatedUser.isActive ? 'active' : 'inactive'}.`,
        });
      });
    } catch {
      startTransition(() => {
        setNotice({
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
      <ResponsiveGrid>
        <Panel title="Create user" description="Provision a new operator account with role and branch scope.">
          {notice ? <FeedbackNotice {...notice} /> : null}
          <form onSubmit={(event) => void handleCreateUser(event)} style={{ display: 'grid', gap: '0.75rem', marginTop: notice ? '0.75rem' : 0 }}>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <Field label="First name">
                <TextInput
                  value={createForm.firstName}
                  onChange={(event) => setCreateForm((current) => ({ ...current, firstName: event.target.value }))}
                  placeholder="Amina"
                />
              </Field>
              <Field label="Last name">
                <TextInput
                  value={createForm.lastName}
                  onChange={(event) => setCreateForm((current) => ({ ...current, lastName: event.target.value }))}
                  placeholder="Okeke"
                />
              </Field>
            </div>

            <Field label="Email">
              <TextInput
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="operator@lanyardpharmacy.com"
              />
            </Field>

            <Field label="Password">
              <TextInput
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Minimum 8 characters"
              />
            </Field>

            <div>
              <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Roles</span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {allRoles.map((role) => {
                  const selected = createForm.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
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
                    >
                      {role.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>Branch scope</span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {branches.map((branch) => {
                  const selected = createForm.branchIds.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => toggleBranch(branch.id)}
                      style={{
                        borderRadius: '999px',
                        padding: '0.3rem 0.7rem',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        border: `1px solid ${selected ? '#0f766e' : '#e2e8f0'}`,
                        background: selected ? '#0f766e' : '#fff',
                        color: selected ? '#fff' : '#0f172a',
                        cursor: 'pointer',
                      }}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
