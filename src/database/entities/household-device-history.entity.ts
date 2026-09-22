import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum HouseholdDeviceAction {
  INSTALLED = 'INSTALLED',
  REPLACED = 'REPLACED',
  UNINSTALLED = 'UNINSTALLED',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity({ name: 'household_device_history', schema: 'indirex' })
export class HouseholdDeviceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hh_id', type: 'varchar', length: 50 })
  hhId: string;

  @Column({ name: 'tv_id', type: 'varchar', length: 50, nullable: true })
  tvId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 100 })
  deviceId: string;

  @Column({
    name: 'previous_device_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  previousDeviceId: string;

  @Column({
    name: 'action_type',
    type: 'varchar',
    length: 30,
    default: HouseholdDeviceAction.INSTALLED,
  })
  actionType: HouseholdDeviceAction;

  @Column({ name: 'action_date', nullable: true })
  actionDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @Column({
    name: 'field_executive_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  fieldExecutiveId: string;

  @Column({ name: 'performed_by_user_id', type: 'uuid', nullable: true })
  performedByUserId: string;

  @Column({ type: 'simple-json', nullable: true })
  notes: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne('Household', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hh_id' })
  household: any;

  @ManyToOne('Device', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device: any;
}
