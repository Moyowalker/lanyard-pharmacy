import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class OrderLineInputDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

class OrderRequestDto {
  @IsString()
  customerId!: string;

  @IsString()
  branchId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  items!: OrderLineInputDto[];
}

export class PreviewCartDto extends OrderRequestDto {}

export class CheckoutOrderDto extends OrderRequestDto {}