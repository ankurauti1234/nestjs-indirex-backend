import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldExecutive } from '../database/entities/field-executive.entity.js';
import { Region } from '../database/entities/region.entity.js';
import { FieldExecutivesService } from './field-executives.service.js';
import { FieldExecutivesController } from './field-executives.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FieldExecutive, Region])],
  controllers: [FieldExecutivesController],
  providers: [FieldExecutivesService],
  exports: [FieldExecutivesService],
})
export class FieldExecutivesModule {}

