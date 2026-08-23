import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SetupDto } from './dto/setup.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types';

@Controller('auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>('COOKIE_NAME', 'nova_token');
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
    });
  }

  @Public()
  @Get('setup-status')
  getSetupStatus() {
    return this.authService.getSetupStatus();
  }

  @Public()
  @Post('setup')
  @HttpCode(200)
  async setup(@Body() dto: SetupDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.setup(dto, req.headers['user-agent']);
    this.setSessionCookie(res, token);
    return { user };
  }

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto) {
    await this.authService.register(dto);
    return { message: 'Account created successfully. You can now sign in.' };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.login(dto.email, dto.password, dto.role, req.headers['user-agent']);
    this.setSessionCookie(res, token);
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id, user.sessionId);
    res.clearCookie(this.cookieName);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }
}
