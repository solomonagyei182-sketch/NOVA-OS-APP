import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SetupDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
