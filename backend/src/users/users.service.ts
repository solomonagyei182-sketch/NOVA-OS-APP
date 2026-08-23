import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
    const email = dto.email.trim().toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name.trim(), email, passwordHash, role: dto.role },
      select: staffSelect,
    });
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
    return this.prisma.user.update({ where: { id }, data, select: staffSelect });
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
