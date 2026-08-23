import { ConflictException, Injectable } from '@nestjs/common';
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
    return this.prisma.user.findUnique({ where: { email } });
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
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }
    return this.prisma.user.findMany({ where, select: staffSelect, orderBy: { name: 'asc' } });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, role: dto.role },
      select: staffSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      email: dto.email,
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
}
