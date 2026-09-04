import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  /** A brand-new company name — find-or-created (case-insensitively) instead of using companyId. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  newCompanyName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  warehouseQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shopQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
