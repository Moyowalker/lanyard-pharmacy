import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeBranchIds = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
};

export class CreateCatalogProductDto {
  @Transform(trimString)
  @IsNotEmpty()
  name!: string;

  @Transform(trimString)
  @IsOptional()
  slug?: string;

  @Transform(trimString)
  @IsNotEmpty()
  category!: string;

  @Transform(trimString)
  @IsNotEmpty()
  dosageForm!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @Transform(normalizeBranchIds)
  @IsArray()
  @ArrayUnique()
  @IsNotEmpty({ each: true })
  branchIds!: string[];
}
