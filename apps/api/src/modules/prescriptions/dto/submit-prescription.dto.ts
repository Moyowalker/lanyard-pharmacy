import { IsOptional, IsString } from 'class-validator';

export class SubmitPrescriptionDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}