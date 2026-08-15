const fs = require('fs');
const { Client } = require('pg');

const envFile = fs.readFileSync('../.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.replace('\r', '').match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function check() {
  await client.connect();
  try {
    const res = await client.query('SELECT id, status, user_id FROM documents WHERE status = $1', ['TEXT_EXTRACTED']);
    const docs = res.rows;
    
    if (docs.length === 0) {
      console.log('No suitable RFP found');
      return;
    }

    for (const doc of docs) {
      const pageRes = await client.query('SELECT count(*) FROM document_pages WHERE document_id = $1', [doc.id]);
      const count = parseInt(pageRes.rows[0].count, 10);
      if (count > 0) {
        console.log(`Found suitable RFP: ${doc.id} with ${count} pages. UserID: ${doc.user_id}`);
        return;
      }
    }
    console.log('No suitable RFP found');
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

check();
