export const DELIVERY_DISPATCH_MODES = ['manual_dispatch', 'courier_dispatch'] as const;

export type DeliveryDispatchMode = (typeof DELIVERY_DISPATCH_MODES)[number];

export const DELIVERY_STATUSES = ['assigned', 'in_transit', 'delivered', 'cancelled'] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];