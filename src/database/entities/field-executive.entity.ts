import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import type { Region } from './region.entity.js';

export enum FieldExecutiveStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

@Entity('field_executives')
@Index(['status'])
export class FieldExecutive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'executive_id', type: 'varchar', length: 50, unique: true })
  executiveId: string; // e.g. 'FE1001'

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  phone: string; // e.g. '+919876543210'

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: FieldExecutiveStatus.ACTIVE,
  })
  status: FieldExecutiveStatus | string;

  @ManyToMany('Region', { cascade: true })
  @JoinTable({
    name: 'field_executive_regions',
    joinColumn: { name: 'field_executive_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'region_id', referencedColumnName: 'id' },
  })
  regions?: Region[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

