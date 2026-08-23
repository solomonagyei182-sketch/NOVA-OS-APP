import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CustomerTier } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['TIER_1', 'TIER_2', 'TIER_3'])
  tier?: CustomerTier;
}
