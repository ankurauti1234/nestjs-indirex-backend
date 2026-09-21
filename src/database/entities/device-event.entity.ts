import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { EventType } from './event-type.entity.js';

@Entity('device_events')
@Index(['hhId', 'recordedAt'])
@Index(['deviceId', 'recordedAt'])
@Index(['eventTypeKey', 'recordedAt'])
@Index(['eventTypeId', 'recordedAt'])
@Index(['hhId', 'eventTypeId', 'recordedAt'])
@Index(['deviceId', 'eventTypeId', 'recordedAt'])
export class DeviceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'hh_id', type: 'varchar' })
  hhId: string;

  @Index()
  @Column({ name: 'device_id', type: 'varchar' })
  deviceId: string;

  @Index()
  @Column({ name: 'event_type_id', type: 'integer', nullable: true })
  eventTypeId?: number;

  @ManyToOne('EventType', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'event_type_id' })
  eventType?: EventType;

  @Index()
  @Column({ name: 'event_type_key', type: 'varchar', default: 'telemetry' })
  eventTypeKey: string;

  @Column({ type: 'simple-json' })
  metrics: Record<string, any>;

  @Index()
  @Column({ name: 'recorded_at' })
  recordedAt: Date;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

