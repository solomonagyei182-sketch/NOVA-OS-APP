import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AcceptStockDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @IsOptional()
  @IsString()
  address?: string;
}
