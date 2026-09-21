import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Device, DeviceStatus } from '../database/entities/device.entity.js';
import { DeviceOperation } from '../database/entities/device-operation.entity.js';
import { Household } from '../database/entities/household.entity.js';
import { HouseholdMember } from '../database/entities/household-member.entity.js';
import { DeviceEvent } from '../database/entities/device-event.entity.js';
import { DashboardOverviewResponseDto } from './dto/dashboard.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(DeviceOperation)
    private readonly deviceOperationRepository: Repository<DeviceOperation>,
    @InjectRepository(Household)
    private readonly householdRepository: Repository<Household>,
    @InjectRepository(HouseholdMember)
    private readonly householdMemberRepository: Repository<HouseholdMember>,
    @InjectRepository(DeviceEvent)
    private readonly deviceEventRepository: Repository<DeviceEvent>,
  ) {}

  async getOverview(): Promise<DashboardOverviewResponseDto> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalDevices,
      installedDevices,
      uninstalledDevices,
      decommissionedDevices,
      onlineDevicesToday,
      offlineDevicesToday,
      totalHouseholds,
      totalMembers,
      totalEventsToday,
      rawStatusCounts,
      rawEventSummary,
      recentAlerts,
    ] = await Promise.all([
      // 1. Total devices
      this.deviceRepository.count(),

      // 2. Installed devices
      this.deviceRepository.createQueryBuilder('d')
        .where('d.currentHhId IS NOT NULL OR d.status = :installed', { installed: 'installed' })
        .getCount(),

      // 3. Uninstalled/Manufactured devices
      this.deviceRepository.createQueryBuilder('d')
        .where('d.status IN (:...statuses)', { statuses: ['manufactured', 'uninstalled'] })
        .andWhere('d.currentHhId IS NULL')
        .getCount(),

      // 4. Decommissioned devices
      this.deviceRepository.count({ where: { status: 'decommissioned' } }),

      // 5. Online devices today (lastSeenAt within 24h)
      this.deviceOperationRepository.count({
        where: { lastSeenAt: MoreThanOrEqual(twentyFourHoursAgo) },
      }),

      // 6. Offline installed devices today
      this.deviceRepository.createQueryBuilder('device')
        .leftJoin('device.operation', 'op')
        .where('(device.currentHhId IS NOT NULL OR device.status = :installed)', { installed: 'installed' })
        .andWhere('(op.lastSeenAt IS NULL OR op.lastSeenAt < :twentyFourHoursAgo)', { twentyFourHoursAgo })
        .getCount(),

      // 7. Total households
      this.householdRepository.count(),

      // 8. Total members
      this.householdMemberRepository.count(),

      // 9. Total events today
      this.deviceEventRepository.count({
        where: { recordedAt: MoreThanOrEqual(startOfDay) },
      }),

      // 10. Device status breakdown
      this.deviceRepository.createQueryBuilder('d')
        .select('d.status', 'status')
        .addSelect('COUNT(d.deviceId)', 'count')
        .groupBy('d.status')
        .getRawMany(),

      // 11. Event summary today by eventTypeKey
      this.deviceEventRepository.createQueryBuilder('e')
        .select('e.eventTypeKey', 'eventTypeKey')
        .addSelect('COUNT(e.id)', 'count')
        .where('e.recordedAt >= :startOfDay', { startOfDay })
        .groupBy('e.eventTypeKey')
        .getRawMany(),

      // 12. Recent security & system alerts (latest 10)
      this.deviceEventRepository.createQueryBuilder('e')
        .where('e.eventTypeKey IN (:...alertKeys)', {
          alertKeys: [
            'MEDIA_TV_PLUG_TAMPER',
            'NETWORK_WIFI_DISCONNECTED',
            'MEDIA_TV_PLUG_LINK_LOST',
            'DEVICE_DECOMMISSIONED',
          ],
        })
        .orderBy('e.recordedAt', 'DESC')
        .take(10)
        .getMany(),
    ]);

    // Format status breakdown
    const deviceStatusBreakdown: Record<string, number> = {};
    for (const row of rawStatusCounts) {
      deviceStatusBreakdown[row.status] = parseInt(row.count, 10);
    }

    // Format event summary today
    const eventSummaryToday: Record<string, number> = {};
    for (const row of rawEventSummary) {
      eventSummaryToday[row.eventTypeKey] = parseInt(row.count, 10);
    }

    return {
      kpis: {
        totalDevices,
        installedDevices,
        uninstalledDevices,
        decommissionedDevices,
        onlineDevicesToday,
        offlineDevicesToday,
        totalHouseholds,
        totalMembers,
        totalEventsToday,
      },
      deviceStatusBreakdown,
      eventSummaryToday,
      recentAlerts: recentAlerts.map((e) => ({
        id: e.id,
        hhId: e.hhId,
        deviceId: e.deviceId,
        eventTypeKey: e.eventTypeKey,
        recordedAt: e.recordedAt,
        metrics: e.metrics,
      })),
    };
  }
}
