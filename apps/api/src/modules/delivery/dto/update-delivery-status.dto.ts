import { IsIn } from 'class-validator';
import { DELIVERY_STATUSES, type DeliveryStatus } from './delivery-types';

export class UpdateDeliveryStatusDto {
  @IsIn(DELIVERY_STATUSES)
  status!: DeliveryStatus;
}