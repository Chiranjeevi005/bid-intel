import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import { qualifyDocument } from '../../lib/ai/qualification';
import { mapDocumentPages } from '../../lib/ai/mapping';
import { consolidatePageSignals } from '../../lib/ai/retrieval';
import { analyzeBatchBounded, BatchTelemetry } from '../../lib/inngest/functions';
import { reasoningReview } from '../../lib/ai/provider';
import { Category, Finding } from '../../lib/ai/schema';
import { verifyQuote } from '../../lib/ai/validator';
import { runWithConcurrencyLimit, getExtractionConcurrencyLimit } from '../../lib/ai/splitter';

const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const outDir = path.join(process.cwd(), 'benchmarks', 'build-008k', 'results');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function parsePages(rawText: string) {
    const parts = rawText.split(/---PAGE_(\d+)---/);
    const pages = [];
    for (let i = 1; i < parts.length; i += 2) {
        pages.push({
            page_number: parseInt(parts[i]),
            content: parts[i + 1].trim()
        });
    }
    return pages;
}

async function runBenchmark() {
    console.log("Starting BUILD-008K Benchmark...");
    
    // Global metrics tracking
    const globalTelemetry: BatchTelemetry[] = [];
    const executionStats = {
      totalCeilingHits: 0,
      totalSplits: 0,
      totalIdenticalRetries: 0,
      maxSplitDepth: 0
    };

    for (const doc of manifest) {
        console.log(`\nProcessing ${doc.id}...`);
        const textPath = path.join(process.cwd(), 'scratch_texts', `${doc.id}.txt`);
        let pages = [];
        if (fs.existsSync(textPath)) {
            const raw = fs.readFileSync(textPath, 'utf8');
            pages = parsePages(raw);
        } else {
            console.warn(`Text not found for ${doc.id}, skipping`);
            continue;
        }

        const metrics: any = { id: doc.id };
        const result: any = { id: doc.id };

        const totalStart = performance.now();

        try {
            // 1. Qualification
            const qualStart = performance.now();
            const qualResult = await qualifyDocument(pages);
            metrics.qual_latency = performance.now() - qualStart;
            result.qualification = qualResult.result;
            const qualUsage = qualResult.usage;

            // 2. Extraction
            let extUsages: any[] = [];
            let allBatchTelemetry: BatchTelemetry[] = [];
            
            if (result.qualification.is_procurement_opportunity) {
                // Mapping
                const mapStart = performance.now();
                const mapResult = await mapDocumentPages(pages);
                metrics.mapping_latency = performance.now() - mapStart;
                const mapUsage = mapResult.usage;

                // Retrieval
                const consolidated = consolidatePageSignals(pages, mapResult.result.page_maps);
                const eligibilityCategories = ['MANDATORY_ELIGIBILITY', 'SUBMISSION_REQUIREMENTS', 'OPPORTUNITY_FIT'];
                const commercialCategories = ['COMMERCIAL_TERMS', 'EVALUATION_CRITERIA', 'KEY_DATES'];
                const legalCategories = ['LIABILITY_INDEMNITY', 'TERMINATION_RIGHTS', 'UNUSUAL_OBLIGATIONS', 'AMBIGUITIES_CONTRADICTIONS'];

                const eligibilityPages = new Set<number>();
                const commercialPages = new Set<number>();
                const legalPages = new Set<number>();

                for (const [pageNumStr, signals] of Object.entries(consolidated)) {
                    const pageNum = parseInt(pageNumStr);
                    for (const signal of signals as Category[]) {
                        if (eligibilityCategories.includes(signal)) eligibilityPages.add(pageNum);
                        if (commercialCategories.includes(signal)) commercialPages.add(pageNum);
                        if (legalCategories.includes(signal)) legalPages.add(pageNum);
                    }
                }

                const batches = [
                    { name: 'Eligibility', pages: pages.filter(p => eligibilityPages.has(p.page_number)) },
                    { name: 'Commercial', pages: pages.filter(p => commercialPages.has(p.page_number)) },
                    { name: 'Legal/Risk', pages: pages.filter(p => legalPages.has(p.page_number)) }
                ].filter(b => b.pages.length > 0);

                // Extraction
                const extStart = performance.now();
                const limit = getExtractionConcurrencyLimit();
                const tasks = batches.map(b => () => analyzeBatchBounded(b.pages, b.name, 0, []));
                
                const extResults = await runWithConcurrencyLimit(tasks, limit);
                
                const allFindings: Finding[] = [];
                extResults.forEach((res, idx) => {
                    allFindings.push(...res.findings);
                    allBatchTelemetry.push(...res.telemetry);
                    
                    const totalCost = res.telemetry.reduce((acc, t) => acc + t.estimated_cost_cents, 0);
                    extUsages.push({
                      step_name: `stage_3_${batches[idx].name.toLowerCase()}`,
                      estimated_cost_cents: totalCost,
                      completion_tokens: res.telemetry.reduce((acc, t) => acc + t.completion_tokens, 0),
                    });
                });
                metrics.extraction_latency = performance.now() - extStart;

                // Reasoning
                const reasonStart = performance.now();
                const finalFindings: Finding[] = [];
                const toReason = allFindings.filter(f => f.requires_reasoning_review);
                const notReason = allFindings.filter(f => !f.requires_reasoning_review);

                const reasonTasks = toReason.map(finding => async () => {
                    const pageNumbers = finding.quotes?.map(q => q.page_number) || [];
                    const contextPages = pages.filter(p => pageNumbers.includes(p.page_number));
                    return reasoningReview(finding, contextPages);
                });

                const reasonResults = await runWithConcurrencyLimit(reasonTasks, limit);
                
                let reasonUsages: any[] = [];
                reasonResults.forEach(res => {
                    finalFindings.push(res.result);
                    reasonUsages.push(res.usage);
                });
                metrics.reasoning_latency = performance.now() - reasonStart;

                // Validation
                const validFindings = [];
                finalFindings.push(...notReason);
                for (const finding of finalFindings) {
                    if (finding.status !== 'CONFIRMED' || !finding.quotes || finding.quotes.length === 0) continue;
                    let allQuotesValid = true;
                    for (const q of finding.quotes) {
                        const sourcePage = pages.find((p: any) => p.page_number === q.page_number);
                        if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
                            allQuotesValid = false;
                            break;
                        }
                    }
                    if (allQuotesValid) validFindings.push(finding);
                }
                result.extraction = { findings: validFindings };
                
                metrics.usage = {
                  qual: qualUsage,
                  map: mapUsage,
                  ext: extUsages,
                  reason: reasonUsages
                };

            } else {
                result.extraction = null;
                metrics.mapping_latency = 0;
                metrics.extraction_latency = 0;
                metrics.reasoning_latency = 0;
                metrics.usage = { qual: qualUsage };
            }

            metrics.total_latency = performance.now() - totalStart;
            metrics.telemetry = allBatchTelemetry;
            
            // Accumulate global stats
            globalTelemetry.push(...allBatchTelemetry);
            allBatchTelemetry.forEach(t => {
              if (t.ceiling_hit) executionStats.totalCeilingHits++;
              if (t.split_occurred) executionStats.totalSplits++;
              if (t.identical_retry) executionStats.totalIdenticalRetries++;
              if (t.split_depth > executionStats.maxSplitDepth) executionStats.maxSplitDepth = t.split_depth;
            });

        } catch (error: any) {
            console.error(`Document ${doc.id} failed:`, error.message);
            result.error = error.message;
            metrics.total_latency = performance.now() - totalStart;
        }

        fs.writeFileSync(path.join(outDir, `${doc.id}_result.json`), JSON.stringify({ metrics, result }, null, 2));
    }

    fs.writeFileSync(path.join(outDir, 'global_telemetry.json'), JSON.stringify({
      telemetry: globalTelemetry,
      stats: executionStats
    }, null, 2));

    console.log("Benchmark Complete.");
    console.log("Execution Stats:", executionStats);
}

runBenchmark().catch(console.error);
