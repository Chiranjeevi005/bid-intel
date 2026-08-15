import { Client } from 'pg';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  console.log("Connected to DB.");
  const query = `
    ALTER TABLE analysis_metrics
    ADD COLUMN IF NOT EXISTS reasoning_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS cached_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS estimated_cost_cents NUMERIC(10, 4);
  `;
  await client.query(query);
  console.log("Migration applied.");
  await client.end();
}
run().catch(console.error);
