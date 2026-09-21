import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Device } from './device.entity.js';

@Entity('device_provisioning_tokens')
export class DeviceProvisioningToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'device_id', type: 'varchar' })
  deviceId: string;

  @ManyToOne('Device', 'provisioningTokens', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ name: 'otp_code', type: 'varchar', nullable: true })
  otpCode?: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ name: 'used_at', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
