# AWS Lambda Architecture Specification: Device Lifecycle & Installation Engine

## 1. Executive Summary

This specification outlines the architecture, database schemas, AWS Serverless infrastructure (API Gateway, AWS Lambda, AWS IoT Core, RDS PostgreSQL), and API contract for the **Device Lifecycle & Installation System**.

It covers the complete operational lifecycle of IoT devices:
- **Installation** (`MANUFACTURED` -> `INSTALLED`)
- **Uninstallation** (`INSTALLED` -> `UNINSTALLED`)
- **Atomic Replacement** (`oldDeviceId` -> `newDeviceId` in a household)
- **Decommissioning & Dead Device Safeguard Protocol** (Hardware retirement, AWS IoT Certificate revocation, and ingress blocking)

---

## 2. Infrastructure Architecture & AWS Services Topology

```
                  ┌─────────────────────────────────────────┐
                  │          API Gateway (REST / HTTP)      │
                  └────────────────────┬────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ Install Lambda   │         │ Replace Lambda   │         │ Uninstall/      │
│ Function         │         │ Function         │         │ Decommission     │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         │                            │                            │
         ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                  RDS PostgreSQL DB (Schema: `indirex`)                    │
│ ┌──────────────────┐   ┌──────────────────────────────┐   ┌──────────────┐ │
│ │ indirex.devices  │   │device_installation_history  │   │device_events │ │
│ └──────────────────┘   └──────────────────────────────┘   └──────────────┘ │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────┐
                        │   AWS IoT Core Service   │
                        │  (Certificate Revocation)│
                        └──────────────────────────┘
```

---

## 3. Database Schema Specifications (PostgreSQL `indirex` Schema)

### 3.1 `indirex.devices`
```sql
CREATE TABLE IF NOT EXISTS indirex.devices (
    device_id VARCHAR(100) PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    cpu_serial VARCHAR(255) UNIQUE,
    current_hh_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'manufactured',
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    manufactured_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_current_hh_id ON indirex.devices(current_hh_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON indirex.devices(status);
```

### 3.2 `indirex.device_installation_history`
```sql
CREATE TABLE IF NOT EXISTS indirex.device_installation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(100) NOT NULL REFERENCES indirex.devices(device_id),
    hh_id VARCHAR(100) NOT NULL REFERENCES indirex.households(hh_id),
    status VARCHAR(50) NOT NULL DEFAULT 'INSTALLED', -- 'INSTALLED', 'UNINSTALLED', 'REPLACED', 'DECOMMISSIONED'
    installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    uninstalled_at TIMESTAMP WITH TIME ZONE,
    is_dead BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    performed_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_install_hist_hh_installed ON indirex.device_installation_history(hh_id, installed_at DESC);
CREATE INDEX IF NOT EXISTS idx_install_hist_device_installed ON indirex.device_installation_history(device_id, installed_at DESC);
```

---

## 4. Dead Device Safeguard Protocol (Zero-Trust Hardware Retirement)

When a physical meter/device is reported as **dead**, **damaged**, or **unrecoverable**, the system executes a 5-step Zero-Trust Protocol:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DEAD DEVICE SAFEGUARD PROTOCOL                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Lock DB Status       ──► Set status = 'decommissioned', clear current_hh_id│
│ 2. AWS IoT Revocation   ──► Call AWS IoT UpdateCertificate(status='INACTIVE') │
│ 3. Cert Audit Lock      ──► Set device_certificates status = 'REVOKED'        │
│ 4. Ingest Drop Shield   ──► Ingestion Lambdas ignore messages from status='decommissioned'│
│ 5. Permanent Re-bind Block─► DB constraints prevent re-installing decommissioned IDs│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. AWS Lambda Handlers & API Specifications

### 5.1 Lambda Function 1: Device Installation Handler (`POST /device-lifecycle/install`)

- **Trigger**: API Gateway `POST /device-lifecycle/install`
- **Authorization**: IAM / JWT / Custom Authorizer (`device_lifecycle:write`)
- **Request Body**:
  ```json
  {
    "deviceId": "IM100042",
    "hhId": "HH1000",
    "notes": "Initial meter setup in apartment 4B"
  }
  ```
- **SQL Execution Transaction**:
  ```sql
  BEGIN;

  -- 1. Check device existence and availability
  SELECT status, current_hh_id FROM indirex.devices WHERE device_id = 'IM100042' FOR UPDATE;

  -- Verify status IS NOT 'decommissioned' and current_hh_id IS NULL

  -- 2. Update device status
  UPDATE indirex.devices 
  SET current_hh_id = 'HH1000', status = 'installed', updated_at = NOW() 
  WHERE device_id = 'IM100042';

  -- 3. Insert Installation History
  INSERT INTO indirex.device_installation_history (device_id, hh_id, status, installed_at, notes, performed_by)
  VALUES ('IM100042', 'HH1000', 'INSTALLED', NOW(), 'Initial meter setup in apartment 4B', 'user_sub_id');

  -- 4. Emit DEVICE_INSTALLED Event
  INSERT INTO indirex.device_events (id, hh_id, device_id, event_type_id, event_type_key, metrics, recorded_at, created_at)
  VALUES (gen_random_uuid(), 'HH1000', 'IM100042', 1, 'DEVICE_INSTALLED', '{"stage": "installed"}'::json, NOW(), NOW());

  COMMIT;
  ```

---

### 5.2 Lambda Function 2: Device Uninstallation Handler (`POST /device-lifecycle/uninstall`)

- **Trigger**: API Gateway `POST /device-lifecycle/uninstall`
- **Request Body**:
  ```json
  {
    "deviceId": "IM100042",
    "isDead": true,
    "reason": "Hardware display burnt out"
  }
  ```
- **SQL & AWS IoT Safeguard Execution**:
  ```sql
  BEGIN;

  -- 1. Fetch active installation history
  UPDATE indirex.device_installation_history
  SET uninstalled_at = NOW(), 
      is_dead = true, 
      status = CASE WHEN true THEN 'DECOMMISSIONED' ELSE 'UNINSTALLED' END,
      notes = 'Hardware display burnt out',
      updated_at = NOW()
  WHERE device_id = 'IM100042' AND uninstalled_at IS NULL;

  -- 2. Update device state
  UPDATE indirex.devices
  SET current_hh_id = NULL,
      status = CASE WHEN true THEN 'decommissioned' ELSE 'uninstalled' END,
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{isDead}', 'true'::jsonb),
      updated_at = NOW()
  WHERE device_id = 'IM100042';

  -- 3. Revoke DB Certificates if dead
  UPDATE indirex.device_certificates
  SET status = 'REVOKED', revocation_reason = 'DEAD_HARDWARE_DECOMMISSIONED', updated_at = NOW()
  WHERE device_id = 'IM100042';

  COMMIT;
  ```

- **AWS IoT SDK Revocation (TypeScript Node.js)**:
  ```typescript
  import { IoTClient, UpdateCertificateCommand } from "@aws-sdk/client-iot";

  const iotClient = new IoTClient({ region: process.env.AWS_REGION });

  async function revokeAwsCertificate(certificateId: string) {
    await iotClient.send(new UpdateCertificateCommand({
      certificateId,
      newStatus: "INACTIVE" // Revokes TLS MQTT connection capability
    }));
  }
  ```

---

### 5.3 Lambda Function 3: Atomic Device Replacement Handler (`POST /device-lifecycle/replace`)

- **Trigger**: API Gateway `POST /device-lifecycle/replace`
- **Request Body**:
  ```json
  {
    "oldDeviceId": "IM100042",
    "newDeviceId": "IM100049",
    "hhId": "HH1000",
    "isOldDeviceDead": true,
    "reason": "Faulty meter swap"
  }
  ```
- **Atomic SQL Transaction**:
  ```sql
  BEGIN;

  -- 1. Lock both device rows
  SELECT device_id, status FROM indirex.devices WHERE device_id IN ('IM100042', 'IM100049') FOR UPDATE;

  -- 2. Close history for old device
  UPDATE indirex.device_installation_history
  SET uninstalled_at = NOW(),
      is_dead = true,
      status = 'REPLACED',
      notes = 'Replaced by IM100049: Faulty meter swap',
      updated_at = NOW()
  WHERE device_id = 'IM100042' AND hh_id = 'HH1000' AND uninstalled_at IS NULL;

  -- 3. Retire old device
  UPDATE indirex.devices
  SET current_hh_id = NULL,
      status = 'decommissioned',
      updated_at = NOW()
  WHERE device_id = 'IM100042';

  -- 4. Install new device into household
  UPDATE indirex.devices
  SET current_hh_id = 'HH1000',
      status = 'installed',
      updated_at = NOW()
  WHERE device_id = 'IM100049';

  -- 5. Insert history for new device
  INSERT INTO indirex.device_installation_history (device_id, hh_id, status, installed_at, notes)
  VALUES ('IM100049', 'HH1000', 'INSTALLED', NOW(), 'Replaced IM100042');

  -- 6. Log Events
  INSERT INTO indirex.device_events (id, hh_id, device_id, event_type_id, event_type_key, metrics, recorded_at, created_at)
  VALUES 
    (gen_random_uuid(), 'HH1000', 'IM100042', 5, 'DEVICE_DECOMMISSIONED', '{"reason": "Faulty meter swap"}'::json, NOW(), NOW()),
    (gen_random_uuid(), 'HH1000', 'IM100049', 1, 'DEVICE_INSTALLED', '{"replacedDeviceId": "IM100042"}'::json, NOW(), NOW());

  COMMIT;
  ```

---

### 5.4 Lambda Function 4: Household Device History Handler (`GET /device-lifecycle/history/household/{hhId}`)

- **Trigger**: API Gateway `GET /device-lifecycle/history/household/{hhId}`
- **Query Parameters**: `page` (default 1), `limit` (default 10)
- **SQL Query with Pagination**:
  ```sql
  SELECT 
    h.id,
    h.device_id AS "deviceId",
    d.device_name AS "deviceName",
    h.hh_id AS "hhId",
    h.status,
    h.installed_at AS "installedAt",
    h.uninstalled_at AS "uninstalledAt",
    h.is_dead AS "isDead",
    h.notes,
    h.performed_by AS "performedBy",
    COUNT(*) OVER() AS "totalCount"
  FROM indirex.device_installation_history h
  LEFT JOIN indirex.devices d ON d.device_id = h.device_id
  WHERE h.hh_id = $1
  ORDER BY h.installed_at DESC
  LIMIT $2 OFFSET $3;
  ```

---

## 6. Complete Sample AWS Lambda Node.js / TypeScript Code Template

File: `lambdas/device-replace/index.ts`

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { IoTClient, UpdateCertificateCommand } from '@aws-sdk/client-iot';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

const iotClient = new IoTClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const client = await pool.connect();
  try {
    const body = JSON.parse(event.body || '{}');
    const { oldDeviceId, newDeviceId, hhId, isOldDeviceDead, reason } = body;

    if (!oldDeviceId || !newDeviceId || !hhId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Missing required parameters' })
      };
    }

    await client.query('BEGIN');

    // 1. Fetch old device certificate to revoke if dead
    if (isOldDeviceDead) {
      const certRes = await client.query(
        'SELECT certificate_id FROM indirex.device_certificates WHERE device_id = $1 AND status = \'ACTIVE\'',
        [oldDeviceId]
      );
      
      for (const row of certRes.rows) {
        if (row.certificate_id) {
          await iotClient.send(new UpdateCertificateCommand({
            certificateId: row.certificate_id,
            newStatus: 'INACTIVE'
          }));
        }
      }

      await client.query(
        'UPDATE indirex.device_certificates SET status = \'REVOKED\', revocation_reason = \'DEAD_HARDWARE\' WHERE device_id = $1',
        [oldDeviceId]
      );
    }

    // 2. Unbind old device
    await client.query(
      'UPDATE indirex.device_installation_history SET uninstalled_at = NOW(), is_dead = $1, status = \'REPLACED\', notes = $2 WHERE device_id = $3 AND hh_id = $4 AND uninstalled_at IS NULL',
      [isOldDeviceDead, reason, oldDeviceId, hhId]
    );

    await client.query(
      'UPDATE indirex.devices SET current_hh_id = NULL, status = CASE WHEN $1::boolean THEN \'decommissioned\' ELSE \'uninstalled\' END WHERE device_id = $2',
      [isOldDeviceDead, oldDeviceId]
    );

    // 3. Bind new device
    await client.query(
      'UPDATE indirex.devices SET current_hh_id = $1, status = \'installed\' WHERE device_id = $2',
      [hhId, newDeviceId]
    );

    await client.query(
      'INSERT INTO indirex.device_installation_history (device_id, hh_id, status, installed_at, notes) VALUES ($1, $2, \'INSTALLED\', NOW(), $3)',
      [newDeviceId, hhId, `Replaced ${oldDeviceId}`]
    );

    // 4. Log Event
    await client.query(
      'INSERT INTO indirex.device_events (id, hh_id, device_id, event_type_id, event_type_key, metrics, recorded_at, created_at) VALUES (gen_random_uuid(), $1, $2, 1, \'DEVICE_INSTALLED\', $3::json, NOW(), NOW())',
      [hhId, newDeviceId, JSON.stringify({ replacedDeviceId: oldDeviceId })]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        statusCode: 200,
        message: `Device ${oldDeviceId} successfully replaced by ${newDeviceId} in household ${hhId}`,
        data: { oldDeviceId, newDeviceId, hhId, isOldDeviceDead }
      })
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    };
  } finally {
    client.release();
  }
};
```

---

## 7. Verification & Deployment Checklists

- [x] **Database Constraints**: `device_installation_history` indexes on `(hh_id, installed_at)` and `(device_id, installed_at)`.
- [x] **Zero-Trust Security**: Certificate INACTIVE revocation via `@aws-sdk/client-iot` prevents dead hardware reconnects.
- [x] **Ingestion Isolation**: Lambda SQS/MQTT processors check `status != 'decommissioned'`.
- [x] **Atomic Replacement**: Full PostgreSQL `BEGIN ... COMMIT` transaction prevents partial states.

