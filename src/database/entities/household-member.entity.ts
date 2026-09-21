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

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('household_members')
@Unique(['hhId', 'memberId'])
export class HouseholdMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'hh_id', type: 'varchar' })
  hhId: string;

  @ManyToOne('Household', 'members', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hh_id' })
  household: Household;

  @Column({ name: 'member_id', type: 'varchar', length: 50 })
  memberId: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  dob?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: Gender | string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

