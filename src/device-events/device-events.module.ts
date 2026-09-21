import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceEvent } from '../database/entities/device-event.entity.js';
import { DeviceEventsService } from './device-events.service.js';
import { DeviceEventsController } from './device-events.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceEvent])],
  controllers: [DeviceEventsController],
  providers: [DeviceEventsService],
  exports: [DeviceEventsService],
})
export class DeviceEventsModule {}

