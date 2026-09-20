import { Pool } from 'pg';

let pool: any = null;

export function getDbPool() {
  if (pool) {
    return pool;
  }

  let connectionString = process.env.DATABASE_URL || '';

  // If connection string points to direct db host that may not resolve IPv4,
  // route to verified Supabase connection pooler
  if (connectionString.includes('db.dcicrwkyxqacaronwato.supabase.co')) {
    connectionString = connectionString
      .replace('db.dcicrwkyxqacaronwato.supabase.co', 'aws-0-ap-southeast-2.pooler.supabase.com')
      .replace('postgres:ac60ee1d80e28dcf3136fbd351', 'postgres.dcicrwkyxqacaronwato:ac60ee1d80e28dcf3136fbd351');
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });

  return pool;
}
