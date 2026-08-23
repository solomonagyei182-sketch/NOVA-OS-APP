import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateResellerDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
