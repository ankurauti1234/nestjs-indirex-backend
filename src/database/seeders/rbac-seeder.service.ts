import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, Permission, EventType, Region } from '../entities/index.js';

@Injectable()
export class RbacSeederService implements OnModuleInit {
  private readonly logger = new Logger(RbacSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(EventType)
    private readonly eventTypeRepository: Repository<EventType>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
  ) {}

  async onModuleInit() {
    await this.seedPermissionsAndRoles();
    await this.seedEventTypes();
    await this.seedDefaultRegions();
  }

  async seedDefaultRegions() {
    const defaultRegions = [
      { name: 'Yerevan Central', code: 'AM-YEV', description: 'Central Capital Metropolitan Region' },
      { name: 'Shirak', code: 'AM-SHR', description: 'Northern Gyumri District' },
      { name: 'Lori', code: 'AM-LOR', description: 'Vanadzor Region' },
      { name: 'Syunik', code: 'AM-SYU', description: 'Southern Kapan District' },
      { name: 'Kotayk', code: 'AM-KOT', description: 'Abovyan & Hrazdan Suburbs' },
    ];

    for (const regData of defaultRegions) {
      let reg = await this.regionRepository.findOne({ where: { name: regData.name } });
      if (!reg) {
        reg = this.regionRepository.create(regData);
        await this.regionRepository.save(reg);
        this.logger.log(`Created default region: ${reg.name}`);
      }
    }
  }

  async seedEventTypes() {
    const defaultTypes = [
      { id: 1, name: 'DEVICE_INSTALLED', description: 'Device initial installation completed', category: 'device' },
      { id: 2, name: 'DEVICE_BOOTED', description: 'Device boot / startup sequence completed', category: 'device' },
      { id: 3, name: 'DEVICE_HEARTBEAT', description: 'Periodic device liveness ping', category: 'device' },
      { id: 4, name: 'DEVICE_INPUT_TYPE', description: 'Device input mode or source type change', category: 'device' },
      { id: 5, name: 'DEVICE_DECOMMISSIONED', description: 'Device decommissioned or unlinked', category: 'device' },
      { id: 6, name: 'NETWORK_WIFI_CONNECTED', description: 'WiFi network connection established', category: 'network' },
      { id: 7, name: 'NETWORK_WIFI_DISCONNECTED', description: 'WiFi network disconnected', category: 'network' },
      { id: 8, name: 'SYSTEM_INFO_REPORTED', description: 'System health and info payload reported', category: 'system' },
      { id: 9, name: 'SYSTEM_MEMORY_REPORTED', description: 'RAM / Storage consumption metrics reported', category: 'system' },
      { id: 10, name: 'POWER_HAT_STATUS', description: 'Power HAT module status / power event', category: 'hardware' },
      { id: 11, name: 'OTA_BUNDLE_STATUS', description: 'OTA software update bundle status', category: 'ota' },
      { id: 12, name: 'PERIPHERAL_USB_INPUT', description: 'USB peripheral input event', category: 'peripheral' },
      { id: 13, name: 'AUDIENCE_MEMBER_DECLARED', description: 'Household member presence / viewing declared', category: 'audience' },
      { id: 14, name: 'AUDIENCE_GUEST_DECLARED', description: 'Guest presence / viewing declared', category: 'audience' },
      { id: 15, name: 'MEDIA_TV_ON', description: 'Television power state changed to ON', category: 'media' },
      { id: 16, name: 'MEDIA_TV_OFF', description: 'Television power state changed to OFF', category: 'media' },
      { id: 17, name: 'MEDIA_TV_PLUG_LINK_LOST', description: 'Smart plug link to TV lost', category: 'media' },
      { id: 18, name: 'MEDIA_TV_PLUG_LINK_RESTORED', description: 'Smart plug link to TV restored', category: 'media' },
      { id: 19, name: 'MEDIA_TV_PLUG_TAMPER', description: 'Smart plug tamper alert', category: 'media' },
      { id: 20, name: 'MEDIA_TV_PLUG_TAMPER_CLEARED', description: 'Smart plug tamper condition cleared', category: 'media' },
      { id: 21, name: 'MEDIA_YOUTUBE_DETECTED', description: 'YouTube content playback detected', category: 'media' },
      { id: 22, name: 'MEDIA_AUDIO_FINGERPRINT', description: 'Audio watermark / fingerprint match payload', category: 'media' },
      { id: 23, name: 'MEDIA_IMAGE_RECOGNIZED', description: 'On-screen image / logo recognized', category: 'media' },
      { id: 24, name: 'MEDIA_IMAGE_UNRECOGNIZED', description: 'Unrecognized on-screen image payload', category: 'media' },
    ];

    const targetNames = defaultTypes.map((t) => t.name);
    await this.eventTypeRepository
      .createQueryBuilder()
      .delete()
      .where('name NOT IN (:...names)', { names: targetNames })
      .execute();

    for (const typeData of defaultTypes) {
      let et = await this.eventTypeRepository.findOne({ where: { id: typeData.id } });
      if (!et) {
        et = this.eventTypeRepository.create(typeData);
        await this.eventTypeRepository.save(et);
        this.logger.log(`Created default event type [ID: ${et.id}]: ${et.name}`);
      } else {
        et.name = typeData.name;
        et.description = typeData.description;
        et.category = typeData.category;
        await this.eventTypeRepository.save(et);
      }
    }
  }

  async seedPermissionsAndRoles() {
    const defaultPermissions = [
      { name: 'users:read', description: 'Read user profiles and list users', resource: 'users', action: 'read', httpMethod: 'GET', routePath: '/users' },
      { name: 'users:write', description: 'Update user profiles and create users', resource: 'users', action: 'write', httpMethod: 'PATCH', routePath: '/users/:id' },
      { name: 'users:delete', description: 'Deactivate/delete users', resource: 'users', action: 'delete', httpMethod: 'DELETE', routePath: '/users/:id' },
      { name: 'roles:read', description: 'View roles and permissions', resource: 'roles', action: 'read', httpMethod: 'GET', routePath: '/roles' },
      { name: 'roles:write', description: 'Create and update roles', resource: 'roles', action: 'write', httpMethod: 'POST', routePath: '/roles' },
      { name: 'roles:delete', description: 'Delete roles', resource: 'roles', action: 'delete', httpMethod: 'DELETE', routePath: '/roles/:id' },
      { name: 'permissions:read', description: 'View available permissions', resource: 'permissions', action: 'read', httpMethod: 'GET', routePath: '/permissions' },
      { name: 'permissions:write', description: 'Create and edit permissions', resource: 'permissions', action: 'write', httpMethod: 'POST', routePath: '/permissions' },
      { name: 'permissions:delete', description: 'Delete permissions', resource: 'permissions', action: 'delete', httpMethod: 'DELETE', routePath: '/permissions/:id' },
      // Device Permissions
      { name: 'devices:read', description: 'List and view device details', resource: 'devices', action: 'read', httpMethod: 'GET', routePath: '/devices' },
      { name: 'devices:write_status', description: 'Update device active status', resource: 'devices', action: 'write_status', httpMethod: 'PATCH', routePath: '/devices/:id/status' },
      { name: 'devices:write', description: 'Update full device information', resource: 'devices', action: 'write', httpMethod: 'PATCH', routePath: '/devices/:id' },
      { name: 'devices:create', description: 'Automated registration of devices', resource: 'devices', action: 'create', httpMethod: 'POST', routePath: '/devices' },
      { name: 'devices:delete', description: 'Delete or deactivate devices', resource: 'devices', action: 'delete', httpMethod: 'DELETE', routePath: '/devices/:id' },
      // Audit Logs Permissions
      { name: 'audit_logs:read', description: 'View system audit logs', resource: 'audit_logs', action: 'read', httpMethod: 'GET', routePath: '/audit-logs' },
      // Households Permissions
      { name: 'households:read', description: 'View households and members', resource: 'households', action: 'read', httpMethod: 'GET', routePath: '/households' },
      { name: 'households:write', description: 'Create, update, and manage household TVs and members', resource: 'households', action: 'write', httpMethod: 'POST', routePath: '/households' },
      // Device Events Permissions
      { name: 'events:read', description: 'View and filter device events', resource: 'events', action: 'read', httpMethod: 'GET', routePath: '/device-events' },
      // Event Types Permissions
      { name: 'event_types:read', description: 'View event types catalog', resource: 'event_types', action: 'read', httpMethod: 'GET', routePath: '/event-types' },
      { name: 'event_types:write', description: 'Create, edit and delete event types', resource: 'event_types', action: 'write', httpMethod: 'POST', routePath: '/event-types' },
      // Dashboard Analytics Permissions
      { name: 'dashboard:read', description: 'View overall dashboard metrics and KPIs', resource: 'dashboard', action: 'read', httpMethod: 'GET', routePath: '/dashboard/overview' },
      // Regions Catalog Permissions
      { name: 'regions:read', description: 'View regions catalog', resource: 'regions', action: 'read', httpMethod: 'GET', routePath: '/regions' },
      { name: 'regions:write', description: 'Create, edit and delete regions', resource: 'regions', action: 'write', httpMethod: 'POST', routePath: '/regions' },
      // Field Executives Permissions
      { name: 'field_executives:read', description: 'View field executive profiles', resource: 'field_executives', action: 'read', httpMethod: 'GET', routePath: '/field-executives' },
      { name: 'field_executives:write', description: 'Create, edit, change status, and delete field executives', resource: 'field_executives', action: 'write', httpMethod: 'POST', routePath: '/field-executives' },
      // Device Batches Permissions
      { name: 'device_batches:read', description: 'View device batches and candidate devices', resource: 'device_batches', action: 'read', httpMethod: 'GET', routePath: '/device-batches' },
      { name: 'device_batches:write', description: 'Create, edit, and manage device batches', resource: 'device_batches', action: 'write', httpMethod: 'POST', routePath: '/device-batches' },
      { name: 'device_batches:write_global', description: 'Create and manage system-wide global device batches', resource: 'device_batches', action: 'write_global', httpMethod: 'POST', routePath: '/device-batches' },
    ];

    const savedPermissions: Record<string, Permission> = {};

    for (const permData of defaultPermissions) {
      let perm = await this.permissionRepository.findOne({ where: { name: permData.name } });
      if (!perm) {
        perm = this.permissionRepository.create(permData);
        perm = await this.permissionRepository.save(perm);
        this.logger.log(`Created default permission: ${perm.name}`);
      } else {
        perm.description = permData.description;
        perm.resource = permData.resource;
        perm.action = permData.action;
        perm.httpMethod = permData.httpMethod;
        perm.routePath = permData.routePath;
        perm = await this.permissionRepository.save(perm);
      }
      savedPermissions[perm.name] = perm;
    }

    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'System administrator with full access',
        isSystem: true,
        permissionNames: Object.keys(savedPermissions),
      },
      {
        name: 'Admin',
        description: 'Administrator with full management access',
        isSystem: true,
        permissionNames: [
          'users:read',
          'users:write',
          'roles:read',
          'permissions:read',
          'devices:read',
          'devices:write_status',
          'devices:write',
          'devices:create',
          'devices:delete',
          'audit_logs:read',
          'households:read',
          'households:write',
          'events:read',
          'event_types:read',
          'event_types:write',
          'dashboard:read',
          'regions:read',
          'regions:write',
          'field_executives:read',
          'field_executives:write',
          'device_batches:read',
          'device_batches:write',
          'device_batches:write_global',
        ],
      },
      {
        name: 'Developer',
        description: 'Developer role with device view & status change permissions',
        isSystem: true,
        permissionNames: [
          'devices:read',
          'devices:write_status',
          'households:read',
          'households:write',
          'events:read',
          'event_types:read',
          'event_types:write',
          'dashboard:read',
          'regions:read',
          'regions:write',
          'field_executives:read',
          'field_executives:write',
          'device_batches:read',
          'device_batches:write',
        ],
      },
      {
        name: 'User',
        description: 'Standard user role',
        isSystem: true,
        permissionNames: [
          'households:read',
          'events:read',
          'event_types:read',
          'dashboard:read',
          'regions:read',
          'device_batches:read',
        ],
      },
    ];

    const savedRoles: Record<string, Role> = {};

    for (const roleData of defaultRoles) {
      let role = await this.roleRepository.findOne({
        where: { name: roleData.name },
        relations: { permissions: true },
      });

      const targetPermissions = roleData.permissionNames
        .map((name) => savedPermissions[name])
        .filter(Boolean);

      if (!role) {
        role = this.roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
          permissions: targetPermissions,
        });
        role = await this.roleRepository.save(role);
        this.logger.log(`Created default role: ${role.name}`);
      } else {
        role.permissions = targetPermissions;
        role = await this.roleRepository.save(role);
      }
      savedRoles[role.name] = role;
    }

    // Seed/Ensure Super Admin user: development@inditronics.com
    const adminEmail = 'development@inditronics.com';
    const adminPassword = 'Inditronics@69420';

    let superAdminUser = await this.userRepository.findOne({
      where: { email: adminEmail },
      relations: { roles: true },
    });

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    if (!superAdminUser) {
      superAdminUser = this.userRepository.create({
        name: 'Super Admin',
        email: adminEmail,
        passwordHash,
        isEmailVerified: true,
        roles: [savedRoles['Super Admin']],
      });
      await this.userRepository.save(superAdminUser);
      this.logger.log(`Created default Super Admin user: ${adminEmail}`);
    } else {
      superAdminUser.passwordHash = passwordHash;
      superAdminUser.isEmailVerified = true;
      if (!superAdminUser.roles?.some((r) => r.name === 'Super Admin')) {
        superAdminUser.roles = [...(superAdminUser.roles || []), savedRoles['Super Admin']];
      }
      await this.userRepository.save(superAdminUser);
      this.logger.log(`Updated Super Admin user credentials: ${adminEmail}`);
    }
  }
}
