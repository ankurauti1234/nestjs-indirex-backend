import { ApiProperty } from '@nestjs/swagger';

export class DashboardOverviewResponseDto {
  @ApiProperty({ description: 'Summary KPI counters' })
  kpis: {
    totalDevices: number;
    installedDevices: number;
    uninstalledDevices: number;
    decommissionedDevices: number;
    onlineDevicesToday: number;
    offlineDevicesToday: number;
    totalHouseholds: number;
    totalMembers: number;
    totalEventsToday: number;
  };

  @ApiProperty({ description: 'Device counts broken down by status' })
  deviceStatusBreakdown: Record<string, number>;

  @ApiProperty({ description: 'Event counts today grouped by event type key' })
  eventSummaryToday: Record<string, number>;

  @ApiProperty({ description: 'Recent security & system alert events' })
  recentAlerts: Array<{
    id: string;
    hhId: string;
    deviceId: string;
    eventTypeKey: string;
    recordedAt: Date;
    metrics: Record<string, any>;
  }>;
}

