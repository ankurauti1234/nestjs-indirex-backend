# Developer & AI Agent Guide (`AGENT.md`)

This guide outlines architectural patterns, response envelope standards, universal pagination, dynamic RBAC standards, audit logging, normalized IoT device entities, Household/Member/TV structures, Device Batches, and Device Event time-series models in the `indirex-backend` repository.

> [!IMPORTANT]
> **MANDATORY FEATURE & API DOCUMENTATION RULE**:
> Whenever a developer or AI agent adds, modifies, or deprecates a database entity, feature, or REST API endpoint, they **MUST IMMEDIATELY UPDATE [FEATURE_API_LIST.md](file:///home/ankur/workspace/office/applications/indirex-backend/FEATURE_API_LIST.md)**.
> Never introduce code changes or endpoints without updating `FEATURE_API_LIST.md`.

---

## 1. Architecture Overview

- **Framework**: NestJS (TypeScript)
- **Database / ORM**: PostgreSQL with TypeORM (TimescaleDB hypertable compatible)
- **Database Schema**: Isolated PostgreSQL schema `indirex` configured via `DB_SCHEMA=indirex` (`searchPath: ['indirex', 'public']`).
- **Authentication**: Cookie-based session authentication (`express-session`, Passport.js).
- **Authorization**: Dynamic, Database-Driven Role-Based Access Control (RBAC) with fine-grained permissions. Zero hardcoded role checks (`if (role === 'admin')` is forbidden).
- **Response Format**: Global `TransformInterceptor` wrapping all outputs into standard `{ success, statusCode, message, data, meta }` envelope structure.
- **Error Format**: Global `HttpExceptionFilter` formatting exceptions into standard `{ success: false, statusCode, message, error, timestamp, path }`.
- **Audit Logging**: Automatic HTTP request/response interceptor capturing caller metadata, payload (sensitive fields redacted), and status codes.
- **API Documentation**: Swagger UI served at `/docs`.

---

## 2. API Response & Pagination Standards

### Success Response Envelopes
1. **Single Object / Action Response**:
   ```json
   {
     "success": true,
     "statusCode": 200,
     "data": { ... }
   }
   ```
2. **Paginated Collection Response**:
   ```json
   {
     "success": true,
     "statusCode": 200,
     "data": [ ... ],
     "meta": {
       "page": 1,
       "limit": 10,
       "totalItems": 45,
       "totalPages": 5,
       "hasNextPage": true,
       "hasPreviousPage": false
     }
   }
   ```

### Shared Pagination Query Parameters (`PaginationQueryDto`)
All collection endpoints (`GET /devices`, `GET /users`, `GET /households`, `GET /households/:hhId/members`, `GET /households/:hhId/tvs`, `GET /device-batches`, `GET /field-executives`, `GET /audit-logs`) accept:
- `page` (number, default: `1`)
- `limit` (number, default: `10`, max: `100`)
- `search` (string keyword search)
- `sortBy` (string column name, default: `recordedAt` for events, `createdAt` for others)
- `sortOrder` (`ASC` | `DESC`, default: `DESC`)

---

## 3. Normalized Entity & Event Architecture

### ESM Circular Dependency Prevention
- **Rule**: In TypeORM entity relationship decorators, use string targets (e.g. `@ManyToOne('User')`, `@ManyToMany('Role')`, `@OneToMany('HouseholdMember')`, `@OneToMany('HouseholdTv')`) instead of explicit class references `() => User`.
- **Imports**: Import entity types using `import type { User } from './user.entity'` when type annotations are needed.

### High-Frequency Device Events Architecture (TimescaleDB Ready)
1. **`EventType` (`event_types`)**: Master event catalog (`id` 1..24, `name` e.g. `DEVICE_INSTALLED`, `DEVICE_BOOTED`, `DEVICE_HEARTBEAT`, `MEDIA_TV_ON`, `MEDIA_TV_OFF`, `MEDIA_AUDIO_FINGERPRINT`).
   - **Endpoints**: `GET /event-types`, `POST /event-types`, `PATCH /event-types/:id`, `DELETE /event-types/:id`.
   - **RBAC**: Write permissions (`POST`, `PATCH`, `DELETE`) restricted to `Super Admin`, `Admin`, and `Developer` roles (`event_types:write`). Reading (`GET`) permitted for all authenticated users (`event_types:read`).
2. **`DeviceEvent` (`device_events`)**: Time-series telemetry events.
   - **Endpoint**: `GET /device-events` (supports `hhId`, `deviceId`, `eventTypeId`, `eventTypeKey`, `startDate`, `endDate`, `search`, pagination; defaults to `recordedAt DESC`).
   - **Compound Time-Series Indexes**: `(hhId, recordedAt)`, `(deviceId, recordedAt)`, `(eventTypeKey, recordedAt)`, `(eventTypeId, recordedAt)`.

### Device Batches Management (`device_batches`, `device_batch_items`)
- **`SHARED`**: Devices can belong to multiple shared batches.
- **`EXCLUSIVE`**: Devices can belong to at most one active exclusive batch (candidate API `GET /device-batches/candidates?batchType=EXCLUSIVE` excludes active exclusive devices).
- **`GLOBAL`**: System-wide admin batches (`device_batches:write_global` required for creation).

### Household & Multi-TV Architecture
- **`Household` (`households`)**: Master household (`hhId` PK, `region`, `totalTvs` dynamic count of TVs in `household_tvs`, max 5 TVs limit per household).
- **`HouseholdMember` (`household_members`)**: Scoped member records (`M1`, `M2`...).
- **`HouseholdTv` (`household_tvs`)**: Scoped TV sets (`TV1`, `TV2`... up to max 5 TVs per household). Linked to `installedDeviceId` (`devices.device_id`).

### Dashboard Analytics & KPI Engine
- **Endpoint**: `GET /dashboard/overview`
- **Metrics Payload**: Returns `{ kpis, deviceStatusBreakdown, eventSummaryToday, recentAlerts }`.

---

## 4. Dynamic RBAC & Permissions Framework

Every route requiring authorization must use NestJS Guards and the `@RequirePermission` decorator:

```typescript
@UseGuards(AuthenticatedGuard, RbacGuard)
@RequirePermission('households:read')
@Get('households')
async findAll(@Query() queryDto: HouseholdQueryDto) {
  return this.householdsService.findAll(queryDto);
}
```

---

## 5. Step-by-Step: Adding a New Entity & API

1. **Entity**: Place entity in `src/database/entities/<feature>.entity.ts` using string relations. Export in `entities/index.ts` and register in `database.module.ts`.
2. **RBAC**: Seed permissions in `rbac-seeder.service.ts` and assign to default roles.
3. **DTOs**: Create request DTOs extending `PaginationQueryDto` for search/list endpoints.
4. **Service**: Use `paginateQueryBuilder(qb, queryDto)` for list endpoints.
5. **Controller**: Annotate `@ApiTags`, `@UseGuards(AuthenticatedGuard, RbacGuard)`, `@RequirePermission`.
6. **Test**: Write e2e tests in `test/` verifying envelope response fields (`res.body.success`, `res.body.data`, `res.body.meta`).
7. **Document**: Update [FEATURE_API_LIST.md](file:///home/ankur/workspace/office/applications/indirex-backend/FEATURE_API_LIST.md) with all new endpoints, HTTP methods, permissions, and entity schemas.

---

## 6. Verification Commands

```bash
# Compile and build the application
npm run build

# Run full unit and integration test suite
npm test
```
