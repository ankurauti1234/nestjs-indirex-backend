import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { AuditModule } from './audit/audit.module.js';
import { HouseholdsModule } from './households/households.module.js';
import { DeviceEventsModule } from './device-events/device-events.module.js';
import { EventTypesModule } from './event-types/event-types.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { RegionsModule } from './regions/regions.module.js';
import { FieldExecutivesModule } from './field-executives/field-executives.module.js';
import { DeviceBatchesModule } from './device-batches/device-batches.module.js';
import { AuthGuard } from './auth/guards/auth.guard.js';
import { RbacGuard } from './auth/guards/rbac.guard.js';
import { AuditInterceptor } from './audit/interceptors/audit.interceptor.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

const observeAppKey = process.env.OBSERVE_APP_KEY;
const observeAppSecret = process.env.OBSERVE_APP_SECRET;
const isObserveConfigured = Boolean(observeAppKey && observeAppSecret && observeAppKey !== 'YOUR_APP_KEY');

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const observeImports = isObserveConfigured
  ? [
      ObserveModule.forRoot({
        appKey: observeAppKey!,
        appSecret: observeAppSecret!,
        serviceId: 'indirex-backend',
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ...observeImports,
    DatabaseModule,
    AuthModule,
    UsersModule,
    RbacModule,
    DevicesModule,
    AuditModule,
    HouseholdsModule,
    DeviceEventsModule,
    EventTypesModule,
    DashboardModule,
    RegionsModule,
    FieldExecutivesModule,
    DeviceBatchesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
