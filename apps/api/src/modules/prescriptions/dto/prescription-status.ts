export const PRESCRIPTION_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'clarification_requested',
] as const;

export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const PRESCRIPTION_TRANSITIONS: Record<PrescriptionStatus, PrescriptionStatus[]> = {
  submitted: ['under_review', 'rejected', 'clarification_requested'],
  under_review: ['approved', 'rejected', 'clarification_requested'],
  approved: [],
  rejected: [],
  clarification_requested: ['under_review', 'rejected'],
};