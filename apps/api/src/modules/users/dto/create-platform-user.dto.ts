import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { type PlatformRole } from '../../../common/auth/roles.decorator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const normalizeStringArray = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
};

export class CreatePlatformUserDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  firstName!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  lastName!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @Transform(normalizeStringArray)
  @IsArray()
  @ArrayUnique()
  @IsEnum(['customer', 'pharmacist', 'branch_manager', 'inventory_officer', 'dispatcher', 'support_admin', 'super_admin'] as const, {
    each: true,
  })
  roles!: PlatformRole[];

  @Transform(normalizeStringArray)
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  branchIds!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
