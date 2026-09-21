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

export enum CertStatus {
  ACTIVE = 'active',
  GRACE_PERIOD = 'grace_period',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('device_certificates')
export class DeviceCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'device_id', type: 'varchar' })
  deviceId: string;

  @ManyToOne('Device', 'certificates', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Index({ unique: true })
  @Column({ name: 'certificate_id', type: 'varchar', unique: true })
  certificateId: string;

  @Column({ name: 'certificate_arn', type: 'varchar' })
  certificateArn: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: CertStatus.ACTIVE,
  })
  status: CertStatus | string;

  @Column({ name: 'issued_at' })
  issuedAt: Date;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revoked_reason', type: 'text', nullable: true })
  revokedReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
