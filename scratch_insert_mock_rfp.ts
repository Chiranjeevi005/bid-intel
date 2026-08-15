import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  const userId = crypto.randomUUID();
  const docId = crypto.randomUUID();

  // Insert mock document
  await supabase.from('documents').insert({
    id: docId,
    user_id: userId,
    filename: 'Test_Procurement_RFP.pdf',
    status: 'TEXT_EXTRACTED',
    created_at: new Date().toISOString()
  });

  // Insert mock pages
  const rfpText = `
REQUEST FOR PROPOSALS
Title: Implementation of Enterprise Resource Planning System
Issued By: Department of Technology
Due Date: October 15, 2026

1. Introduction
The Department of Technology is seeking proposals from qualified vendors to implement a cloud-based Enterprise Resource Planning (ERP) system.

2. Scope of Work
The chosen vendor will be responsible for data migration, system configuration, user training, and 24/7 technical support for 3 years.

3. Evaluation Criteria
Proposals will be evaluated based on cost (40%), technical capability (40%), and past experience (20%).

4. Submission Instructions
All proposals must be submitted electronically via the procurement portal by 5:00 PM EST on the due date. Late submissions will not be accepted.
`;

  await supabase.from('document_pages').insert({
    document_id: docId,
    page_number: 1,
    content: rfpText
  });

  console.log(docId);
}
setup();
