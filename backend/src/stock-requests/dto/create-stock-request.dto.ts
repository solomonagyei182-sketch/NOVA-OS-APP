import { IsInt, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class CreateStockRequestDto {
  @IsString()
  @MinLength(1)
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
