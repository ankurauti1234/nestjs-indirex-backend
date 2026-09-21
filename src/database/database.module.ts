import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  User,
  Role,
  Permission,
  Session,
  PasswordReset,
  EmailVerification,
  Device,
  DeviceProvisioningToken,
  DeviceCertificate,
  DeviceOperation,
  Household,
  HouseholdMember,
  HouseholdTv,
  EventType,
  DeviceEvent,
  AuditLog,
  Region,
  FieldExecutive,
  DeviceBatch,
  DeviceBatchItem,
} from './entities/index.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        const isTest = process.env.NODE_ENV === 'test';
        const dbType = process.env.DB_TYPE || (isTest ? 'better-sqlite3' : 'postgres');

        if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: ':memory:',
            entities: [
              User,
              Role,
              Permission,
              Session,
              PasswordReset,
              EmailVerification,
              Device,
              DeviceProvisioningToken,
              DeviceCertificate,
              DeviceOperation,
              Household,
              HouseholdMember,
              HouseholdTv,
              EventType,
              DeviceEvent,
              AuditLog,
              Region,
              FieldExecutive,
              DeviceBatch,
              DeviceBatchItem,
            ],
            synchronize: true,
            logging: false,
          } as any as TypeOrmModuleOptions;
        }

        const schema = process.env.DB_SCHEMA || 'indirex';

        return {
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'indirex_db',
          schema,
          searchPath: [schema, 'public'],
          entities: [
            User,
            Role,
            Permission,
            Session,
            PasswordReset,
            EmailVerification,
            Device,
            DeviceProvisioningToken,
            DeviceCertificate,
            DeviceOperation,
            Household,
            HouseholdMember,
            HouseholdTv,
            EventType,
            DeviceEvent,
            AuditLog,
            Region,
            FieldExecutive,
            DeviceBatch,
            DeviceBatchItem,
          ],
          synchronize: process.env.DB_SYNCHRONIZE !== 'false',
          logging: process.env.DB_LOGGING === 'true',
        } as any as TypeOrmModuleOptions;
      },
    }),
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Session,
      PasswordReset,
      EmailVerification,
      Device,
      DeviceProvisioningToken,
      DeviceCertificate,
      DeviceOperation,
      Household,
      HouseholdMember,
      HouseholdTv,
      EventType,
      DeviceEvent,
      AuditLog,
      Region,
      FieldExecutive,
      DeviceBatch,
      DeviceBatchItem,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
