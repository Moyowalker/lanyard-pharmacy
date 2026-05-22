import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, NotEquals } from 'class-validator';

export class AdjustInventoryBatchDto {
  @Type(() => Number)
  @IsInt()
  @NotEquals(0)
  quantityDelta!: number;

  @IsNotEmpty()
  reason!: string;
}