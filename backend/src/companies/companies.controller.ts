import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/types';

@Roles('MANAGER')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('status') status?: CompanyStatus) {
    return this.companiesService.findAll({ search, status });
  }

  @Get('active')
  findActive() {
    return this.companiesService.findActive();
  }

  @Post()
  async create(@Body() dto: CreateCompanyDto, @CurrentUser() user: AuthenticatedUser) {
    const company = await this.companiesService.create(dto);
    await this.auditService.log({
      userId: user.id,
      action: 'COMPANY_CREATED',
      entityType: 'Company',
      entityId: company.id,
      details: { name: company.name },
    });
    return company;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const company = await this.companiesService.update(id, dto);
    await this.auditService.log({
      userId: user.id,
      action: 'COMPANY_UPDATED',
      entityType: 'Company',
      entityId: company.id,
      details: dto as Record<string, unknown>,
    });
    return company;
  }
}
