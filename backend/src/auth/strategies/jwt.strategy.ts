import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { SessionsService } from '../../sessions/sessions.service';
import type { AuthenticatedUser } from '../types';

type JwtPayload = { sub: string; sid: string };

function cookieExtractor(cookieName: string) {
  return (req: Request): string | null => {
    return req?.cookies?.[cookieName] ?? null;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {
    super({
      jwtFromRequest: cookieExtractor(configService.get<string>('COOKIE_NAME', 'nova_token')),
      secretOrKey: configService.get<string>('JWT_SECRET'),
      ignoreExpiration: false,
    } as StrategyOptionsWithoutRequest);
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Your session is no longer valid. Please log in again.');
    }

    // A JWT issued before this session system shipped won't carry a `sid` claim.
    if (!payload.sid) {
      throw new UnauthorizedException('Your session is no longer valid. Please log in again.');
    }

    const session = await this.sessionsService.getSessionById(payload.sid);
    if (!session || session.status !== 'ACTIVE') {
      const message =
        session?.endReason === 'ADMIN_DROP'
          ? 'Your session has been ended by an administrator.'
          : 'Your session is no longer valid. Please log in again.';
      throw new UnauthorizedException(message);
    }

    this.sessionsService.touchActivity(session.id).catch(() => undefined);

    return { id: user.id, name: user.name, email: user.email, role: user.role, sessionId: session.id };
  }
}
