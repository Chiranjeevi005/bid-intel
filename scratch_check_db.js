const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.replace('\r', '').match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, status, user_id')
    .eq('status', 'TEXT_EXTRACTED');

  if (error) {
    console.error('Error fetching documents:', error);
    return;
  }

  for (const doc of docs) {
    const { count, error: pageError } = await supabase
      .from('document_pages')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', doc.id);
    
    if (count > 0) {
      console.log(`Found suitable RFP: ${doc.id} with ${count} pages. UserID: ${doc.user_id}`);
      return;
    }
  }

  console.log('No suitable RFP found');
}

check();
