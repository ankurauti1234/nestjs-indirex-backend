import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventType } from '../database/entities/event-type.entity.js';
import { EventTypesService } from './event-types.service.js';
import { EventTypesController } from './event-types.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([EventType])],
  controllers: [EventTypesController],
  providers: [EventTypesService],
  exports: [EventTypesService],
})
export class EventTypesModule {}

