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

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['pending_review', 'awaiting_payment', 'cancelled'],
  pending_review: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['processing', 'cancelled'],
  processing: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};