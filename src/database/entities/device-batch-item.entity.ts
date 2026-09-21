import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { DeviceBatch } from './device-batch.entity.js';
import type { Device } from './device.entity.js';

@Entity('device_batch_items')
@Unique(['batchId', 'deviceId'])
@Index(['deviceId', 'batchId'])
export class DeviceBatchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @ManyToOne('DeviceBatch', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch?: DeviceBatch;

  @Index()
  @Column({ name: 'device_id', type: 'varchar', length: 255 })
  deviceId: string;

  @ManyToOne('Device', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id', referencedColumnName: 'deviceId' })
  device?: Device;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}

