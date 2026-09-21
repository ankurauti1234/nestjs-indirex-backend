import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import type { DeviceProvisioningToken } from './device-provisioning-token.entity.js';
import type { DeviceCertificate } from './device-certificate.entity.js';
import type { DeviceOperation } from './device-operation.entity.js';

export enum DeviceStatus {
  MANUFACTURED = 'manufactured',
  INSTALL_INITIATED = 'install_initiated',
  VERIFIED = 'verified',
  PROVISIONED = 'provisioned',
  ACTIVE = 'active',
  REVOKED = 'revoked',
  DECOMMISSIONED = 'decommissioned',
}

export enum DeviceEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

@Entity('devices')
export class Device {
  @PrimaryColumn({ name: 'device_id', type: 'varchar' })
  deviceId: string;

  @Column({ name: 'device_name', type: 'varchar', length: 255 })
  deviceName: string;

  @Index({ unique: true })
  @Column({ name: 'cpu_serial', type: 'varchar', length: 255, unique: true, nullable: true })
  cpuSerial?: string;

  @Index()
  @Column({ name: 'current_hh_id', type: 'varchar', nullable: true })
  currentHhId?: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 50,
    default: DeviceStatus.MANUFACTURED,
  })
  status: DeviceStatus | string;

  @Column({
    type: 'varchar',
    length: 50,
    default: DeviceEnvironment.DEVELOPMENT,
  })
  environment: DeviceEnvironment | string;

  @Column({ name: 'manufactured_at', nullable: true })
  manufacturedAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany('DeviceProvisioningToken', 'device')
  provisioningTokens?: DeviceProvisioningToken[];

  @OneToMany('DeviceCertificate', 'device')
  certificates?: DeviceCertificate[];

  @OneToOne('DeviceOperation', 'device')
  operation?: DeviceOperation;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
