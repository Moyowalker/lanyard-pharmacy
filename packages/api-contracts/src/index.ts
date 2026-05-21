export type PlatformHealth = {
  service: 'api' | 'worker';
  status: 'ok';
};

export type PrescriptionStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'clarification_requested';

export type OrderStatus =
  | 'draft'
  | 'pending_review'
  | 'awaiting_payment'
  | 'processing'
  | 'ready_for_dispatch'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';