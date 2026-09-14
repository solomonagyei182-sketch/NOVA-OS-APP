import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength, MaxLength } from 'class-validator';

export class CorrectSaleDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  resellerId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
