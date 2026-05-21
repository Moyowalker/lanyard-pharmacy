import { Controller, Get } from '@nestjs/common';
import { DeliveryService } from './delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('dispatch-modes')
  listDispatchModes() {
    return this.deliveryService.getDispatchModes();
  }
}