import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity.js';

import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';
import { paginateQueryBuilder } from '../common/utils/pagination.util.js';

export interface CreateAuditLogData {
  userId?: string | null;
  userEmail?: string | null;
  action?: string | null;
  method: string;
  route: string;
  statusCode: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  payload?: Record<string, any> | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createLog(data: CreateAuditLogData) {
    try {
      const log = this.auditLogRepository.create(data);
      return await this.auditLogRepository.save(log);
    } catch (err) {
      // Non-blocking: audit log save errors should not crash the main request flow
      console.error('Failed to save audit log:', err);
      return null;
    }
  }

  async findAll(queryDto: AuditLogQueryDto = new AuditLogQueryDto()) {
    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (queryDto.method) {
      qb.andWhere('audit.method = :method', { method: queryDto.method.toUpperCase() });
    }

    if (queryDto.statusCode) {
      qb.andWhere('audit.statusCode = :statusCode', { statusCode: queryDto.statusCode });
    }

    if (queryDto.userId) {
      qb.andWhere('audit.userId = :userId', { userId: queryDto.userId });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(audit.route LIKE :search OR audit.userEmail LIKE :search OR audit.ipAddress LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `audit.${queryDto.sortBy}` : 'audit.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async findOne(id: string) {
    const log = await this.auditLogRepository.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log entry with ID ${id} not found`);
    }
    return log;
  }
}

