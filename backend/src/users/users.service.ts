import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateUserDto } from './dto/create-user.dto';
import { BulkCreateUserDto } from './dto/bulk-create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const MAX_BULK_ROWS = 100;

const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  count() {
    return this.prisma.user.count();
  }

  findAll(filters: { search?: string; role?: Role }) {
    const where: Prisma.UserWhereInput = {};
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({ where, select: staffSelect, orderBy: { name: 'asc' } });
  }

  async create(dto: CreateUserDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await this.createUserInTx(this.prisma as any, dto);
    this.realtimeGateway.emit('user:created', { userId: created.id });
    return created;
  }

  /**
   * The single unit of work behind account creation — used by create() (one
   * account) and createBulk() (N accounts, one shared transaction), so Bulk
   * Entry can never apply a different security check than Single Entry.
   * Every account still goes through the same bcrypt hashing and the same
   * email-uniqueness check; nothing about authentication is weakened.
   */
  private async createUserInTx(tx: Prisma.TransactionClient, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return tx.user.create({
      data: { name: dto.name.trim(), email, passwordHash, role: dto.role },
      select: staffSelect,
    });
  }

  /** Bulk staff account creation — every row inside one transaction, all-or-nothing. */
  async createBulk(dto: BulkCreateUserDto) {
    if (!dto.rows?.length) {
      throw new BadRequestException('At least one row is required.');
    }
    if (dto.rows.length > MAX_BULK_ROWS) {
      throw new BadRequestException(`Bulk entry is limited to ${MAX_BULK_ROWS} rows at a time.`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const results: Prisma.PromiseReturnType<typeof this.createUserInTx>[] = [];
      for (let i = 0; i < dto.rows.length; i++) {
        try {
          results.push(await this.createUserInTx(tx, dto.rows[i]));
        } catch (err) {
          const message = err instanceof HttpException ? err.message : 'Unexpected error while creating this account.';
          throw new BadRequestException(`Row ${i + 1}: ${message}`);
        }
      }
      return results;
      // bcrypt hashing N times plus Neon connection latency can add up for a
      // larger batch — same timeout margin used by every other bulk path.
    }, { timeout: 15000 + dto.rows.length * 1000 });

    created.forEach((u) => this.realtimeGateway.emit('user:created', { userId: u.id }));
    return { count: created.length, users: created };
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Prisma.UserUpdateInput = {
      name: dto.name?.trim(),
      email: dto.email?.trim().toLowerCase(),
      role: dto.role,
      isActive: dto.isActive,
    };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    const updated = await this.prisma.user.update({ where: { id }, data, select: staffSelect });
    this.realtimeGateway.emit('user:updated', { userId: updated.id });
    return updated;
  }

  updateLastLogin(id: string) {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  /**
   * Atomically checks "no accounts exist yet" and creates the first Manager
   * in one database transaction. A plain count()-then-create() would let two
   * people submitting the setup wizard at the same instant both pass the
   * empty-workspace check before either insert commits, creating two "first"
   * Managers. Serializable isolation makes Postgres detect that conflict and
   * abort one side instead.
   */
  private async runCreateFirstManagerTransaction(dto: { name: string; email: string; passwordHash: string }) {
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.user.count();
        if (total > 0) {
          throw new ForbiddenException('Setup has already been completed for this workspace.');
        }
        return tx.user.create({
          data: {
            name: dto.name.trim(),
            email: dto.email.trim().toLowerCase(),
            passwordHash: dto.passwordHash,
            role: 'MANAGER',
          },
          select: staffSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createFirstManagerIfWorkspaceEmpty(dto: { name: string; email: string; passwordHash: string }) {
    try {
      return await this.runCreateFirstManagerTransaction(dto);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        return this.runCreateFirstManagerTransaction(dto);
      }
      throw err;
    }
  }
}
