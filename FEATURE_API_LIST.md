# Feature & REST API Inventory (`FEATURE_API_LIST.md`)

This document serves as the master catalog of all database entities, operational features, and REST API endpoints implemented in the `indirex-backend` application.

> [!IMPORTANT]
> **Maintenance Rule for Developers & AI Agents**:
> Whenever a new feature, database entity, or REST API endpoint is added or modified in this codebase, you **MUST** update this file to keep it complete and up to date.

---

## 1. Global Standards & Cross-Cutting Features

- **Database Schema**: Isolated schema `indirex` (`DB_SCHEMA=indirex`).
- **Response Envelope**: Wrapped in `{ success, statusCode, message, data, meta }`.
- **Universal Pagination**: Shared query DTO (`page`, `limit`, `search`, `sortBy`, `sortOrder`).
- **Dynamic RBAC**: Fine-grained, database-backed permissions checked via NestJS `RbacGuard` and `@RequirePermission('resource:action')`.
- **Audit Logging**: Interceptor logging caller identity, IP, route, request parameters, and response status (`/audit-logs`).

---

## 2. API Endpoint Matrix by Module

### A. Authentication & Session (`/auth`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Authenticate user with email/password; returns HTTP-only session cookie. |
| `POST` | `/auth/logout` | Authenticated | Destroy current active user session. |
| `GET` | `/auth/me` | Authenticated | Return currently logged-in user profile, role, and permissions. |
| `POST` | `/auth/forgot-password` | Public | Request password reset token. |
| `POST` | `/auth/reset-password` | Public | Reset user password using token. |
| `POST` | `/auth/verify-email` | Public | Verify user email address using token. |

---

### B. User Management (`/users`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | `users:read` | List all users (paginated, keyword search, role filter). |
| `POST` | `/users` | `users:write` | Create a new user profile and assign role. |
| `GET` | `/users/:id` | `users:read` | Retrieve single user details by ID. |
| `PATCH` | `/users/:id` | `users:write` | Update user metadata, profile, or role assignment. |
| `DELETE` | `/users/:id` | `users:delete` | Deactivate / soft-delete user profile. |

---

### C. Dynamic RBAC (`/roles`, `/permissions`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/roles` | `roles:read` | List all roles with associated permissions. |
| `POST` | `/roles` | `roles:write` | Create custom role with permission assignments. |
| `GET` | `/roles/:id` | `roles:read` | Retrieve single role details. |
| `PATCH` | `/roles/:id` | `roles:write` | Update role permissions and description. |
| `DELETE` | `/roles/:id` | `roles:delete` | Delete custom role. |
| `GET` | `/permissions` | `permissions:read` | List all available granular system permissions. |

---

### D. IoT Device Management (`/devices`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/devices` | `devices:read` | List hardware devices (paginated, status/environment filter, search). |
| `POST` | `/devices` | `devices:create` | Register new hardware device (`deviceId` e.g. `IM100042`). |
| `GET` | `/devices/:id` | `devices:read` | Retrieve device details, certificates, and operation metrics. |
| `PATCH` | `/devices/:id` | `devices:write` | Update full device hardware information. |
| `PATCH` | `/devices/:id/status` | `devices:write_status` | Update device lifecycle status (`manufactured`, `installed`, `active`, etc.). |
| `DELETE` | `/devices/:id` | `devices:delete` | Delete or decommission hardware device. |
| `POST` | `/devices/:id/tokens` | `devices:write` | Issue ephemeral claim token or OTP verification code. |
| `POST` | `/devices/:id/certificates` | `devices:write` | Register AWS IoT Certificate and rotation trail. |
| `GET` | `/devices/:id/installation-history` | `devices:read` | Retrieve household deployment, swap, and replacement history for a specific hardware device unit. |

---

### E. Device Batches (`/device-batches`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/device-batches` | `device_batches:read` | List device batches (paginated, filter by `type`: `SHARED`/`EXCLUSIVE`/`GLOBAL`). |
| `POST` | `/device-batches` | `device_batches:write` | Create device batch (`SHARED`, `EXCLUSIVE`, or `GLOBAL`). |
| `GET` | `/device-batches/candidates` | `device_batches:read` | Fetch candidate devices for selection (filters out active exclusive devices if `batchType=EXCLUSIVE`). |
| `GET` | `/device-batches/:id` | `device_batches:read` | Retrieve batch details and device counts. |
| `GET` | `/device-batches/:id/devices` | `device_batches:read` | List devices assigned to a specific batch. |
| `POST` | `/device-batches/:id/devices` | `device_batches:write` | Add devices to a batch. |
| `DELETE` | `/device-batches/:id/devices` | `device_batches:write` | Remove devices from a batch. |
| `POST` | `/device-batches/:id/devices/remove` | `device_batches:write` | Remove devices from a batch (POST alias). |
| `PATCH` | `/device-batches/:id` | `device_batches:write` | Update batch name, description, or status (`ACTIVE`, `ARCHIVED`, `COMPLETED`). |
| `DELETE` | `/device-batches/:id` | `device_batches:write` | Delete batch record. |

> [!NOTE]
> `GLOBAL` batch creation and modification require `device_batches:write_global` (restricted to `Admin` & `SuperAdmin` roles).

---

### F. Households, Members & Multi-TVs (`/households`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/households` | `households:read` | List panelist households (paginated, region filter, includes members & TVs). |
| `GET` | `/households/:hhId` | `households:read` | Retrieve household detail with members and installed TVs. |
| `GET` | `/households/:hhId/members` | `households:read` | List members of a household (`M1`, `M2`, etc.). |
| `GET` | `/households/:hhId/members/:memberId` | `households:read` | Get single household member detail. |
| `GET` | `/households/:hhId/tvs` | `households:read` | List TV sets in household (`TV1`, `TV2`...). |
| `GET` | `/households/:hhId/tvs/:tvId` | `households:read` | Get single TV set details. |
| `POST` | `/households/:hhId/tvs` | `households:write` | Add TV set to household (Enforces max 5 TVs limit). |
| `PATCH` | `/households/:hhId/tvs/:tvId` | `households:write` | Update TV set specs or assign/unassign telemetry device (Auto-logs history event). |
| `DELETE` | `/households/:hhId/tvs/:tvId` | `households:write` | Delete TV set from household. |
| `GET` | `/households/:hhId/installation-history` | `households:read` | List installation, replacement, and uninstallation history log entries (paginated, filters by `tvId`, `deviceId`, `actionType`, date range). |
| `GET` | `/households/:hhId/installation-history/roadmap` | `households:read` | Retrieve structured installation roadmap timeline grouped by TV set. |
| `POST` | `/households/:hhId/installation-history` | `households:write` | Log a device installation, replacement, or uninstallation history record manually. |

---

### G. Mandatory Event Types Catalog (`/event-types`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/event-types` | `event_types:read` | Fetch all 24 sequential mandatory event types unpaginated. |
| `POST` | `/event-types` | `event_types:write` | Create new event type in catalog. |
| `PATCH` | `/event-types/:id` | `event_types:write` | Update event type name, description, or category. |
| `DELETE` | `/event-types/:id` | `event_types:write` | Delete event type from catalog. |

---

### H. Time-Series Device Telemetry Events (`/device-events`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/device-events` | `events:read` | Query time-series telemetry events (filters: `hhId`, `deviceId`, `eventTypeId`, `eventTypeKey`, `startDate`, `endDate`, `search`, pagination; sorted `recordedAt DESC`). |
| `GET` | `/device-events/:id` | `events:read` | Retrieve single telemetry event detail. |

---

### I. Regions Catalog (`/regions`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/regions` | `regions:read` | List operational regions catalog (unpaginated array). |
| `POST` | `/regions` | `regions:write` | Create operational region (e.g. `Yerevan Central`, `Shirak`). |
| `GET` | `/regions/:id` | `regions:read` | Retrieve single region detail. |
| `PATCH` | `/regions/:id` | `regions:write` | Update region name, code, or description. |
| `DELETE` | `/regions/:id` | `regions:write` | Delete region from catalog. |

---

### J. Field Executives (`/field-executives`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/field-executives` | `field_executives:read` | List ground staff (paginated, keyword search, region filter). No web app login access. |
| `POST` | `/field-executives` | `field_executives:write` | Create field executive (auto-generates `executiveId` e.g. `FE1001`, multi-region assignment). |
| `GET` | `/field-executives/:id` | `field_executives:read` | Retrieve field executive details by domain ID or UUID. |
| `PATCH` | `/field-executives/:id` | `field_executives:write` | Update field executive profile or assigned region mapping. |
| `PATCH` | `/field-executives/:id/status` | `field_executives:write` | Update lifecycle status (`ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`). |
| `DELETE` | `/field-executives/:id` | `field_executives:write` | Soft / hard delete field executive record. |

---

### K. Dashboard Analytics & KPIs (`/dashboard/overview`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/overview` | `dashboard:read` | Returns fleet KPIs, online/offline device counts today, active households, status breakdown, and recent security alerts. |

---

### L. Audit Logging (`/audit-logs`)
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/audit-logs` | `audit_logs:read` | List system audit log entries (paginated, search by user/route/method). |
| `GET` | `/audit-logs/:id` | `audit_logs:read` | Retrieve single audit log entry detail. |

---

## 3. Database Entity & Table Summary

| Entity Class | Table Name | Key Identifiers / Constraints |
| :--- | :--- | :--- |
| `User` | `users` | `id` (UUID PK), `email` (UK), `phone` (UK) |
| `Role` | `roles` | `id` (UUID PK), `name` (UK) |
| `Permission` | `permissions` | `id` (UUID PK), `name` (UK) |
| `Session` | `sessions` | `id` (UUID PK), `sessionToken` (UK) |
| `Device` | `devices` | `deviceId` (PK e.g. `IM100042`), `cpuSerial` (UK) |
| `DeviceProvisioningToken` | `device_provisioning_tokens` | `id` (UUID PK), `deviceId` (FK) |
| `DeviceCertificate` | `device_certificates` | `id` (UUID PK), `certificateArn` (UK) |
| `DeviceOperation` | `device_operations` | `id` (UUID PK), `deviceId` (FK, UK) |
| `DeviceBatch` | `device_batches` | `id` (UUID PK), `batchId` (UK e.g. `BAT1001`), `type` (`SHARED`/`EXCLUSIVE`/`GLOBAL`) |
| `DeviceBatchItem` | `device_batch_items` | `id` (UUID PK), `(batch_id, device_id)` (UK) |
| `Household` | `households` | `hhId` (PK e.g. `HH1000`), `totalTvs` (Count of TVs in `household_tvs`, Max 5 TVs per HH) |
| `HouseholdMember` | `household_members` | `id` (UUID PK), `(hh_id, member_id)` (UK) |
| `HouseholdTv` | `household_tvs` | `id` (UUID PK), `(hh_id, tv_id)` (UK), `installedDeviceId` (FK) |
| `HouseholdDeviceHistory` | `household_device_history` | `id` (UUID PK), `hhId` (FK), `deviceId` (FK), `previousDeviceId` (FK), `actionType` (`INSTALLED`/`REPLACED`/`UNINSTALLED`/`MAINTENANCE`) |
| `EventType` | `event_types` | `id` (Integer PK 1..24), `name` (UK) |
| `DeviceEvent` | `device_events` | `id` (UUID PK), `(hh_id, recorded_at)`, `(device_id, recorded_at)` compound time-series indexes |
| `Region` | `regions` | `id` (Integer PK), `name` (UK), `code` (UK) |
| `FieldExecutive` | `field_executives` | `id` (UUID PK), `executiveId` (UK e.g. `FE1001`), `phone` (UK), `email` (UK) |
| `AuditLog` | `audit_logs` | `id` (UUID PK), `userId` (FK), `statusCode`, `routePath` |

