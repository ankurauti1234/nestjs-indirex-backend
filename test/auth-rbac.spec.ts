import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';

describe('Auth, Dynamic RBAC, Users & Devices Engine (E2E Integration)', () => {
  let app: INestApplication;
  let userAuthCookie: string;
  let devAuthCookie: string;
  let adminAuthCookie: string;
  let createdDeviceId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_TYPE = 'better-sqlite3';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication & Admin User Creation APIs', () => {
    it('Login Super Admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'development@inditronics.com',
          password: 'Inditronics@69420',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      const cookies = res.get('Set-Cookie') || [];
      adminAuthCookie = cookies.find((c: string) => c.includes('auth_session=')) || '';
    });

    it('POST /users - Create new standard user with Super Admin (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('john@example.com');
      expect(res.body.data.roles).toContain('User');
    });

    it('POST /auth/login - Authenticate newly created user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      const cookies = res.get('Set-Cookie') || [];
      userAuthCookie = cookies.find((c: string) => c.includes('auth_session=')) || '';
    });

    it('POST /users - Attempt creating user as Standard User (Expect 403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', [userAuthCookie])
        .send({
          name: 'Forbidden User',
          email: 'forbidden@example.com',
          password: 'Password123!',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(403);
    });

    it('POST /users - Attempt creating user unauthenticated (Expect 401 Unauthorized)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Unauth User',
          email: 'unauth@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('2. Developer Role Setup via Admin API', () => {
    it('Create Developer user with Super Admin and assign Developer role', async () => {
      // Find Developer role ID
      const rolesRes = await request(app.getHttpServer())
        .get('/roles')
        .set('Cookie', [adminAuthCookie])
        .expect(200);

      expect(rolesRes.body.success).toBe(true);
      expect(rolesRes.body.meta).toBeDefined();
      const devRole = rolesRes.body.data.find((r: any) => r.name === 'Developer');
      expect(devRole).toBeDefined();

      // Create user directly assigning Developer role ID
      const regRes = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: 'Alice Developer',
          email: 'dev@inditronics.com',
          password: 'DevPassword123!',
          roleIds: [devRole.id],
        })
        .expect(201);

      expect(regRes.body.success).toBe(true);
      expect(regRes.body.data.roles).toContain('Developer');

      // Login as Developer
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'dev@inditronics.com',
          password: 'DevPassword123!',
        })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
      const cookies = loginRes.get('Set-Cookie') || [];
      devAuthCookie = cookies.find((c: string) => c.includes('auth_session=')) || '';
    });
  });

  describe('3. Devices APIs & Role Boundary Tests', () => {
    it('POST /devices - Create device (Super Admin / System allowed)', async () => {
      const res = await request(app.getHttpServer())
        .post('/devices')
        .set('Cookie', [adminAuthCookie])
        .send({
          deviceId: 'DEV-1001',
          deviceName: 'Sensor Node 1',
          cpuSerial: 'CPU-SERIAL-001',
          environment: 'production',
          metadata: { location: 'Building A' },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deviceId).toBe('DEV-1001');
      expect(res.body.data.status).toBe('manufactured');
      createdDeviceId = res.body.data.deviceId;
    });

    it('POST /devices - Attempt device creation with Standard User (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/devices')
        .set('Cookie', [userAuthCookie])
        .send({
          deviceId: 'DEV-9999',
          deviceName: 'Forbidden Device',
        })
        .expect(403);
    });

    it('GET /devices - List devices with Developer role (Expect 200 OK & Paginated Meta)', async () => {
      const res = await request(app.getHttpServer())
        .get('/devices')
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((d: any) => d.deviceId === 'DEV-1001')).toBe(true);
    });

    it('GET /devices - Attempt listing devices with Standard User (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/devices')
        .set('Cookie', [userAuthCookie])
        .expect(403);
    });

    it('PATCH /devices/:id/status - Update status with Developer role (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/devices/${createdDeviceId}/status`)
        .set('Cookie', [devAuthCookie])
        .send({ status: 'active' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
    });

    it('PATCH /devices/:id - Attempt full device edit with Developer role (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/devices/${createdDeviceId}`)
        .set('Cookie', [devAuthCookie])
        .send({ deviceName: 'Unauthorized Edit' })
        .expect(403);
    });

    it('PATCH /devices/:id - Full device edit with Super Admin (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/devices/${createdDeviceId}`)
        .set('Cookie', [adminAuthCookie])
        .send({ deviceName: 'Sensor Node 1 Updated' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deviceName).toBe('Sensor Node 1 Updated');
    });

    it('POST /devices/:id/tokens - Issue provisioning token with Super Admin (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/tokens`)
        .set('Cookie', [adminAuthCookie])
        .send({ otpCode: '123456' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.provisioningTokens).toBeDefined();
      expect(res.body.data.provisioningTokens.length).toBeGreaterThan(0);
    });

    it('POST /devices/:id/certificates - Register AWS IoT Certificate with Super Admin (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/devices/${createdDeviceId}/certificates`)
        .set('Cookie', [adminAuthCookie])
        .send({
          certificateId: 'cert-1122334455',
          certificateArn: 'arn:aws:iot:us-east-1:123456789012:cert/cert-1122334455',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.certificates).toBeDefined();
      expect(res.body.data.certificates.length).toBeGreaterThan(0);
    });

    it('DELETE /devices/:id - Attempt device deletion with Developer role (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .delete(`/devices/${createdDeviceId}`)
        .set('Cookie', [devAuthCookie])
        .expect(403);
    });

    it('DELETE /devices/:id - Device deletion with Super Admin (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/devices/${createdDeviceId}`)
        .set('Cookie', [adminAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('removed successfully');
    });
  });

  describe('4. Audit Logging APIs & Access Control', () => {
    let capturedLogId: string;

    it('GET /audit-logs - Attempt accessing audit logs as Standard User (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Cookie', [userAuthCookie])
        .expect(403);
    });

    it('GET /audit-logs - Attempt accessing audit logs as Developer (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Cookie', [devAuthCookie])
        .expect(403);
    });

    it('GET /audit-logs - Access audit logs as Super Admin (Expect 200 OK & Paginated Meta)', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Cookie', [adminAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      capturedLogId = res.body.data[0].id;
    });

    it('GET /audit-logs/:id - Fetch single audit log detail with Super Admin (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/audit-logs/${capturedLogId}`)
        .set('Cookie', [adminAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(capturedLogId);
      expect(res.body.data.route).toBeDefined();
    });
  });

  describe('5. Households & Members Read-Only APIs', () => {
    it('GET /households - List households with pagination (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/households')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((h: any) => h.hhId === 'HH1000')).toBe(true);
    });

    it('GET /households/:hhId - Fetch single household detail (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/households/HH1000')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.hhId).toBe('HH1000');
      expect(res.body.data.members).toBeDefined();
      expect(res.body.data.members.length).toBeGreaterThan(0);
    });

    it('GET /households/:hhId/members - List members of household (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/households/HH1000/members')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((m: any) => m.memberId === 'M1')).toBe(true);
    });

    it('GET /households/:hhId/members/:memberId - Fetch specific member detail (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/households/HH1000/members/M1')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.hhId).toBe('HH1000');
      expect(res.body.data.memberId).toBe('M1');
    });

    it('GET /households/:hhId/tvs - List TV sets in household (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/households/HH1000/tvs')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((t: any) => t.tvId === 'TV1')).toBe(true);
      expect(res.body.data.some((t: any) => t.tvId === 'TV2')).toBe(true);
    });

    it('GET /households/:hhId/tvs/:tvId - Fetch single TV set detail', async () => {
      const res = await request(app.getHttpServer())
        .get('/households/HH1000/tvs/TV1')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tvId).toBe('TV1');
      expect(res.body.data.location).toBe('Living Room');
    });

    it('POST /households/:hhId/tvs - Add new TV set to household (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/households/HH1000/tvs')
        .set('Cookie', [adminAuthCookie])
        .send({
          tvId: 'TV3',
          location: 'Kitchen',
          brand: 'Xiaomi',
          screenSizeInches: 32,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tvId).toBe('TV3');
      expect(res.body.data.location).toBe('Kitchen');
    });

    it('PATCH /households/:hhId/tvs/:tvId - Update TV metadata (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/households/HH1000/tvs/TV3')
        .set('Cookie', [adminAuthCookie])
        .send({
          location: 'Kitchen Counter',
          brand: 'Sony',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.location).toBe('Kitchen Counter');
      expect(res.body.data.brand).toBe('Sony');
    });

    it('POST /households/:hhId/tvs - Enforce max 5 TVs limit per household (Expect 400 Bad Request on 6th TV)', async () => {
      // Add TV4 and TV5 to reach 5 TVs
      await request(app.getHttpServer())
        .post('/households/HH1000/tvs')
        .set('Cookie', [adminAuthCookie])
        .send({ tvId: 'TV4', location: 'Guest Room' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/households/HH1000/tvs')
        .set('Cookie', [adminAuthCookie])
        .send({ tvId: 'TV5', location: 'Patio' })
        .expect(201);

      // Attempt adding TV6 (Exceeding max 5 limit)
      const res = await request(app.getHttpServer())
        .post('/households/HH1000/tvs')
        .set('Cookie', [adminAuthCookie])
        .send({ tvId: 'TV6', location: 'Garage' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('reached the maximum allowed limit of 5 TV sets');
    });

    it('DELETE /households/:hhId/tvs/:tvId - Remove TV set from household (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/households/HH1000/tvs/TV3')
        .set('Cookie', [adminAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('6. Event Types Seed Integrity', () => {
    it('Verify 24 seeded EventType IDs are sequential integers (1..24)', async () => {
      const eventTypeRepo = app.get('EventTypeRepository');
      const eventTypes = await eventTypeRepo.find({ order: { id: 'ASC' } });

      expect(eventTypes.length).toBe(24);
      expect(typeof eventTypes[0].id).toBe('number');
      expect(eventTypes.find((e: any) => e.name === 'DEVICE_INSTALLED')?.id).toBe(1);
      expect(eventTypes.find((e: any) => e.name === 'DEVICE_BOOTED')?.id).toBe(2);
      expect(eventTypes.find((e: any) => e.name === 'DEVICE_HEARTBEAT')?.id).toBe(3);
      expect(eventTypes.find((e: any) => e.name === 'MEDIA_TV_ON')?.id).toBe(15);
      expect(eventTypes.find((e: any) => e.name === 'MEDIA_IMAGE_UNRECOGNIZED')?.id).toBe(24);
    });
  });

  describe('7. Device Events Query & Filtering APIs', () => {
    let createdEventId: string;

    beforeAll(async () => {
      const eventRepo = app.get('DeviceEventRepository');
      
      // Seed sample events with distinct timestamps and new event types
      const event1 = eventRepo.create({
        hhId: 'HH1000',
        deviceId: 'IM100042',
        eventTypeId: 1,
        eventTypeKey: 'DEVICE_INSTALLED',
        metrics: { installerId: 'TECH_01' },
        recordedAt: new Date('2026-09-15T10:00:00Z'),
      });
      const event2 = eventRepo.create({
        hhId: 'HH1000',
        deviceId: 'IM100042',
        eventTypeId: 15,
        eventTypeKey: 'MEDIA_TV_ON',
        metrics: { powerState: 'ON', channel: 5 },
        recordedAt: new Date('2026-09-16T08:00:00Z'),
      });
      const event3 = eventRepo.create({
        hhId: 'HH1001',
        deviceId: 'IM100043',
        eventTypeId: 19,
        eventTypeKey: 'MEDIA_TV_PLUG_TAMPER',
        metrics: { sensorTriggered: true },
        recordedAt: new Date('2026-09-14T12:00:00Z'),
      });

      const saved = await eventRepo.save([event1, event2, event3]);
      createdEventId = saved[1].id; // event2 (latest)
    });

    it('GET /device-events - Fetch events with default sorting (latest on top)', async () => {
      const res = await request(app.getHttpServer())
        .get('/device-events')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      
      // Verify recordedAt DESC sorting (latest event recordedAt is 2026-09-16T08:00:00Z)
      const dates = res.body.data.map((e: any) => new Date(e.recordedAt).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
    });

    it('GET /device-events - Filter by hhId and eventTypeId', async () => {
      const res = await request(app.getHttpServer())
        .get('/device-events?hhId=HH1000&eventTypeId=15')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].hhId).toBe('HH1000');
      expect(res.body.data[0].eventTypeId).toBe(15);
      expect(res.body.data[0].eventTypeKey).toBe('MEDIA_TV_ON');
    });

    it('GET /device-events - Filter by date range (startDate & endDate)', async () => {
      const res = await request(app.getHttpServer())
        .get('/device-events?startDate=2026-09-16T00:00:00Z&endDate=2026-09-16T23:59:59Z')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].eventTypeKey).toBe('MEDIA_TV_ON');
    });

    it('GET /device-events/:id - Fetch single device event detail (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/device-events/${createdEventId}`)
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdEventId);
      expect(res.body.data.eventTypeKey).toBe('MEDIA_TV_ON');
    });
  });

  describe('8. Event Types CRUD & Access Control APIs', () => {
    let createdTypeId: number;

    it('GET /event-types - Fetch all event types unpaginated (Expect 200 OK & Array)', async () => {
      const res = await request(app.getHttpServer())
        .get('/event-types')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(24);
      expect(res.body.meta).toBeUndefined(); // Unpaginated array
    });

    it('POST /event-types - Attempt creation as Standard User (Expect 403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/event-types')
        .set('Cookie', [userAuthCookie])
        .send({
          name: 'CUSTOM_TEST_EVENT',
          description: 'Test custom event',
          category: 'test',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(403);
    });

    it('POST /event-types - Create new event type as Developer (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/event-types')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'CUSTOM_TEST_EVENT',
          description: 'Test custom event by Developer',
          category: 'custom',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('CUSTOM_TEST_EVENT');
      expect(typeof res.body.data.id).toBe('number');
      createdTypeId = res.body.data.id;
    });

    it('PATCH /event-types/:id - Update event type as Developer (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/event-types/${createdTypeId}`)
        .set('Cookie', [devAuthCookie])
        .send({
          description: 'Updated custom event description',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Updated custom event description');
    });

    it('DELETE /event-types/:id - Attempt deletion as Standard User (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .delete(`/event-types/${createdTypeId}`)
        .set('Cookie', [userAuthCookie])
        .expect(403);
    });

    it('DELETE /event-types/:id - Delete event type as Developer (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/event-types/${createdTypeId}`)
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('deleted successfully');
    });
  });

  describe('9. Dashboard Analytics & KPI Overview APIs', () => {
    it('GET /dashboard/overview - Fetch dashboard KPIs and metrics (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/overview')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
      expect(typeof res.body.data.kpis.totalDevices).toBe('number');
      expect(typeof res.body.data.kpis.installedDevices).toBe('number');
      expect(typeof res.body.data.kpis.onlineDevicesToday).toBe('number');
      expect(typeof res.body.data.kpis.offlineDevicesToday).toBe('number');
      expect(typeof res.body.data.kpis.totalHouseholds).toBe('number');
      expect(typeof res.body.data.kpis.totalEventsToday).toBe('number');

      expect(res.body.data.deviceStatusBreakdown).toBeDefined();
      expect(res.body.data.eventSummaryToday).toBeDefined();
      expect(Array.isArray(res.body.data.recentAlerts)).toBe(true);
    });
  });

  describe('10. Regions Catalog & Access Control APIs', () => {
    let createdRegionId: number;

    it('GET /regions - List default seeded regions (Expect 200 OK & Array)', async () => {
      const res = await request(app.getHttpServer())
        .get('/regions')
        .set('Cookie', [userAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data.some((r: any) => r.name === 'Yerevan Central')).toBe(true);
    });

    it('POST /regions - Attempt creation as Standard User (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/regions')
        .set('Cookie', [userAuthCookie])
        .send({ name: 'Test Region' })
        .expect(403);
    });

    it('POST /regions - Create new region as Developer (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/regions')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'Tavush District',
          code: 'AM-TAV',
          description: 'Dilijan and Ijevan Region',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Tavush District');
      createdRegionId = res.body.data.id;
    });
  });

  describe('11. Field Executives Management & Multi-Region Assignment APIs', () => {
    let createdExecId: string;
    let createdExecUuid: string;

    it('POST /field-executives - Attempt creation as Standard User (Expect 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/field-executives')
        .set('Cookie', [userAuthCookie])
        .send({
          name: 'Forbidden Field Tech',
          phone: '+37499000000',
        })
        .expect(403);
    });

    it('POST /field-executives - Create Field Executive with multi-region assignment (Expect 201 Created & Auto FE1001 ID)', async () => {
      const res = await request(app.getHttpServer())
        .post('/field-executives')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'Arman Petrosyan',
          phone: '+37491123456',
          email: 'arman.tech@inditronics.am',
          regionIds: [1, 2],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.executiveId).toBe('FE1001');
      expect(res.body.data.name).toBe('Arman Petrosyan');
      expect(res.body.data.phone).toBe('+37491123456');
      expect(res.body.data.status).toBe('ACTIVE');
      expect(Array.isArray(res.body.data.regions)).toBe(true);
      expect(res.body.data.regions.length).toBe(2);

      createdExecId = res.body.data.executiveId;
      createdExecUuid = res.body.data.id;
    });

    it('GET /field-executives - List field executives with pagination & region filter (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/field-executives?regionId=1')
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((fe: any) => fe.executiveId === 'FE1001')).toBe(true);
    });

    it('GET /field-executives/:id - Fetch single executive detail by executiveId FE1001 (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/field-executives/${createdExecId}`)
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.executiveId).toBe('FE1001');
      expect(res.body.data.regions.length).toBe(2);
    });

    it('PATCH /field-executives/:id/status - Update executive status to INACTIVE (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/field-executives/${createdExecUuid}/status`)
        .set('Cookie', [devAuthCookie])
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INACTIVE');
    });

    it('DELETE /field-executives/:id - Delete field executive record as Developer (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/field-executives/${createdExecUuid}`)
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('deleted successfully');
    });
  });

  describe('12. Device Batches Management APIs (SHARED, EXCLUSIVE, GLOBAL)', () => {
    let globalBatchId: string;
    let sharedBatchId: string;
    let exclusiveBatchId: string;
    let testDeviceId1 = 'DEV-BATCH-001';
    let testDeviceId2 = 'DEV-BATCH-002';

    beforeAll(async () => {
      // Seed test devices for batch tests
      const deviceRepo = app.get('DeviceRepository');
      await deviceRepo.save([
        { deviceId: testDeviceId1, deviceName: 'Batch Test Meter 1', status: 'active' },
        { deviceId: testDeviceId2, deviceName: 'Batch Test Meter 2', status: 'active' },
      ]);
    });

    it('POST /device-batches - Standard User attempts GLOBAL batch creation (Expect 403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/device-batches')
        .set('Cookie', [userAuthCookie])
        .send({
          name: 'Unauthorized Global Batch',
          type: 'GLOBAL',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('POST /device-batches - Developer attempts GLOBAL batch creation (Expect 403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/device-batches')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'Developer Global Batch Attempt',
          type: 'GLOBAL',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('POST /device-batches - Super Admin creates GLOBAL batch (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/device-batches')
        .set('Cookie', [adminAuthCookie])
        .send({
          name: 'System Fleet Global Batch',
          description: 'Global master fleet batch created by SuperAdmin',
          type: 'GLOBAL',
          deviceIds: [testDeviceId1],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('GLOBAL');
      expect(res.body.data.deviceCount).toBe(1);
      globalBatchId = res.body.data.id;
    });

    it('POST /device-batches - Developer creates SHARED batch (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/device-batches')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'Shared Region Batch Alpha',
          type: 'SHARED',
          deviceIds: [testDeviceId1, testDeviceId2],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('SHARED');
      expect(res.body.data.deviceCount).toBe(2);
      sharedBatchId = res.body.data.id;
    });

    it('POST /device-batches - Developer creates second SHARED batch with same devices (Expect 201 Created - Multi-batch Allowed)', async () => {
      const res = await request(app.getHttpServer())
        .post('/device-batches')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'Shared Region Batch Beta',
          type: 'SHARED',
          deviceIds: [testDeviceId1],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('SHARED');
      expect(res.body.data.deviceCount).toBe(1);
    });

    it('POST /device-batches - Developer creates EXCLUSIVE batch (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/device-batches')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'Exclusive Lot Wave 1',
          type: 'EXCLUSIVE',
          deviceIds: [testDeviceId1],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('EXCLUSIVE');
      expect(res.body.data.deviceCount).toBe(1);
      exclusiveBatchId = res.body.data.id;
    });

    it('GET /device-batches/candidates?batchType=EXCLUSIVE - Candidates list filters out active EXCLUSIVE device', async () => {
      const res = await request(app.getHttpServer())
        .get('/device-batches/candidates?batchType=EXCLUSIVE')
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      const returnedDeviceIds = res.body.data.map((d: any) => d.deviceId);
      expect(returnedDeviceIds).not.toContain(testDeviceId1);
      expect(returnedDeviceIds).toContain(testDeviceId2);
    });

    it('POST /device-batches - Attempt creating second EXCLUSIVE batch with already assigned device (Expect 409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/device-batches')
        .set('Cookie', [devAuthCookie])
        .send({
          name: 'Conflicting Exclusive Batch',
          type: 'EXCLUSIVE',
          deviceIds: [testDeviceId1],
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already assigned to an active EXCLUSIVE batch');
    });

    it('GET /device-batches - List device batches as Developer (Expect 200 OK & GLOBAL batch visible)', async () => {
      const res = await request(app.getHttpServer())
        .get('/device-batches')
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      const types = res.body.data.map((b: any) => b.type);
      expect(types).toContain('GLOBAL');
      expect(types).toContain('SHARED');
      expect(types).toContain('EXCLUSIVE');
    });

    it('GET /device-batches/:id - Fetch single batch details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/device-batches/${exclusiveBatchId}`)
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(exclusiveBatchId);
      expect(res.body.data.deviceCount).toBe(1);
    });

    it('DELETE /device-batches/:id/devices - Remove device from EXCLUSIVE batch (Frees up device)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/device-batches/${exclusiveBatchId}/devices`)
        .set('Cookie', [devAuthCookie])
        .send({ deviceIds: [testDeviceId1] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deviceCount).toBe(0);
    });

    it('POST /device-batches/:id/devices - Add freed device to another EXCLUSIVE batch (Expect 201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/device-batches/${exclusiveBatchId}/devices`)
        .set('Cookie', [devAuthCookie])
        .send({ deviceIds: [testDeviceId2] })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deviceCount).toBe(1);
    });

    it('DELETE /device-batches/:id - Delete device batch (Expect 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/device-batches/${sharedBatchId}`)
        .set('Cookie', [devAuthCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
