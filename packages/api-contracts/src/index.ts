export const PLATFORM_SERVICES = ['api', 'worker'] as const;
export type PlatformService = (typeof PLATFORM_SERVICES)[number];

export type PlatformRole =
  | 'customer'
  | 'pharmacist'
  | 'branch_manager'
  | 'inventory_officer'
  | 'dispatcher'
  | 'support_admin'
  | 'super_admin';

export const HEALTH_STATUSES = ['ok', 'degraded'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const HEALTH_ALERT_SEVERITIES = ['warning', 'critical'] as const;
export type HealthAlertSeverity = (typeof HEALTH_ALERT_SEVERITIES)[number];

export const HEALTH_ALERT_CODES = ['workflow_retry_backlog', 'workflow_dead_letters_present'] as const;
export type HealthAlertCode = (typeof HEALTH_ALERT_CODES)[number];

export type PlatformHealthAlert = {
  code: HealthAlertCode;
  severity: HealthAlertSeverity;
  count: number;
  message: string;
};

export type PlatformMetrics = {
  httpRequestsTotal: number;
  healthChecksTotal: number;
  workflowEventsProcessedTotal: number;
  workflowEventsRetriedTotal: number;
  workflowEventsDeadLetteredTotal: number;
  notificationDispatchesTotal: number;
  queueDepth: number;
  retryBacklog: number;
  deadLetterCount: number;
};

export type PlatformHealth = {
  service: PlatformService;
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  metrics: PlatformMetrics;
  alerts: PlatformHealthAlert[];
};

export const ORDER_STATUSES = [
  'draft',
  'pending_review',
  'awaiting_payment',
  'processing',
  'ready_for_dispatch',
  'in_transit',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRESCRIPTION_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'fulfilled',
  'rejected',
  'clarification_requested',
] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const WORKFLOW_EVENT_STATUSES = [
  'pending',
  'processing',
  'retrying',
  'completed',
  'failed',
  'dead_lettered',
] as const;
export type WorkflowEventStatus = (typeof WORKFLOW_EVENT_STATUSES)[number];

