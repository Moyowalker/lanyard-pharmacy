'use client';

import { startTransition, useEffect, useState, type FormEvent } from 'react';
import {
  HEALTH_ALERT_CODES,
  WORKFLOW_EVENT_STATUSES,
  type PlatformHealth,
  type PlatformRole,
} from '@lanyard/api-contracts';
import {
  createPlatformApiClient,
  createPlatformSession,
  parsePlatformSession,
  resolveApiBaseUrl,
  serializePlatformSession,
  type BranchSummary,
  type LoginRequest,
  type PlatformSession,
} from '@lanyard/api-contracts/client';
import {
  Button,
  DashboardShell,
  DataTable,
  ErrorState,
  FeedbackNotice,
  Field,
  LoadingState,
  Panel,
  ResponsiveGrid,
  SelectInput,
  StatCard,
  StatusBadge,
  TextInput,
  UnauthorizedState,
  ValidationSummary,
  getFieldIssue,
  type FormFeedback,
  type FormIssue,
} from '@lanyard/ui';

type AdminHandoffForm = {
  branchId: string;
  queueAction: string;
  ownerEmail: string;
};

type NavDefinition = {
  label: string;
  href: string;
  roles: PlatformRole[];
  badge?: string;
};

const workerHealth: PlatformHealth = {
  service: 'worker',
  status: 'degraded',
  timestamp: '2026-05-22T00:00:00.000Z',
  uptimeSeconds: 43210,
  metrics: {
    httpRequestsTotal: 14,
    healthChecksTotal: 4,
    workflowEventsProcessedTotal: 31,
    workflowEventsRetriedTotal: 3,
    workflowEventsDeadLetteredTotal: 1,
    notificationDispatchesTotal: 27,
    queueDepth: 2,
    retryBacklog: 1,
    deadLetterCount: 1,
  },
  alerts: [
    {
      code: 'workflow_dead_letters_present',
      severity: 'critical',
      count: 1,
      message: 'One workflow event requires manual intervention.',
    },
  ],
};

const ADMIN_SESSION_STORAGE_KEY = 'lanyard.admin.session';
const ADMIN_BRANCH_STORAGE_KEY = 'lanyard.admin.branch';
const DEMO_ADMIN_LOGIN: LoginRequest = {
  email: 'admin@lanyardpharmacy.com',
  password: 'Admin123!',
};
const fallbackBranches: BranchSummary[] = [
  { id: 'branch-main', name: 'Main Branch', city: 'Lagos', supportsDelivery: true },
  { id: 'branch-airport', name: 'Airport Branch', city: 'Lagos', supportsDelivery: true },
];
const publicAdminClient = createPlatformApiClient({
  baseUrl: resolveApiBaseUrl(),
});

const queueRows = [
  {
    area: 'Worker queue',
    value: `${workerHealth.metrics.queueDepth} pending or processing`,
    tone: 'warning' as const,
  },
  {
    area: 'Retry backlog',
    value: `${workerHealth.metrics.retryBacklog} awaiting replay`,
    tone: 'warning' as const,
  },
  {
    area: 'Dead letters',
    value: `${workerHealth.metrics.deadLetterCount} requiring intervention`,
    tone: 'danger' as const,
  },
];



function validateHandoffForm(form: AdminHandoffForm): FormIssue[] {
  const issues: FormIssue[] = [];

  if (!form.branchId) {
    issues.push({
      field: 'branchId',
      message: 'Pick the branch context before assigning queue work or replay actions.',
    });
  }

  if (!form.queueAction) {
    issues.push({
      field: 'queueAction',
      message: 'Select the operational action that this branch handoff should take.',
    });
  }

  if (!form.ownerEmail.trim()) {
    issues.push({
      field: 'ownerEmail',
      message: 'Provide the operations owner email so the handoff has clear accountability.',
    });
  } else if (!form.ownerEmail.includes('@')) {
    issues.push({
      field: 'ownerEmail',
      message: 'Use a valid email address for the escalation owner.',
    });
  }

  return issues;
}

function readStoredAdminSession() {
  return parsePlatformSession(readLocalStorage(ADMIN_SESSION_STORAGE_KEY));
}

function persistAdminSession(session: PlatformSession) {
  writeLocalStorage(ADMIN_SESSION_STORAGE_KEY, serializePlatformSession(session));
}

function clearStoredAdminSession() {
  removeLocalStorage(ADMIN_SESSION_STORAGE_KEY);
}

function readStoredBranchId() {
  return readLocalStorage(ADMIN_BRANCH_STORAGE_KEY);
}

function persistStoredBranchId(branchId: string) {
  writeLocalStorage(ADMIN_BRANCH_STORAGE_KEY, branchId);
}

function readLocalStorage(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function removeLocalStorage(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function getVisibleNavItems(roles: PlatformRole[], activeBranchLabel: string, alertCount: number) {
  const definitions: NavDefinition[] = [
    {
      label: 'Shell',
      href: '/',
      roles: ['pharmacist', 'branch_manager', 'inventory_officer', 'dispatcher', 'support_admin', 'super_admin'],
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      roles: ['pharmacist', 'branch_manager', 'inventory_officer', 'dispatcher', 'support_admin', 'super_admin'],
      badge: activeBranchLabel,
    },
    {
      label: 'Catalog',
      href: '/catalog',
      roles: ['branch_manager', 'inventory_officer', 'super_admin'],
    },
    {
      label: 'Inventory',
      href: '/inventory',
      roles: ['inventory_officer', 'branch_manager', 'super_admin'],
    },
    {
      label: 'Queue health',
      href: '#queue',
      roles: ['pharmacist', 'branch_manager', 'inventory_officer', 'dispatcher', 'support_admin', 'super_admin'],
      badge: `${alertCount} alert`,
    },
    {
      label: 'Access states',
      href: '#access',
      roles: ['pharmacist', 'branch_manager', 'inventory_officer', 'dispatcher', 'support_admin', 'super_admin'],
    },
  ];

  const visible = definitions.filter((definition) => definition.roles.some((role) => roles.includes(role)));

  return visible.map((definition, index) => ({
    label: definition.label,
    href: definition.href,
    badge: definition.badge,
    active: index === 0,
  }));
}

export function AdminHome() {
  const [session, setSession] = useState<PlatformSession | null>(() => readStoredAdminSession());
  const [branches, setBranches] = useState<BranchSummary[]>(fallbackBranches);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => readStoredBranchId() ?? fallbackBranches[0]?.id ?? '');
  const [form, setForm] = useState<AdminHandoffForm>({
    branchId: readStoredBranchId() ?? fallbackBranches[0]?.id ?? 'branch-main',
    queueAction: '',
    ownerEmail: '',
  });
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [feedback, setFeedback] = useState<FormFeedback | null>({
    tone: 'neutral',
    title: 'Authenticated admin shell ready to be wired',
    description: 'This shell now restores a real operator session, exposes role-aware navigation, and keeps the active branch context visible across operational surfaces.',
  });
  const [authNotice, setAuthNotice] = useState<FormFeedback | null>(null);
  const [branchNotice, setBranchNotice] = useState<FormFeedback | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  useEffect(() => {
    if (session) {
      persistAdminSession(session);
      return;
    }

    clearStoredAdminSession();
  }, [session]);

  useEffect(() => {
    if (!selectedBranchId) {
      return;
    }

    persistStoredBranchId(selectedBranchId);
    setForm((current) => ({
      ...current,
      branchId: selectedBranchId,
    }));
  }, [selectedBranchId]);

  useEffect(() => {
    let isCancelled = false;

    const restoreOrCreateAdminSession = async () => {
      const storedSession = readStoredAdminSession();

      if (storedSession?.user.roles.length) {
        setSession(storedSession);
        setAuthNotice({
          tone: 'success',
          title: 'Demo admin session restored',
          description: 'The admin shell is using the seeded super-admin account to drive role-aware navigation and branch context.',
        });
        setIsAuthenticating(false);
        return;
      }

      try {
        const loginResponse = await publicAdminClient.login(DEMO_ADMIN_LOGIN);

        if (isCancelled) {
          return;
        }

        const nextSession = createPlatformSession(loginResponse);
        startTransition(() => {
          setSession(nextSession);
          setAuthNotice({
            tone: 'success',
            title: 'Demo admin session ready',
            description: 'The admin shell now authenticates with the seeded super-admin account instead of static placeholder state.',
          });
          setIsAuthenticating(false);
        });
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setAuthNotice({
              tone: 'danger',
              title: 'Admin authentication failed',
              description: 'The seeded admin account could not be restored, so authenticated shell features are unavailable right now.',
            });
            setIsAuthenticating(false);
          });
        }
      }
    };

    void restoreOrCreateAdminSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadBranches = async () => {
      try {
        const liveBranches = await publicAdminClient.listBranches();

        if (isCancelled || liveBranches.length === 0) {
          return;
        }

        startTransition(() => {
          setBranches(liveBranches);
          setSelectedBranchId((current) => (liveBranches.some((branch) => branch.id === current) ? current : liveBranches[0]?.id ?? current));
          setBranchNotice(null);
          setIsLoadingBranches(false);
        });
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setBranchNotice({
              tone: 'warning',
              title: 'Using seeded branch context',
              description: 'The live branch endpoint is unavailable, so the admin shell is using seeded branch options until the API responds again.',
            });
            setIsLoadingBranches(false);
          });
        }
      }
    };

    void loadBranches();

    return () => {
      isCancelled = true;
    };
  }, []);

  const activeBranch = branches.find((branch) => branch.id === selectedBranchId) ?? branches[0] ?? null;
  const visibleNavItems = getVisibleNavItems(session?.user.roles ?? [], activeBranch?.name ?? 'branch pending', workerHealth.alerts.length);

  function updateForm<Key extends keyof AdminHandoffForm>(field: Key, value: AdminHandoffForm[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setIssues((current) => current.filter((issue) => issue.field !== field));
    setFeedback(null);
  }

  function handleBranchSelection(branchId: string) {
    setSelectedBranchId(branchId);
    updateForm('branchId', branchId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextIssues = validateHandoffForm(form);
    setIssues(nextIssues);

    if (nextIssues.length) {
      setFeedback({
        tone: 'danger',
        title: 'Fix the handoff details',
        description: 'Admin actions now block incomplete branch, action, and ownership inputs before queue work is reassigned.',
      });
      return;
    }

    setFeedback({
      tone: workerHealth.metrics.deadLetterCount > 0 ? 'warning' : 'success',
      title: `Handoff staged for ${form.branchId}`,
      description: `The ${form.queueAction.replace(/_/g, ' ')} action is now assigned to ${form.ownerEmail.trim()} with branch context pinned to ${activeBranch?.name ?? form.branchId}.`,
    });
  }

  return (
    <DashboardShell
      navigation={(
        visibleNavItems.length
          ? visibleNavItems
          : [{ label: 'Shell', href: '/', active: true }]
      ).map((item, i) => ({ ...item, active: i === 0 }))}
      heading="Admin Shell"
      description={activeBranch ? `Scoped to ${activeBranch.name} · ${activeBranch.city}` : 'Loading branch context…'}
      userLabel={session?.user.email ?? 'Admin'}
      userRole={session?.user.roles[0] ?? 'operator'}
      actions={
        <>
          <StatusBadge tone="danger" dot>{workerHealth.metrics.deadLetterCount} dead letter</StatusBadge>
          <StatusBadge tone="neutral" dot>{activeBranch?.name ?? 'Branch pending'}</StatusBadge>
        </>
      }
    >
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', marginBottom: '1.5rem' }}>
        <StatCard label="Workflow events" value={workerHealth.metrics.workflowEventsProcessedTotal} tone="success" />
        <StatCard label="Queue depth" value={workerHealth.metrics.queueDepth} tone="warning" />
        <StatCard label="Retry backlog" value={workerHealth.metrics.retryBacklog} tone="warning" />
        <StatCard label="Dead letters" value={workerHealth.metrics.deadLetterCount} tone="danger" />
      </div>

      <ResponsiveGrid>
        <Panel title="Session & Branch" description="Operator identity and active branch context.">
          {authNotice ? <FeedbackNotice {...authNotice} /> : null}
          {branchNotice ? <FeedbackNotice {...branchNotice} /> : null}
          {isAuthenticating ? <LoadingState title="Restoring admin session" description="Signing in the seeded super-admin account." /> : null}

          {session ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Field label="Active branch" hint="All operational surfaces scope to this branch.">
                <SelectInput
                  value={selectedBranchId}
                  onChange={(event) => handleBranchSelection(event.target.value)}
                  options={branches.map((branch) => ({
                    label: `${branch.name} · ${branch.city}${branch.supportsDelivery ? ' · delivery' : ''}`,
                    value: branch.id,
                  }))}
                />
              </Field>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', marginBottom: '0.5rem' }}>Operator</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#0f172a', marginBottom: '0.5rem' }}>{session.user.email}</div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {session.user.roles.map((role) => (
                    <StatusBadge key={role} tone="neutral">{role.replace(/_/g, ' ')}</StatusBadge>
                  ))}
                </div>
              </div>
            </div>
          ) : !isAuthenticating ? (
            <UnauthorizedState
              title="Session unavailable"
              description="The seeded operator session could not be restored."
            />
          ) : null}
        </Panel>

        <Panel
          title="Queue handoff"
          description="Stage branch-scoped queue and escalation actions."
          actions={<StatusBadge tone="warning">role-aware</StatusBadge>}
        >
          {feedback ? <FeedbackNotice {...feedback} /> : null}
          <ValidationSummary issues={issues} />

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: feedback || issues.length ? '1rem' : 0 }}>
            <Field label="Branch" error={getFieldIssue(issues, 'branchId')}>
              <SelectInput
                value={form.branchId}
                onChange={(event) => handleBranchSelection(event.target.value)}
                aria-invalid={Boolean(getFieldIssue(issues, 'branchId'))}
                options={branches.map((b) => ({ label: b.name, value: b.id }))}
              />
            </Field>

            <Field label="Action" error={getFieldIssue(issues, 'queueAction')}>
              <SelectInput
                value={form.queueAction}
                onChange={(event) => updateForm('queueAction', event.target.value)}
                aria-invalid={Boolean(getFieldIssue(issues, 'queueAction'))}
                options={[
                  { label: 'Select an action', value: '' },
                  { label: 'Replay dead letters', value: 'replay_dead_letters' },
                  { label: 'Escalate pharmacist review', value: 'escalate_pharmacist_review' },
                  { label: 'Handoff delivery exception', value: 'handoff_delivery_exception' },
                ]}
              />
            </Field>

            <Field label="Escalation owner" error={getFieldIssue(issues, 'ownerEmail')}>
              <TextInput
                value={form.ownerEmail}
                onChange={(event) => updateForm('ownerEmail', event.target.value)}
                aria-invalid={Boolean(getFieldIssue(issues, 'ownerEmail'))}
                placeholder="ops.lead@lanyardpharmacy.com"
              />
            </Field>

            <Button type="submit" variant="primary">Stage handoff</Button>
          </form>
        </Panel>

        <Panel title="Queue health" description="Worker queue status and alert signals.">
          <DataTable
            rows={queueRows}
            columns={[
              { key: 'area', header: 'Surface', render: (row) => row.area },
              { key: 'value', header: 'Signal', render: (row) => row.value },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge dot tone={row.tone}>{row.tone}</StatusBadge>, align: 'right' },
            ]}
          />
        </Panel>

        <Panel title="Access states" description="Reusable unauthorized and error surfaces.">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <UnauthorizedState title="Branch required" description="Switch to an allowed branch before accessing protected queues." />
            <ErrorState title="Queue degraded" description="Escalate when dead-letter counts persist after replay." />
          </div>
        </Panel>
      </ResponsiveGrid>
    </DashboardShell>
  );
}