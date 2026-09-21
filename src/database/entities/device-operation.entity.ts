import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Device } from './device.entity.js';

@Entity('device_operations')
export class DeviceOperation {
  @PrimaryColumn({ name: 'device_id', type: 'varchar' })
  deviceId: string;

  @OneToOne('Device', 'operation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'provisioned_at', nullable: true })
  provisionedAt?: Date;

  @Column({ name: 'activated_at', nullable: true })
  activatedAt?: Date;

  @Index()
  @Column({ name: 'last_seen_at', nullable: true })
  lastSeenAt?: Date;

  @Column({ name: 'last_ip_address', type: 'varchar', nullable: true })
  lastIpAddress?: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
