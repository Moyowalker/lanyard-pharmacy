import { BadRequestException, Injectable } from '@nestjs/common';
import { DELIVERY_STATUSES, type DeliveryStatus } from './dto/delivery-types';

const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  assigned: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

@Injectable()
export class DeliveryWorkflow {
  canTransition(from: DeliveryStatus, to: DeliveryStatus) {
    return DELIVERY_TRANSITIONS[from].includes(to);
  }

  requireTransition(from: DeliveryStatus, to: DeliveryStatus) {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Invalid delivery transition from ${from} to ${to}`);
    }

    return { from, to };
  }

  getStatuses() {
    return [...DELIVERY_STATUSES];
  }
}