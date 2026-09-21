import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import type { Household } from './household.entity.js';
import type { Device } from './device.entity.js';

@Entity('household_tvs')
@Unique(['hhId', 'tvId'])
@Index(['hhId', 'tvId'])
export class HouseholdTv {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'hh_id', type: 'varchar' })
  hhId: string;

  @ManyToOne('Household', 'tvs', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hh_id' })
  household: Household;

  @Column({ name: 'tv_id', type: 'varchar', length: 50 })
  tvId: string; // e.g. TV1, TV2, TV3

  @Column({ type: 'varchar', length: 100, nullable: true })
  location?: string; // e.g. 'Living Room', 'Master Bedroom'

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string; // e.g. 'Samsung', 'LG'

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @Column({ name: 'screen_size_inches', type: 'integer', nullable: true })
  screenSizeInches?: number;

  @Index()
  @Column({ name: 'installed_device_id', type: 'varchar', length: 255, nullable: true })
  installedDeviceId?: string;

  @ManyToOne('Device', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'installed_device_id', referencedColumnName: 'deviceId' })
  installedDevice?: Device;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

