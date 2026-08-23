import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { ROLE_LABELS, SessionsService, type LoginableRole } from '../sessions/sessions.service';
import type { AuthenticatedUser } from './types';
import type { RegisterDto } from './dto/register.dto';
import type { SetupDto } from './dto/setup.dto';

type UserRecord = { id: string; name: string; email: string; role: LoginableRole };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly sessionsService: SessionsService,
    private readonly settingsService: SettingsService,
  ) {}

  /** Shared by login() and setup() — both end with a fresh session + signed cookie token. */
  private async createAuthenticatedSession(
    user: UserRecord,
    userAgent?: string,
  ): Promise<{ token: string; user: AuthenticatedUser }> {
    const session = await this.sessionsService.createSession({ userId: user.id, role: user.role, userAgent });
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    };
    const token = await this.jwtService.signAsync({ sub: user.id, sid: session.id });
    return { token, user: authenticatedUser };
  }

  async login(
    email: string,
    password: string,
    requestedRole: LoginableRole,
    userAgent?: string,
  ): Promise<{ token: string; user: AuthenticatedUser }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // The frontend's Manager/Counter selection is only an entry-path hint —
    // the account's actual stored role is always the source of truth.
    if (user.role === 'PENDING') {
      throw new ForbiddenException(
        'Your account has not yet been assigned an access role. Please contact an administrator.',
      );
    }
    if (user.role !== requestedRole) {
      throw new ForbiddenException(`This account is not authorized to sign in as ${ROLE_LABELS[requestedRole]}.`);
    }

    // Slot-capacity check happens only after credentials and role are confirmed,
    // so a full role doesn't leak information to an unauthenticated caller.
    const result = await this.createAuthenticatedSession(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      userAgent,
    );

    await this.usersService.updateLastLogin(user.id);
    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: { sessionId: result.user.sessionId },
    });

    return result;
  }

  async logout(userId: string, sessionId: string) {
    await this.sessionsService.endSession(sessionId, 'LOGOUT');
    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
    });
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    // Self-service accounts start unassigned and cannot sign in until an
    // Admin assigns Manager or Counter from the existing Staff/Users admin
    // workflow (users.controller.ts) — never chosen at signup.
    const created = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: 'PENDING',
    });

    await this.auditService.log({
      userId: created.id,
      action: 'SELF_REGISTERED',
      entityType: 'User',
      entityId: created.id,
      details: { role: created.role },
    });

    return created;
  }

  /** A workspace with zero accounts hasn't been initialized yet — this is what gates setup(). */
  async getSetupStatus() {
    const total = await this.usersService.count();
    return { needsSetup: total === 0 };
  }

  /**
   * One-time bootstrap for a freshly deployed workspace: creates the very
   * first account as MANAGER directly. This is the sole exception to "signup
   * never chooses a role" — it's only reachable while the account table is
   * completely empty, i.e. only the person who controls this deployment can
   * ever call it, and only once.
   */
  async setup(dto: SetupDto, userAgent?: string) {
    const { needsSetup } = await this.getSetupStatus();
    if (!needsSetup) {
      throw new ForbiddenException('Setup has already been completed for this workspace.');
    }
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const created = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: 'MANAGER',
    });

    if (dto.businessName?.trim()) {
      await this.settingsService.update({ businessName: dto.businessName.trim() }, created.id);
    }

    const result = await this.createAuthenticatedSession(
      { id: created.id, name: created.name, email: created.email, role: 'MANAGER' },
      userAgent,
    );

    await this.usersService.updateLastLogin(created.id);
    await this.auditService.log({
      userId: created.id,
      action: 'WORKSPACE_SETUP',
      entityType: 'User',
      entityId: created.id,
      details: { sessionId: result.user.sessionId },
    });

    return result;
  }
}
