import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import {
  Device,
  DeviceProvisioningToken,
  DeviceCertificate,
  DeviceOperation,
} from '../database/entities/index.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      DeviceProvisioningToken,
      DeviceCertificate,
      DeviceOperation,
    ]),
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
