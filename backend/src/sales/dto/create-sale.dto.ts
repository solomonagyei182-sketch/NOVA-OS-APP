import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class CreateSaleDto {
  @IsString()
  productId: string;

  @IsString()
  resellerId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0.01)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  commission: number;

  // Omitted (or today's date) means a normal, same-day sale — the existing
  // behavior, unchanged. A past date makes this a historical entry, which
  // the service requires a reason for.
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
