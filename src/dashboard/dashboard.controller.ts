import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardOverviewResponseDto } from './dto/dashboard.dto.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';

@ApiTags('Dashboard')
@ApiCookieAuth('auth_session')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @RequirePermission('dashboard:read')
  @ApiOperation({ summary: 'Get overall dashboard analytics & KPI metrics' })
  @ApiResponse({
    status: 200,
    description: 'Return dashboard KPIs, online/offline counts, status breakdown, and alert feeds',
    type: DashboardOverviewResponseDto,
  })
  async getOverview(): Promise<DashboardOverviewResponseDto> {
    return this.dashboardService.getOverview();
  }
}

