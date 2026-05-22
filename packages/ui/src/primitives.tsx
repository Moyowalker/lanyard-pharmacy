import type { CSSProperties, ComponentPropsWithoutRef, ReactNode } from 'react';

export const uiTokens = {
  color: {
    canvas: '#f6f2e7',
    panel: '#fffaf0',
    panelStrong: '#efe2c4',
    ink: '#162118',
    inkMuted: '#4f5a4f',
    border: '#d5c4a1',
    brand: '#1e6b4d',
    brandSoft: '#dff1e7',
    warning: '#9c6a16',
    warningSoft: '#f8ead0',
    danger: '#8f2f2f',
    dangerSoft: '#f8dddd',
    neutral: '#5f6b64',
    neutralSoft: '#ebefed',
  },
  radius: {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
  },
  shadow: {
    card: '0 18px 40px rgba(22, 33, 24, 0.08)',
  },
  type: {
    display: '600 2.5rem/1.05 Georgia, "Times New Roman", serif',
    title: '600 1.25rem/1.2 Georgia, "Times New Roman", serif',
    body: '400 1rem/1.6 "Segoe UI", sans-serif',
    label: '600 0.9rem/1.2 "Segoe UI", sans-serif',
    mono: '500 0.85rem/1.4 Consolas, "Courier New", monospace',
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
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

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const pageWidthStyle: CSSProperties = {
  width: 'min(1120px, calc(100vw - 2rem))',
  margin: '0 auto',
};

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: uiTokens.radius.sm,
  border: `1px solid ${uiTokens.color.border}`,
  background: '#ffffff',
  color: uiTokens.color.ink,
  padding: '0.9rem 1rem',
  font: uiTokens.type.body,
  boxSizing: 'border-box',
};

const toneStyles: Record<Tone, CSSProperties> = {
  neutral: {
    color: uiTokens.color.neutral,
    background: uiTokens.color.neutralSoft,
  },
  success: {
    color: uiTokens.color.brand,
    background: uiTokens.color.brandSoft,
  },
  warning: {
    color: uiTokens.color.warning,
    background: uiTokens.color.warningSoft,
  },
  danger: {
    color: uiTokens.color.danger,
    background: uiTokens.color.dangerSoft,
  },
};

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
        background: `linear-gradient(180deg, ${uiTokens.color.canvas} 0%, #fbf8ef 100%)`,
        color: uiTokens.color.ink,
        padding: '2rem 0 4rem',
        font: uiTokens.type.body,
      }}
    >
      <div style={pageWidthStyle}>
        <header
          style={{
            display: 'grid',
            gap: '1rem',
            padding: '1.5rem',
            borderRadius: uiTokens.radius.lg,
            background: uiTokens.color.panel,
            border: `1px solid ${uiTokens.color.border}`,
            boxShadow: uiTokens.shadow.card,
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: '0.65rem', maxWidth: '44rem' }}>
              <span style={{ font: uiTokens.type.label, letterSpacing: '0.08em', textTransform: 'uppercase', color: uiTokens.color.brand }}>
                {eyebrow}
              </span>
              <h1 style={{ margin: 0, font: uiTokens.type.display }}>{title}</h1>
              <p style={{ margin: 0, color: uiTokens.color.inkMuted }}>{description}</p>
            </div>
            {actions ? <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>{actions}</div> : null}
          </div>
          {navigation}
        </header>
        {children}
      </div>
    </main>
  );
}

export function PrimaryNav({ items }: { items: NavItem[] }) {
  return (
    <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      {items.map((item) => (
        <a
          key={`${item.href}-${item.label}`}
          href={item.href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '999px',
            padding: '0.7rem 1rem',
            textDecoration: 'none',
            font: uiTokens.type.label,
            color: item.active ? '#ffffff' : uiTokens.color.ink,
            background: item.active ? uiTokens.color.brand : '#ffffff',
            border: `1px solid ${item.active ? uiTokens.color.brand : uiTokens.color.border}`,
          }}
        >
          <span>{item.label}</span>
          {item.badge ? <StatusBadge tone={item.active ? 'neutral' : 'success'}>{item.badge}</StatusBadge> : null}
        </a>
      ))}
    </nav>
  );
}

export function ResponsiveGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        padding: '1.25rem',
        borderRadius: uiTokens.radius.md,
        border: `1px solid ${uiTokens.color.border}`,
        background: uiTokens.color.panel,
        boxShadow: uiTokens.shadow.card,
        display: 'grid',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <h2 style={{ margin: 0, font: uiTokens.type.title }}>{title}</h2>
          {description ? <p style={{ margin: 0, color: uiTokens.color.inkMuted }}>{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '999px',
        padding: '0.3rem 0.65rem',
        font: uiTokens.type.label,
        whiteSpace: 'nowrap',
        ...toneStyles[tone],
      }}
    >
      {children}
    </span>
  );
}

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
    <label style={{ display: 'grid', gap: '0.45rem' }}>
      <span style={{ font: uiTokens.type.label, color: uiTokens.color.ink }}>{label}</span>
      {children}
      {error ? <span style={{ color: uiTokens.color.danger, font: uiTokens.type.label }}>{error}</span> : null}
      {!error && hint ? <span style={{ color: uiTokens.color.inkMuted, font: uiTokens.type.label }}>{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} style={{ ...inputStyle, ...(props.style ?? {}) }} />;
}

export function SelectInput({
  options,
  ...props
}: ComponentPropsWithoutRef<'select'> & {
  options: SelectOption[];
}) {
  return (
    <select {...props} style={{ ...inputStyle, ...(props.style ?? {}) }}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

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
    return <>{emptyState ?? <EmptyState title="No rows" description="Add records to populate this table." />}</>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '30rem' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: column.align ?? 'left',
                  padding: '0 0 0.9rem',
                  borderBottom: `1px solid ${uiTokens.color.border}`,
                  color: uiTokens.color.inkMuted,
                  font: uiTokens.type.label,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    textAlign: column.align ?? 'left',
                    padding: '0.9rem 0',
                    borderBottom: `1px solid ${uiTokens.color.neutralSoft}`,
                    verticalAlign: 'top',
                  }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
        borderRadius: uiTokens.radius.md,
        border: `1px solid ${uiTokens.color.border}`,
        background: '#ffffff',
        padding: '1rem',
        display: 'grid',
        gap: '0.9rem',
      }}
    >
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        <strong style={{ font: uiTokens.type.title }}>{title}</strong>
        <p style={{ margin: 0, color: uiTokens.color.inkMuted }}>{description}</p>
      </div>
      {children}
      {footer ? <div style={{ borderTop: `1px solid ${uiTokens.color.neutralSoft}`, paddingTop: '0.9rem' }}>{footer}</div> : null}
    </div>
  );
}

function StateCard({
  eyebrow,
  title,
  description,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: Tone;
}) {
  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: uiTokens.radius.md,
        border: `1px dashed ${uiTokens.color.border}`,
        background: '#ffffff',
        display: 'grid',
        gap: '0.55rem',
      }}
    >
      <StatusBadge tone={tone}>{eyebrow}</StatusBadge>
      <strong style={{ font: uiTokens.type.title }}>{title}</strong>
      <p style={{ margin: 0, color: uiTokens.color.inkMuted }}>{description}</p>
    </div>
  );
}

export function LoadingState({ title, description }: { title: string; description: string }) {
  return <StateCard eyebrow="Loading" title={title} description={description} tone="neutral" />;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <StateCard eyebrow="Empty" title={title} description={description} tone="warning" />;
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return <StateCard eyebrow="Error" title={title} description={description} tone="danger" />;
}

export function UnauthorizedState({ title, description }: { title: string; description: string }) {
  return <StateCard eyebrow="Unauthorized" title={title} description={description} tone="danger" />;
}