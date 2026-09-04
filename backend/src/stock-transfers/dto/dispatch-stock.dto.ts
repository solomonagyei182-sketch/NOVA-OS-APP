import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class DispatchStockDto {
  @IsString()
  @MinLength(1)
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @MinLength(1)
  assignedToId: string;
}
