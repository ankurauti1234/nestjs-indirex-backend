import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import type { User } from './user.entity.js';
import type { DeviceBatchItem } from './device-batch-item.entity.js';

export enum DeviceBatchType {
  SHARED = 'SHARED',
  EXCLUSIVE = 'EXCLUSIVE',
  GLOBAL = 'GLOBAL',
}

export enum DeviceBatchStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  COMPLETED = 'COMPLETED',
}

@Entity('device_batches')
export class DeviceBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'batch_id', type: 'varchar', length: 50, unique: true })
  batchId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: DeviceBatchType.SHARED,
  })
  type: DeviceBatchType;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: DeviceBatchStatus.ACTIVE,
  })
  status: DeviceBatchStatus;

  @Index()
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User;

  @Column({ name: 'device_count', type: 'integer', default: 0 })
  deviceCount: number;

  @OneToMany('DeviceBatchItem', 'batch', { cascade: true })
  items?: DeviceBatchItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

