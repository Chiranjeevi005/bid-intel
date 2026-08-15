import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createClient } from '@supabase/supabase-js';
import { analyzeRfpPages } from './lib/ai/provider';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAnalysis() {
  const docId = '5c404caa-0ee3-483a-9cc1-692eedd05833';

  console.log("Fetching pages for document...");
  const { data: pages, error } = await supabase
    .from('document_pages')
    .select('page_number, content')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });

  if (error || !pages || pages.length === 0) {
    console.error("Failed to fetch pages:", error);
    process.exit(1);
  }

  console.log(`Fetched ${pages.length} pages. Running DeepSeek analysis...`);
  
  try {
    const analysis = await analyzeRfpPages(pages);
    console.log("Analysis successful!");
    
    // Dump to a JSON file so the agent can read it and format it into a markdown artifact
    fs.writeFileSync('scratch_analysis_dump.json', JSON.stringify(analysis, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Analysis failed:", err);
    process.exit(1);
  }
}

runAnalysis();
