import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  currencySymbol?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultLowStockThreshold?: number;
}
