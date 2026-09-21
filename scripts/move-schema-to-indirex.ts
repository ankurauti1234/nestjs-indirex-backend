import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateSchema() {
  const client = new pg.Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '54322', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    const targetSchema = process.env.DB_SCHEMA || 'indirex';
    console.log(`Target Schema: ${targetSchema}`);

    // 1. Create target schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}";`);
    console.log(`Schema "${targetSchema}" created / verified.`);

    // 2. Fetch all public tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    const publicTables = tablesRes.rows.map((r) => r.table_name);
    console.log(`Found ${publicTables.length} tables in public schema:`, publicTables);

    // 3. Move tables from public to target schema
    for (const table of publicTables) {
      // Check if table already exists in target schema
      const targetCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${targetSchema}' AND table_name = '${table}'
      `);

      if (targetCheck.rows.length > 0) {
        console.log(`Table "${table}" already exists in schema "${targetSchema}". Dropping public copy...`);
        await client.query(`DROP TABLE IF EXISTS public."${table}" CASCADE;`);
      } else {
        console.log(`Moving table public."${table}" -> ${targetSchema}."${table}"...`);
        await client.query(`ALTER TABLE public."${table}" SET SCHEMA "${targetSchema}";`);
      }
    }

    // 4. Drop any remaining tables/views in public schema if any exist
    const remainingPublicRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    for (const row of remainingPublicRes.rows) {
      console.log(`Cleaning remaining public table "${row.table_name}"...`);
      await client.query(`DROP TABLE IF EXISTS public."${row.table_name}" CASCADE;`);
    }

    // 5. Verification
    const finalIndirexRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${targetSchema}' AND table_type = 'BASE TABLE'
    `);
    const finalPublicRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    console.log(`\nMigration completed successfully!`);
    console.log(`Tables in "${targetSchema}" schema (${finalIndirexRes.rows.length}):`, finalIndirexRes.rows.map(r => r.table_name));
    console.log(`Tables remaining in "public" schema (${finalPublicRes.rows.length}):`, finalPublicRes.rows.map(r => r.table_name));

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateSchema();

