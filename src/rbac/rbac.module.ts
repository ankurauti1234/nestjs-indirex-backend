import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';
import {
  Role,
  Permission,
  User,
  EventType,
  Region,
  DeviceBatch,
  DeviceBatchItem,
  HouseholdTv,
} from '../database/entities/index.js';
import { RbacSeederService } from '../database/seeders/rbac-seeder.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      User,
      EventType,
      Region,
      DeviceBatch,
      DeviceBatchItem,
      HouseholdTv,
    ]),
  ],
  controllers: [RbacController],
  providers: [RbacService, RbacSeederService],
  exports: [RbacService, RbacSeederService],
})
export class RbacModule {}
