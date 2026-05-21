import { IsIn } from 'class-validator';
import { ORDER_STATUSES, type OrderStatus } from './order-status';

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;
}