import { IsIn, IsOptional, IsString } from 'class-validator';
import { DELIVERY_DISPATCH_MODES, type DeliveryDispatchMode } from './delivery-types';

export class AssignDeliveryJobDto {
  @IsString()
  orderId!: string;

  @IsIn(DELIVERY_DISPATCH_MODES)
  dispatchMode!: DeliveryDispatchMode;

  @IsString()
  assignedTo!: string;

  @IsOptional()
  @IsString()
  trackingReference?: string;
}