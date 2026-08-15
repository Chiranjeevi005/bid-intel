import * as fs from 'fs';
import { Client } from 'pg';
import { analyzeRfpPages } from '../lib/ai/provider';
import { verifyQuote } from '../lib/ai/validator';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = new Client({ connectionString });

async function runBenchmark() {
  await client.connect();

  const document_id = 'd96d6b92-a163-4f1e-8aa2-f7430f5b8a17';
  console.log(`Starting Benchmark for document_id: ${document_id}`);

  // Fetch pages
  const pageRes = await client.query('SELECT page_number, content FROM document_pages WHERE document_id = $1 ORDER BY page_number ASC', [document_id]);
  const pages = pageRes.rows;

  if (pages.length === 0) {
    console.error("No extracted pages found");
    process.exit(1);
  }

  // Insert analysis_run
  const runIdRes = await client.query(`
    INSERT INTO analysis_runs (document_id, status, model, started_at) 
    VALUES ($1, 'PROCESSING', $2, $3) RETURNING id
  `, [document_id, process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash', new Date().toISOString()]);
  const runId = runIdRes.rows[0].id;
  console.log(`Created runId: ${runId}`);

  const startTime = Date.now();

  try {
    console.log("Executing AI analysis...");
    const result = await analyzeRfpPages(pages);
    const endTime = Date.now();
    const executionTimeMs = endTime - startTime;
    console.log(`AI execution completed in ${executionTimeMs} ms`);

    let findingsGenerated = result.findings.length;
    let accepted = 0;
    let rejected = 0;
    let rejectionReasons = [];

    const validFindingsToInsert = [];
    const validQuotesToInsert = [];

    for (const finding of result.findings) {
      if (finding.status !== 'CONFIRMED' || !finding.quotes || finding.quotes.length === 0) {
        rejected++;
        rejectionReasons.push(`Finding "${finding.title}": Status not CONFIRMED or missing quotes`);
        continue;
      }

      let allQuotesValid = true;
      for (const q of finding.quotes) {
        const sourcePage = pages.find(p => p.page_number === q.page_number);
        if (!sourcePage) {
          rejectionReasons.push(`Finding "${finding.title}": Page ${q.page_number} does not exist`);
          allQuotesValid = false;
          break;
        }

        if (!verifyQuote(sourcePage.content, q.quote)) {
          rejectionReasons.push(`Finding "${finding.title}": Quote not found on page ${q.page_number}`);
          allQuotesValid = false;
          break;
        }
      }

      if (!allQuotesValid) {
        rejected++;
        continue;
      }

      accepted++;
      const findingId = crypto.randomUUID();
      validFindingsToInsert.push([
        findingId, runId, document_id, finding.category, finding.title, finding.finding, finding.severity || null, finding.confidence
      ]);

      for (const q of finding.quotes) {
        validQuotesToInsert.push([
          findingId, q.page_number, q.quote
        ]);
      }
    }

    // Persist
    console.log(`Accepted: ${accepted}, Rejected: ${rejected}`);

    if (validFindingsToInsert.length > 0) {
      for (const f of validFindingsToInsert) {
        await client.query(`
          INSERT INTO analysis_findings (id, analysis_run_id, document_id, category, title, finding, severity, confidence)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, f);
      }
      for (const q of validQuotesToInsert) {
        await client.query(`
          INSERT INTO analysis_finding_quotes (finding_id, page_number, quote_text)
          VALUES ($1, $2, $3)
        `, q);
      }
    }

    await client.query(`
      UPDATE analysis_runs SET status = 'COMPLETED', completed_at = $1 WHERE id = $2
    `, [new Date().toISOString(), runId]);
    console.log(`Run marked as COMPLETED.`);

    const report = {
      executionTimeMs,
      findingsGenerated,
      accepted,
      rejected,
      rejectionReasons,
      validFindingsToInsert: validFindingsToInsert.length,
      validQuotesToInsert: validQuotesToInsert.length,
      allFindings: result.findings
    };

    fs.writeFileSync('benchmark_report.json', JSON.stringify(report, null, 2));
    console.log("Benchmark report saved to benchmark_report.json");

  } catch (err: any) {
    console.error("AI Analysis Execution Error:", err);
    await client.query(`
      UPDATE analysis_runs SET status = 'FAILED', error_code = $1, completed_at = $2 WHERE id = $3
    `, [err.message || 'AI_EXECUTION_FAILED', new Date().toISOString(), runId]);
  } finally {
    await client.end();
  }
}

runBenchmark();
