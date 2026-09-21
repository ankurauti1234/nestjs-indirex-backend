import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import type { Role } from './role.entity.js';

@Entity('permissions')
@Index(['resource', 'action'])
@Index(['httpMethod', 'routePath'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100 })
  resource: string;

  @Column({ length: 50 })
  action: string;

  @Column({ name: 'http_method', length: 10, nullable: true })
  httpMethod: string;

  @Column({ name: 'route_path', length: 255, nullable: true })
  routePath: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany('Role', (role: any) => role.permissions)
  roles: Role[];
}

