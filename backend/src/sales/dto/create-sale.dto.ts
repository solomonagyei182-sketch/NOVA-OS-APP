import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
}
