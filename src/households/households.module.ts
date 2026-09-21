import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseholdsController } from './households.controller.js';
import { HouseholdsService } from './households.service.js';
import {
  Household,
  HouseholdMember,
  HouseholdTv,
  Device,
} from '../database/entities/index.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Household,
      HouseholdMember,
      HouseholdTv,
      Device,
    ]),
  ],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}
