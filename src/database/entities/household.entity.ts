import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { HouseholdMember } from './household-member.entity.js';
import type { HouseholdTv } from './household-tv.entity.js';

@Entity('households')
export class Household {
  @PrimaryColumn({ name: 'hh_id', type: 'varchar' })
  hhId: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  region: string;

  @Column({ name: 'total_tvs', type: 'integer', default: 0 })
  totalTvs: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany('HouseholdMember', 'household')
  members?: HouseholdMember[];

  @OneToMany('HouseholdTv', 'household')
  tvs?: HouseholdTv[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

