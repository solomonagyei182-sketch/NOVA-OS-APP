import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  // The access path the user selected at the entry screen — never trusted as
  // the source of truth. AuthService still verifies it against the account's
  // actual stored role before a session is created.
  @IsIn(['MANAGER', 'COUNTER'])
  role: 'MANAGER' | 'COUNTER';
}
