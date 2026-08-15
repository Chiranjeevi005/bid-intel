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
    ALTER TABLE analysis_findings
    ADD COLUMN IF NOT EXISTS business_implication TEXT,
    ADD COLUMN IF NOT EXISTS action_recommendation TEXT;

    ALTER TABLE analysis_findings DROP CONSTRAINT IF EXISTS analysis_findings_severity_check;
    ALTER TABLE analysis_findings ADD CONSTRAINT analysis_findings_severity_check CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
  `;
  await client.query(query);
  console.log("Migration applied.");
  await client.end();
}
run().catch(console.error);
