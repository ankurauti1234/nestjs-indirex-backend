import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';

@ApiTags('Audit Logs')
@ApiCookieAuth('auth_session')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermission('audit_logs:read')
  @ApiOperation({ summary: 'List system audit logs with pagination and filters (Requires audit_logs:read permission / Admin & Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit log entries' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async findAll(@Query() queryDto: AuditLogQueryDto) {
    return this.auditLogService.findAll(queryDto);
  }

  @Get(':id')
  @RequirePermission('audit_logs:read')
  @ApiOperation({ summary: 'Get audit log entry details by ID (Requires audit_logs:read permission / Admin & Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit log entry details' })
  @ApiResponse({ status: 404, description: 'Audit log entry not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogService.findOne(id);
  }
}

