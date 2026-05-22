import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, Matches } from 'class-validator';

const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UpdateCustomerDto {
  @IsOptional()
  @Transform(trimString)
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(trimString)
  @Matches(PHONE_PATTERN)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  refillReminderOptIn?: boolean;
}