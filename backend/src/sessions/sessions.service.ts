import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SessionEndReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';

// PENDING accounts can never reach session creation (blocked earlier in AuthService.login),
// so the role here is always one of the two loginable roles — not the full Prisma Role enum.
export type LoginableRole = 'MANAGER' | 'COUNTER';

// `null` means unlimited. Neither role has a concurrent-session cap.
export const ROLE_SESSION_LIMITS: Record<LoginableRole, number | null> = { MANAGER: null, COUNTER: null };
export const ROLE_LABELS: Record<LoginableRole, string> = { MANAGER: 'Manager', COUNTER: 'Counter' };

export function parseDuration(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(input.trim());
  if (!match) return 12 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2] ?? 'ms';
  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

type PrismaLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SessionsService {
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly realtime: RealtimeGateway,
    private readonly auditService: AuditService,
  ) {
    this.ttlMs = parseDuration(this.configService.get<string>('JWT_EXPIRES_IN', '12h'));
  }

  private reapStale(client: PrismaLike) {
    return client.session.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'ENDED', endReason: 'EXPIRED', endedAt: new Date() },
    });
  }

  private runCreateSessionTransaction(params: { userId: string; role: LoginableRole; userAgent?: string }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.reapStale(tx);
        const limit = ROLE_SESSION_LIMITS[params.role];
        if (limit !== null) {
          const activeCount = await tx.session.count({ where: { role: params.role, status: 'ACTIVE' } });
          if (activeCount >= limit) {
            throw new ForbiddenException(
              `All ${ROLE_LABELS[params.role]} access slots are currently occupied. Please try again later or contact an administrator.`,
            );
          }
        }
        const now = new Date();
        return tx.session.create({
          data: {
            userId: params.userId,
            role: params.role,
            expiresAt: new Date(now.getTime() + this.ttlMs),
            userAgent: params.userAgent,
          },
        });
      },
      // Under the default isolation level, two logins arriving at the same
      // instant with exactly one slot left could both count the same
      // pre-insert total and both pass the capacity check, breaching the cap
      // by one. Serializable makes Postgres detect that conflict and abort
      // one side with a retryable error instead of silently over-admitting.
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createSession(params: { userId: string; role: LoginableRole; userAgent?: string }) {
    let session;
    try {
      session = await this.runCreateSessionTransaction(params);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        session = await this.runCreateSessionTransaction(params);
      } else {
        throw err;
      }
    }

    this.realtime.emit('session:created', { userId: params.userId });
    return session;
  }

  async endSession(sessionId: string, reason: SessionEndReason, endedById?: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'ACTIVE') return session;

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endReason: reason, endedAt: new Date(), endedById },
    });
    this.realtime.emit('session:ended', { userId: updated.userId, sessionId: updated.id, reason });
    return updated;
  }

  async touchActivity(sessionId: string) {
    const cutoff = new Date(Date.now() - 60_000);
    await this.prisma.session
      .updateMany({
        where: { id: sessionId, status: 'ACTIVE', lastActivityAt: { lt: cutoff } },
        data: { lastActivityAt: new Date() },
      })
      .catch(() => undefined);
  }

  getSessionById(sessionId: string) {
    return this.prisma.session.findUnique({ where: { id: sessionId } });
  }

  async listActive() {
    await this.reapStale(this.prisma);
    const sessions = await this.prisma.session.findMany({
      where: { status: 'ACTIVE' },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const managerActive = sessions.filter((s) => s.role === 'MANAGER').length;
    const counterActive = sessions.filter((s) => s.role === 'COUNTER').length;
    const managerLimit = ROLE_SESSION_LIMITS.MANAGER;
    const counterLimit = ROLE_SESSION_LIMITS.COUNTER;

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        role: s.role,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
      })),
      capacity: {
        manager: { active: managerActive, max: managerLimit },
        counter: { active: counterActive, max: counterLimit },
        total: {
          active: managerActive + counterActive,
          // Unlimited Counter means there's no meaningful fixed total either.
          max: managerLimit === null || counterLimit === null ? null : managerLimit + counterLimit,
        },
      },
    };
  }

  async dropSession(sessionId: string, adminId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'ACTIVE') {
      throw new NotFoundException('This session is not currently active.');
    }

    const updated = await this.endSession(sessionId, 'ADMIN_DROP', adminId);
    await this.auditService.log({
      userId: adminId,
      action: 'SESSION_DROPPED',
      entityType: 'Session',
      entityId: sessionId,
      details: { targetUserId: session.userId },
    });
    return updated;
  }
}
