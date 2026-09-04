import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { BusinessDayModule } from './business-day/business-day.module';
import { SalesModule } from './sales/sales.module';
import { RealtimeModule } from './realtime/realtime.module';
import { CalculationsModule } from './calculations/calculations.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { ResellersModule } from './resellers/resellers.module';
import { SettingsModule } from './settings/settings.module';
import { SessionsModule } from './sessions/sessions.module';
import { CompaniesModule } from './companies/companies.module';
import { StockTransfersModule } from './stock-transfers/stock-transfers.module';
import { CountersModule } from './counters/counters.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    RealtimeModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    InventoryModule,
    BusinessDayModule,
    SalesModule,
    CalculationsModule,
    CustomersModule,
    ReportsModule,
    ResellersModule,
    SettingsModule,
    SessionsModule,
    CompaniesModule,
    StockTransfersModule,
    CountersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
