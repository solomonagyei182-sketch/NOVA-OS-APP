import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
