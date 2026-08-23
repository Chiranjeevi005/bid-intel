import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import { qualifyDocument } from '../../lib/ai/qualification';
import { getCategoryCandidates } from '../../lib/ai/retrieval';
import { analyzeBatchBounded, BatchTelemetry } from '../../lib/inngest/functions';
import { interpretFindings } from '../../lib/ai/provider';
import { Category, Finding } from '../../lib/ai/schema';
import { verifyQuote } from '../../lib/ai/validator';
import { runWithConcurrencyLimit, getExtractionConcurrencyLimit } from '../../lib/ai/splitter';

const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const outDir = path.join(process.cwd(), 'benchmarks', 'build-008m', 'results');
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
    console.log("Starting BUILD-008M Benchmark...");
    
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

            // 2. Extraction Pipeline
            let extUsages: any[] = [];
            let allBatchTelemetry: BatchTelemetry[] = [];
            
            if (result.qualification.is_procurement_opportunity) {
                // M2 & M3: Deterministic Candidate Retrieval
                const retrieveStart = performance.now();
                const candidates = getCategoryCandidates(pages);
                metrics.retrieval_latency = performance.now() - retrieveStart;

                const batches = candidates.map((set: any) => ({
                    name: set.category,
                    targetCategory: set.category,
                    pages: pages.filter((p: { page_number: number }) => set.context_pages.includes(p.page_number)),
                    trigger_pages: set.trigger_pages,
                    context_pages: set.context_pages,
                    context_expansion_reason: set.context_expansion_reason
                }));

                const activeBatches = batches.filter((b: any) => b.pages.length > 0);
                
                // M4: Targeted Extraction
                const extStart = performance.now();
                const limit = getExtractionConcurrencyLimit();
                const tasks = activeBatches.map((b: any) =>
                    async () => {
                        const res = await analyzeBatchBounded(b.pages, b.name, b.targetCategory, 0, []);
                        res.telemetry.forEach(t => {
                            t.trigger_pages = b.trigger_pages;
                            t.context_pages = b.context_pages;
                            t.context_expansion_reason = b.context_expansion_reason;
                        });
                        return res;
                    }
                );

                const results = await runWithConcurrencyLimit(tasks, limit);
                metrics.extraction_latency = performance.now() - extStart;

                const allFindings: Finding[] = [];
                results.forEach((res, idx) => {
                    allFindings.push(...res.findings);
                    allBatchTelemetry.push(...res.telemetry);
                    const totalCost = res.telemetry.reduce((acc, t) => acc + t.estimated_cost_cents, 0);
                    extUsages.push({
                        step_name: `stage_2_${activeBatches[idx].name.toLowerCase()}`,
                        estimated_cost_cents: totalCost,
                        completion_tokens: res.telemetry.reduce((acc, t) => acc + t.completion_tokens, 0),
                        prompt_tokens: res.telemetry.reduce((acc, t) => acc + t.prompt_tokens, 0),
                        ceiling_hits: res.telemetry.filter(t => t.ceiling_hit).length,
                        splits: res.telemetry.filter(t => t.split_occurred).length,
                    });
                });

                // M9: Deduplication
                const deduplicatedFindings: Finding[] = [];
                const normalize = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim();
                for (const finding of allFindings) {
                    let isDuplicate = false;
                    if (finding.quotes && finding.quotes.length > 0) {
                        const findingQuotes = finding.quotes.map(q => normalize(q.quote));
                        for (const existing of deduplicatedFindings) {
                            if (!existing.quotes) continue;
                            const existingQuotes = existing.quotes.map(q => normalize(q.quote));
                            const overlap = findingQuotes.some(fq => existingQuotes.includes(fq));
                            if (overlap) {
                                isDuplicate = true;
                                break;
                            }
                        }
                    }
                    if (!isDuplicate) {
                        deduplicatedFindings.push(finding);
                    }
                }

                // K6: Evidence Validation
                const verifiedFindings = [];
                for (const finding of deduplicatedFindings) {
                    if (finding.status !== 'CONFIRMED' || !finding.quotes || finding.quotes.length === 0) continue;
                    let allQuotesValid = true;
                    for (const q of finding.quotes) {
                        const sourcePage = pages.find((p: { page_number: number }) => p.page_number === q.page_number);
                        if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
                            allQuotesValid = false;
                            break;
                        }
                    }
                    if (allQuotesValid) verifiedFindings.push(finding);
                }

                // M5: Selective Interpretation
                const interpretStart = performance.now();
                const riskyCategories = ['LIABILITY_RISK', 'TERMINATION', 'CONTRADICTIONS_AMBIGUITIES'];
                const toInterpret = verifiedFindings.filter((f: Finding) => 
                    f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category)
                );
                const notInterpret = verifiedFindings.filter((f: Finding) => 
                    !(f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category))
                );

                const CHUNK_SIZE = 5;
                const chunks = [];
                for (let i = 0; i < toInterpret.length; i += CHUNK_SIZE) {
                    chunks.push(toInterpret.slice(i, i + CHUNK_SIZE));
                }

                const interpretTasks = chunks.map((chunk, idx) => async () => {
                    const pageNumbers = new Set<number>();
                    chunk.forEach(finding => finding.quotes?.forEach(q => pageNumbers.add(q.page_number)));
                    const contextPages = pages.filter((p: { page_number: number }) => pageNumbers.has(p.page_number));
                    return interpretFindings(chunk, contextPages);
                });

                const interpretResults = await runWithConcurrencyLimit(interpretTasks, limit);
                metrics.interpretation_latency = performance.now() - interpretStart;

                const finalFindings = [...notInterpret];
                let interpretCost = 0;
                let interpretComp = 0;
                let interpretPrompt = 0;
                interpretResults.forEach(res => {
                    finalFindings.push(...res.result);
                    interpretCost += res.usage.estimated_cost_cents;
                    interpretComp += res.usage.completion_tokens;
                    interpretPrompt += res.usage.prompt_tokens;
                });
                
                if (interpretResults.length > 0) {
                    extUsages.push({
                        step_name: 'stage_3_interpretation',
                        estimated_cost_cents: interpretCost,
                        completion_tokens: interpretComp,
                        prompt_tokens: interpretPrompt,
                        ceiling_hits: 0,
                        splits: 0
                    });
                }

                result.extraction = { findings: finalFindings };
                result.telemetry = allBatchTelemetry;
                
                // Aggregate telemetry
                globalTelemetry.push(...allBatchTelemetry);
                for (const t of allBatchTelemetry) {
                    if (t.ceiling_hit) executionStats.totalCeilingHits++;
                    if (t.split_occurred) executionStats.totalSplits++;
                    if (t.split_depth > executionStats.maxSplitDepth) executionStats.maxSplitDepth = t.split_depth;
                }
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
