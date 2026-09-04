import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CompanyStatus } from '@prisma/client';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: CompanyStatus;
}
