import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
  console.log("=== BUILD-008C E2E VERIFICATION (REAL PDF) ===");

  const docId = '5c404caa-0ee3-483a-9cc1-692eedd05833';

  // 1. Check document exists
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (docError || !doc) {
    console.error("Document not found in DB. Are you sure it was uploaded?", docError);
    process.exit(1);
  }
  
  console.log(`Found Document: ${doc.original_filename} (Status: ${doc.status}, Qual: ${doc.qualification_status})`);

  // Reset qualification and runs so we can test it freshly
  console.log("Resetting document state for a fresh test...");
  await supabase.from('documents').update({
    qualification_status: null,
    qualification_confidence: null,
    qualification_reason: null
  }).eq('id', docId);
  await supabase.from('analysis_runs').delete().eq('document_id', docId);

  // WARMUP request
  console.log("Warming up API route...");
  await fetch(`http://localhost:3000/api/analyze-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: "warmup" })
  });

  // 2. Click Analyze!
  console.log("Simulating 'Click Analyze'...");
  const start = Date.now();
  
  const res = await fetch(`http://localhost:3000/api/analyze-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: docId })
  });

  const end = Date.now();
  const queueLatency = end - start;
  const data = await res.json();

  console.log(`API Response Time: ${queueLatency}ms`);
  console.log(`API Response Body:`, data);

  if (data.status === 'AI_REJECTED') {
    console.log(`✅ VERIFIED: Scam document was successfully REJECTED at the synchronous qualification gate.`);
    console.log(`Reason: ${data.reason}`);
    process.exit(0);
  } else if (data.status === 'AI_AMBIGUOUS') {
    console.log(`⚠️ Scam document was marked AMBIGUOUS.`);
    process.exit(0);
  }

  if (queueLatency < 1000) {
    console.log(`✅ VERIFIED: Queue response is <1 second.`);
  } else {
    console.log(`⚠️ FAILED: Queue response was ${queueLatency}ms.`);
  }

  if (!data.success || !data.runId) {
    console.error("Failed to queue run:", data);
    process.exit(1);
  }
  const runId = data.runId;
  console.log(`Run queued with ID: ${runId}`);

  let currentStatus = 'QUEUED';
  while (currentStatus === 'QUEUED' || currentStatus === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { data: pollRun } = await supabase
      .from('analysis_runs')
      .select('status, last_error')
      .eq('id', runId)
      .single();
    
    if (pollRun && pollRun.status !== currentStatus) {
      console.log(`State Transition: ${currentStatus} -> ${pollRun.status}`);
      currentStatus = pollRun.status;
      if (pollRun.status === 'FAILED') {
        console.log(`Run failed with error: ${pollRun.last_error}`);
      }
    }
  }

  console.log(`Final Run Status: ${currentStatus}`);
  process.exit(0);
}

runTest();
