import { Injectable } from '@nestjs/common';

@Injectable()
export class DeliveryService {
  getDispatchModes() {
    return ['manual_dispatch', 'courier_dispatch'] as const;
  }
}