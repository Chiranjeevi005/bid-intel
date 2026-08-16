import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import {
    qualifyDocumentDiagnostic,
    mapDocumentPagesDiagnostic,
    analyzeBatchDiagnostic,
    reasoningReviewDiagnostic
} from './diagnostic_provider';
import { consolidatePageSignals } from '../../lib/ai/retrieval';
import { Category } from '../../lib/ai/schema';

// Diagnostic subset: DOC-001, DOC-007, DOC-009, DOC-008, DOC-012
const DIAGNOSTIC_SUBSET = ['DOC-001', 'DOC-007', 'DOC-009', 'DOC-008', 'DOC-012'];

const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).filter((d: any) => DIAGNOSTIC_SUBSET.includes(d.id));

const outDir = path.join(process.cwd(), 'benchmarks', 'build-008j', 'diagnostic-results');
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

// Log Inngest Decomposition
const inngestLogPath = path.join(outDir, 'inngest-timing.json');
const inngestTiming: any[] = [];

async function runDiagnostic() {
    console.log("Starting BUILD-008J Provider Diagnosis (Experiment 1)...");

    // Clear request level metrics if exists
    const requestLogPath = path.join(outDir, 'request-level-metrics.jsonl');
    if (fs.existsSync(requestLogPath)) {
        fs.unlinkSync(requestLogPath);
    }

    for (const doc of manifest) {
        console.log(`\nProcessing ${doc.id}...`);
        const textPath = path.join(process.cwd(), 'scratch_texts', `${doc.id}.txt`);
        let pages = [];
        if (fs.existsSync(textPath)) {
            const raw = fs.readFileSync(textPath, 'utf8');
            pages = parsePages(raw);
        } else {
            pages = [{ page_number: 1, content: `Document Title: ${doc.filename}\nThis is a dummy document for testing.` }];
        }

        const metrics: any = { id: doc.id };
        const result: any = { id: doc.id };

        const totalStart = performance.now();
        let queue_wait_ms = 0;
        let worker_start_ms = 0;
        let retrieval_ms = 0;
        let validation_ms = 0;
        let persistence_ms = 0;

        try {
            // 1. Qualification
            const qualStart = performance.now();
            const { result: qualResult } = await qualifyDocumentDiagnostic(pages, {
                document_id: doc.id, document_name: doc.filename, document_type: doc.expected_type
            });
            metrics.qual_latency = performance.now() - qualStart;
            result.qualification = qualResult;

            // 2. Extraction
            if (result.qualification.is_procurement_opportunity) {
                // Mapping
                const mapStart = performance.now();
                const { result: mapResult } = await mapDocumentPagesDiagnostic(pages, {
                    document_id: doc.id, document_name: doc.filename, document_type: doc.expected_type
                });
                metrics.mapping_latency = performance.now() - mapStart;

                // Retrieval (non-AI overhead)
                const retrievalStart = performance.now();
                const consolidated = consolidatePageSignals(pages, mapResult.page_maps);
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
                retrieval_ms = performance.now() - retrievalStart;

                // Sequential Extraction for Provider Diagnosis (Experiment 1)
                // We do NOT use Promise.all here to ensure we measure base TTFT/generation without self-induced provider queueing
                const extStart = performance.now();
                const allFindings = [];
                for (const b of batches) {
                    const r = await analyzeBatchDiagnostic(b.pages, b.name, {
                        document_id: doc.id, document_name: doc.filename, document_type: doc.expected_type
                    });
                    allFindings.push(...r.result.findings);
                }
                metrics.extraction_latency = performance.now() - extStart;

                // Sequential Reasoning
                const reasonStart = performance.now();
                const finalFindings = [];
                const toReason = allFindings.filter(f => f.requires_reasoning_review);
                const notReason = allFindings.filter(f => !f.requires_reasoning_review);

                for (const finding of toReason) {
                    const pageNumbers = finding.quotes?.map(q => q.page_number) || [];
                    const contextPages = pages.filter(p => pageNumbers.includes(p.page_number));
                    const r = await reasoningReviewDiagnostic(finding, contextPages, {
                        document_id: doc.id, document_name: doc.filename, document_type: doc.expected_type
                    });
                    finalFindings.push(r.result);
                }
                metrics.reasoning_latency = performance.now() - reasonStart;

                // Validation overhead simulation
                const validStart = performance.now();
                finalFindings.push(...notReason);
                result.extraction = { findings: finalFindings };
                validation_ms = performance.now() - validStart;

            } else {
                result.extraction = null;
                metrics.mapping_latency = 0;
                metrics.extraction_latency = 0;
                metrics.reasoning_latency = 0;
            }

            metrics.total_latency = performance.now() - totalStart;

            inngestTiming.push({
                document_id: doc.id,
                queue_wait_ms,
                worker_start_ms,
                mapping_ms: metrics.mapping_latency,
                retrieval_ms,
                extraction_ms: metrics.extraction_latency,
                reasoning_ms: metrics.reasoning_latency,
                validation_ms,
                persistence_ms,
                total_e2e_ms: metrics.total_latency,
                provider_ai_ms: metrics.qual_latency + metrics.mapping_latency + metrics.extraction_latency + metrics.reasoning_latency,
                non_provider_ms: metrics.total_latency - (metrics.qual_latency + metrics.mapping_latency + metrics.extraction_latency + metrics.reasoning_latency)
            });

        } catch (error: any) {
            console.error(`Document ${doc.id} failed:`, error.message);
            result.error = error.message;
            metrics.total_latency = performance.now() - totalStart;
        }

        // Save doc result (mainly to compare schema validity vs BUILD-008I)
        fs.writeFileSync(path.join(outDir, `${doc.id}_result.json`), JSON.stringify({ metrics, result }, null, 2));
    }

    fs.writeFileSync(inngestLogPath, JSON.stringify(inngestTiming, null, 2), 'utf8');
    console.log("Experiment 1 Complete.");
}

runDiagnostic().catch(console.error);
