import { IsInt, IsOptional, IsString, Min, MinLength, MaxLength } from 'class-validator';

export class CorrectStockDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  warehouseQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shopQty?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
