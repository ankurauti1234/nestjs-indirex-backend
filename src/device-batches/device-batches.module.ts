import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceBatchesController } from './device-batches.controller.js';
import { DeviceBatchesService } from './device-batches.service.js';
import { DeviceBatch } from '../database/entities/device-batch.entity.js';
import { DeviceBatchItem } from '../database/entities/device-batch-item.entity.js';
import { Device } from '../database/entities/device.entity.js';
import { User } from '../database/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceBatch,
      DeviceBatchItem,
      Device,
      User,
    ]),
  ],
  controllers: [DeviceBatchesController],
  providers: [DeviceBatchesService],
  exports: [DeviceBatchesService],
})
export class DeviceBatchesModule {}

