import { IsInt, IsOptional, Min } from 'class-validator';

export class FulfillStockRequestDto {
  // Lets a Manager send a different amount than was requested (e.g. the
  // warehouse only has partial stock). Defaults to the requested quantity.
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
