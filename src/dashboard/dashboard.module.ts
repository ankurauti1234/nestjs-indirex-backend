import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../database/entities/device.entity.js';
import { DeviceOperation } from '../database/entities/device-operation.entity.js';
import { Household } from '../database/entities/household.entity.js';
import { HouseholdMember } from '../database/entities/household-member.entity.js';
import { DeviceEvent } from '../database/entities/device-event.entity.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardController } from './dashboard.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      DeviceOperation,
      Household,
      HouseholdMember,
      DeviceEvent,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

