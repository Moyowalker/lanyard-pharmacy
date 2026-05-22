import type { CSSProperties, ComponentPropsWithoutRef, ReactNode } from 'react';

// ─── Design Tokens ─────────────────────────────────────────────────────────

export const uiTokens = {
  color: {
    // Surfaces
    canvas: '#f8fafc',
    panel: '#ffffff',
    panelStrong: '#f1f5f9',
    // Typography
    ink: '#0f172a',
    inkMuted: '#475569',
    inkSubtle: '#94a3b8',
    // Borders
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    // Brand green
    brand: '#16a34a',
    brandHover: '#15803d',
    brandSoft: '#dcfce7',
    brandMuted: '#bbf7d0',
    // States
    warning: '#d97706',
    warningSoft: '#fef9ee',
    warningBorder: '#fde68a',
    danger: '#dc2626',
    dangerSoft: '#fff1f1',
    dangerBorder: '#fca5a5',
    success: '#16a34a',
    successSoft: '#f0fdf4',
    neutral: '#64748b',
    neutralSoft: '#f1f5f9',
    // Admin sidebar
    sidebar: '#0f172a',
    sidebarBorder: '#1e293b',
    sidebarText: '#94a3b8',
    sidebarTextHover: '#e2e8f0',
    sidebarActive: 'rgba(22,163,74,0.15)',
    sidebarActiveText: '#4ade80',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    pill: '999px',
  },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
    elevated: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    modal: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)',
  },
  type: {
    display: '700 2rem/1.15 Inter, -apple-system, sans-serif',
    title: '600 1.0625rem/1.35 Inter, -apple-system, sans-serif',
    titleLg: '600 1.375rem/1.25 Inter, -apple-system, sans-serif',
    body: '400 0.9375rem/1.6 Inter, -apple-system, sans-serif',
    bodySm: '400 0.875rem/1.55 Inter, -apple-system, sans-serif',
    label: '500 0.8125rem/1.3 Inter, -apple-system, sans-serif',
    labelCaps: '600 0.6875rem/1.2 Inter, -apple-system, sans-serif',
    mono: '500 0.875rem/1.45 "JetBrains Mono", Consolas, monospace',
    numStat: '700 2.25rem/1 Inter, -apple-system, sans-serif',
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export type NavItem = {
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
  icon?: ReactNode;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (row: Row) => ReactNode;
};

export type FormIssue = {
  field: string;
  message: string;
};

export type FormFeedback = {
  tone: Tone;
  title: string;
  description: string;
};

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

// ─── Internal constants ──────────────────────────────────────────────────────

const T = uiTokens;

const inputBase: CSSProperties = {
  width: '100%',
  borderRadius: T.radius.md,
  border: `1px solid ${T.color.border}`,
  background: T.color.panel,
  color: T.color.ink,
  padding: '0.625rem 0.875rem',
  font: T.type.body,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  appearance: 'none',
  WebkitAppearance: 'none',
};

const toneMap: Record<Tone, { color: string; bg: string; border: string }> = {
  neutral: { color: T.color.neutral,  bg: T.color.neutralSoft, border: T.color.border },
  success: { color: '#166534',        bg: T.color.brandSoft,   border: T.color.brandMuted },
  warning: { color: '#92400e',        bg: T.color.warningSoft, border: T.color.warningBorder },
  danger:  { color: '#991b1b',        bg: T.color.dangerSoft,  border: T.color.dangerBorder },
};

const toneIcon: Record<Tone, string> = {
  neutral: '◦',
  success: '✓',
  warning: '⚠',
  danger: '✕',
};

function inputStyle(invalid: boolean): CSSProperties {
  if (!invalid) return inputBase;
  return {
    ...inputBase,
    border: `1px solid ${T.color.danger}`,
    boxShadow: `0 0 0 3px ${T.color.dangerSoft}`,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function getFieldIssue(issues: FormIssue[], field: string) {
  return issues.find((issue) => issue.field === field)?.message;
}

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.375rem',
  fontFamily: 'Inter, -apple-system, sans-serif',
  fontWeight: 500,
  border: '1px solid transparent',
  borderRadius: T.radius.md,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
  lineHeight: 1,
};

const btnVariants: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: T.color.brand, color: '#fff', borderColor: T.color.brand },
  secondary: { background: T.color.panel, color: T.color.ink, borderColor: T.color.border },
  ghost:     { background: 'transparent', color: T.color.inkMuted, borderColor: 'transparent' },
  danger:    { background: T.color.dangerSoft, color: T.color.danger, borderColor: T.color.dangerBorder },
};

const btnSizes: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '0.375rem 0.75rem', fontSize: '0.8125rem' },
  md: { padding: '0.5625rem 1rem',   fontSize: '0.875rem' },
  lg: { padding: '0.75rem 1.25rem',  fontSize: '0.9375rem', fontWeight: 600 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  style: extraStyle,
  children,
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...btnBase,
        ...btnVariants[variant],
        ...btnSizes[size],
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...(extraStyle ?? {}),
      }}
    >
      {children}
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  const t = toneMap[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        borderRadius: T.radius.pill,
        padding: '0.25rem 0.6rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        color: t.color,
        background: t.bg,
        border: `1px solid ${t.border}`,
      }}
    >
      {dot && (
        <span
          style={{
            width: '0.4rem',
            height: '0.4rem',
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

// ─── SkeletonBlock ────────────────────────────────────────────────────────────

export function SkeletonBlock({
  height = '1rem',
  width = '100%',
  borderRadius = T.radius.md,
}: {
  height?: string | number;
  width?: string | number;
  borderRadius?: string;
}) {
  return (
    <>
      <style>{`
        @keyframes lny-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .lny-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 800px 100%;
          animation: lny-shimmer 1.4s infinite linear;
        }
      `}</style>
      <span
        className="lny-skeleton"
        style={{
          display: 'block',
          height,
          width,
          borderRadius,
        }}
        aria-hidden="true"
      />
    </>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: Tone;
}) {
  const accentColor: Record<Tone, string> = {
    neutral: T.color.neutral,
    success: T.color.brand,
    warning: T.color.warning,
    danger:  T.color.danger,
  };
  const accentBg: Record<Tone, string> = {
    neutral: T.color.neutralSoft,
    success: T.color.brandSoft,
    warning: T.color.warningSoft,
    danger:  T.color.dangerSoft,
  };
  return (
    <div
      style={{
        background: T.color.panel,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg,
        padding: '1.25rem 1.5rem',
        boxShadow: T.shadow.card,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '3px',
          height: '100%',
          background: accentColor[tone],
          borderRadius: `${T.radius.lg} 0 0 ${T.radius.lg}`,
        }}
      />
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: T.color.inkSubtle,
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: T.type.numStat,
          color: accentColor[tone],
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: accentColor[tone],
            background: accentBg[tone],
            padding: '0.2rem 0.5rem',
            borderRadius: T.radius.pill,
            alignSelf: 'flex-start',
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── DashboardShell (admin sidebar layout) ───────────────────────────────────

const DASHBOARD_CSS = `
  .lny-ds { display: flex; min-height: 100vh; font-family: Inter, -apple-system, sans-serif; background: #f8fafc; }
  .lny-sidebar {
    width: 240px; min-width: 240px; background: #0f172a; display: flex; flex-direction: column;
    position: sticky; top: 0; height: 100vh; overflow-y: auto; flex-shrink: 0;
    border-right: 1px solid #1e293b;
  }
  .lny-sidebar-logo { padding: 1.25rem 1rem 0.75rem; display: flex; align-items: center; gap: 0.625rem; text-decoration: none; }
  .lny-sidebar-logo-mark { width: 28px; height: 28px; background: #16a34a; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lny-sidebar-logo-name { font-weight: 700; font-size: 0.9375rem; letter-spacing: -0.02em; color: #f1f5f9; }
  .lny-sidebar-logo-sub { font-weight: 400; font-size: 0.8125rem; color: #64748b; }
  .lny-sidebar-divider { height: 1px; background: #1e293b; margin: 0.75rem 0; }
  .lny-sidebar-section { padding: 0 0.625rem; flex: 1; }
  .lny-sidebar-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #475569; padding: 0.5rem 0.5rem 0.375rem; }
  .lny-nav-item {
    display: flex; align-items: center; gap: 0.625rem; padding: 0.5rem 0.625rem; border-radius: 0.375rem;
    text-decoration: none; font-size: 0.875rem; font-weight: 500; color: #94a3b8;
    transition: background 0.12s, color 0.12s; cursor: pointer; border: none; background: transparent;
    width: 100%; margin-bottom: 2px;
  }
  .lny-nav-item:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
  .lny-nav-item.active { background: rgba(22,163,74,0.15); color: #4ade80; }
  .lny-nav-badge {
    margin-left: auto; font-size: 0.6875rem; font-weight: 600; background: rgba(255,255,255,0.1);
    color: #94a3b8; padding: 0.1rem 0.45rem; border-radius: 999px; white-space: nowrap;
  }
  .lny-nav-item.active .lny-nav-badge { background: rgba(74,222,128,0.2); color: #4ade80; }
  .lny-sidebar-footer { padding: 0.75rem 0.625rem; border-top: 1px solid #1e293b; }
  .lny-sidebar-user { display: flex; align-items: center; gap: 0.625rem; padding: 0.5rem 0.625rem; border-radius: 0.375rem; }
  .lny-sidebar-avatar { width: 26px; height: 26px; background: rgba(22,163,74,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 700; color: #4ade80; flex-shrink: 0; }
  .lny-sidebar-user-name { font-size: 0.8125rem; font-weight: 500; color: #cbd5e1; }
  .lny-sidebar-user-role { font-size: 0.6875rem; color: #475569; }
  .lny-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: auto; }
  .lny-topbar {
    position: sticky; top: 0; z-index: 10; background: rgba(248,250,252,0.92);
    backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0;
    padding: 0.875rem 2rem; display: flex; align-items: center; gap: 1rem;
  }
  .lny-topbar-heading { font-size: 1.0625rem; font-weight: 600; color: #0f172a; flex: 1; }
  .lny-topbar-desc { font-size: 0.875rem; color: #64748b; margin-top: 0.1rem; }
  .lny-content { padding: 1.75rem 2rem 3rem; flex: 1; }
  @media (max-width: 900px) {
    .lny-sidebar { display: none; }
    .lny-topbar { padding: 0.75rem 1rem; }
    .lny-content { padding: 1.25rem 1rem 3rem; }
  }
`;

export function DashboardShell({
  navigation,
  heading,
  description,
  actions,
  userLabel,
  userRole,
  children,
}: {
  navigation: NavItem[];
  heading?: string;
  description?: string;
  actions?: ReactNode;
  userLabel?: string;
  userRole?: string;
  children: ReactNode;
}) {
  const initials = userLabel
    ? userLabel.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <>
      <style>{DASHBOARD_CSS}</style>
      <div className="lny-ds">
        {/* Sidebar */}
        <aside className="lny-sidebar">
          <a className="lny-sidebar-logo" href="/">
            <div className="lny-sidebar-logo-mark">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2C5.5 2 3.5 4 3.5 6.5C3.5 9 6 11.5 8 14C10 11.5 12.5 9 12.5 6.5C12.5 4 10.5 2 8 2Z" fill="white" />
              </svg>
            </div>
            <div>
              <div className="lny-sidebar-logo-name">Lanyard</div>
              <div className="lny-sidebar-logo-sub">Admin</div>
            </div>
          </a>

          <div className="lny-sidebar-divider" />

          <nav className="lny-sidebar-section" aria-label="Main navigation">
            <div className="lny-sidebar-label">Navigation</div>
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`lny-nav-item${item.active ? ' active' : ''}`}
              >
                {item.icon && <span style={{ width: 16, opacity: 0.8 }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span className="lny-nav-badge">{item.badge}</span>}
              </a>
            ))}
          </nav>

          <div className="lny-sidebar-footer">
            <div className="lny-sidebar-user">
              <div className="lny-sidebar-avatar">{initials}</div>
              <div>
                <div className="lny-sidebar-user-name">{userLabel ?? 'Admin'}</div>
                <div className="lny-sidebar-user-role">{userRole ?? 'Operator'}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lny-main">
          {(heading || actions) && (
            <div className="lny-topbar">
              <div style={{ flex: 1 }}>
                {heading && <div className="lny-topbar-heading">{heading}</div>}
                {description && <div className="lny-topbar-desc">{description}</div>}
              </div>
              {actions && (
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexShrink: 0 }}>
                  {actions}
                </div>
              )}
            </div>
          )}
          <div className="lny-content">{children}</div>
        </div>
      </div>
    </>
  );
}

// ─── AppShell (storefront page layout) ───────────────────────────────────────

export function AppShell({
  eyebrow,
  title,
  description,
  navigation,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  navigation?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: T.color.canvas,
        color: T.color.ink,
        padding: '2rem 0 4rem',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{ width: 'min(1120px, calc(100vw - 2rem))', margin: '0 auto' }}>
        <header
          style={{
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem 1.75rem',
            borderRadius: T.radius.xl,
            background: T.color.panel,
            border: `1px solid ${T.color.border}`,
            boxShadow: T.shadow.card,
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '44rem' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: T.color.brand,
                }}
              >
                {eyebrow}
              </span>
              <h1 style={{ margin: 0, font: T.type.display, color: T.color.ink }}>{title}</h1>
              <p style={{ margin: 0, color: T.color.inkMuted, fontSize: '0.9375rem', lineHeight: 1.6 }}>{description}</p>
            </div>
            {actions ? <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>{actions}</div> : null}
          </div>
          {navigation}
        </header>
        {children}
      </div>
    </main>
  );
}

// ─── PrimaryNav ───────────────────────────────────────────────────────────────

export function PrimaryNav({ items }: { items: NavItem[] }) {
  return (
    <nav style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      {items.map((item) => (
        <a
          key={`${item.href}-${item.label}`}
          href={item.href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            borderRadius: T.radius.md,
            padding: '0.5rem 0.875rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: item.active ? 600 : 500,
            color: item.active ? T.color.brand : T.color.inkMuted,
            background: item.active ? T.color.brandSoft : 'transparent',
            border: `1px solid ${item.active ? T.color.brandMuted : 'transparent'}`,
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          <span>{item.label}</span>
          {item.badge ? (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                background: item.active ? T.color.brandMuted : T.color.neutralSoft,
                color: item.active ? '#166534' : T.color.neutral,
                padding: '0.1rem 0.4rem',
                borderRadius: T.radius.pill,
              }}
            >
              {item.badge}
            </span>
          ) : null}
        </a>
      ))}
    </nav>
  );
}

// ─── ResponsiveGrid ───────────────────────────────────────────────────────────

export function ResponsiveGrid({ children, minWidth = '14rem' }: { children: ReactNode; minWidth?: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function Panel({
  title,
  description,
  actions,
  children,
  noPad,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  noPad?: boolean;
}) {
  return (
    <section
      style={{
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        background: T.color.panel,
        boxShadow: T.shadow.card,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'start',
          flexWrap: 'wrap',
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${T.color.border}`,
        }}
      >
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          <h2 style={{ margin: 0, font: T.type.title, color: T.color.ink }}>{title}</h2>
          {description ? (
            <p style={{ margin: 0, color: T.color.inkMuted, fontSize: '0.875rem' }}>{description}</p>
          ) : null}
        </div>
        {actions ? <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div> : null}
      </div>
      <div style={noPad ? {} : { padding: '1.25rem 1.5rem' }}>{children}</div>
    </section>
  );
}

// ─── FeedbackNotice ──────────────────────────────────────────────────────────

export function FeedbackNotice({ tone = 'neutral', title, description }: FormFeedback) {
  const t = toneMap[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        borderRadius: T.radius.md,
        border: `1px solid ${t.border}`,
        background: t.bg,
        padding: '0.875rem 1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        borderLeft: `3px solid ${t.color}`,
      }}
    >
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 700,
          color: t.color,
          flexShrink: 0,
          lineHeight: 1.5,
        }}
      >
        {toneIcon[tone]}
      </span>
      <div style={{ display: 'grid', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: t.color }}>{title}</span>
        <span style={{ fontSize: '0.875rem', color: t.color, opacity: 0.8 }}>{description}</span>
      </div>
    </div>
  );
}

// ─── ValidationSummary ───────────────────────────────────────────────────────

export function ValidationSummary({
  issues,
  title = 'Review the highlighted fields before continuing.',
}: {
  issues: FormIssue[];
  title?: string;
}) {
  if (!issues.length) return null;
  const t = toneMap.danger;
  return (
    <div
      role="alert"
      style={{
        borderRadius: T.radius.md,
        border: `1px solid ${t.border}`,
        borderLeft: `3px solid ${T.color.danger}`,
        background: t.bg,
        color: t.color,
        padding: '0.875rem 1rem',
        display: 'grid',
        gap: '0.5rem',
      }}
    >
      <strong style={{ fontSize: '0.875rem', fontWeight: 600 }}>{title}</strong>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.3rem', fontSize: '0.875rem' }}>
        {issues.map((issue) => (
          <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: '0.375rem' }}>
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: error ? T.color.danger : T.color.ink,
        }}
      >
        {label}
      </span>
      {children}
      {error ? (
        <span style={{ color: T.color.danger, fontSize: '0.8125rem', fontWeight: 500 }}>{error}</span>
      ) : hint ? (
        <span style={{ color: T.color.inkSubtle, fontSize: '0.8125rem' }}>{hint}</span>
      ) : null}
    </label>
  );
}

// ─── TextInput / SelectInput ─────────────────────────────────────────────────

export function TextInput(props: ComponentPropsWithoutRef<'input'>) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
  return <input {...props} style={{ ...inputStyle(invalid), ...(props.style ?? {}) }} />;
}

export function SelectInput({
  options,
  ...props
}: ComponentPropsWithoutRef<'select'> & { options: SelectOption[] }) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
  return (
    <select {...props} style={{ ...inputStyle(invalid), ...(props.style ?? {}), cursor: 'pointer' }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<Row>({
  columns,
  rows,
  emptyState,
}: {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  emptyState?: ReactNode;
}) {
  if (!rows.length) {
    return <>{emptyState ?? <EmptyState title="No data" description="No records to display." />}</>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '32rem',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr style={{ background: T.color.canvas }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: col.align ?? 'left',
                  padding: '0.625rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: T.color.inkSubtle,
                  borderBottom: `1px solid ${T.color.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? T.color.panel : T.color.canvas,
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    textAlign: col.align ?? 'left',
                    padding: '0.75rem 1rem',
                    borderBottom: `1px solid ${T.color.border}`,
                    verticalAlign: 'middle',
                    color: T.color.ink,
                  }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── DialogCard ───────────────────────────────────────────────────────────────

export function DialogCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        background: T.color.panel,
        boxShadow: T.shadow.elevated,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${T.color.border}` }}>
        <h3 style={{ margin: '0 0 0.25rem', font: T.type.title, color: T.color.ink }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: T.color.inkMuted }}>{description}</p>
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>{children}</div>
      {footer ? (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${T.color.border}`,
            background: T.color.canvas,
            display: 'flex',
            gap: '0.625rem',
            justifyContent: 'flex-end',
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

// ─── State components ────────────────────────────────────────────────────────

function StateBlock({
  icon,
  title,
  description,
  action,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone: Tone;
}) {
  const t = toneMap[tone];
  return (
    <div
      style={{
        padding: '2.5rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        textAlign: 'center',
        background: T.color.panel,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: T.radius.lg,
          background: t.bg,
          color: t.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: T.color.ink, marginBottom: '0.3rem' }}>{title}</div>
        <div style={{ fontSize: '0.875rem', color: T.color.inkMuted, maxWidth: '28rem' }}>{description}</div>
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <SkeletonBlock height="2rem" width="40%" />
      <SkeletonBlock height="1rem" />
      <SkeletonBlock height="1rem" width="75%" />
      <SkeletonBlock height="1rem" width="55%" />
      <span style={{ display: 'none' }}>{title} — {description}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <StateBlock icon="◎" title={title} description={description} action={action} tone="neutral" />
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <StateBlock icon="✕" title={title} description={description} action={action} tone="danger" />
  );
}

export function UnauthorizedState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <StateBlock icon="⊘" title={title} description={description} action={action} tone="danger" />
  );
}