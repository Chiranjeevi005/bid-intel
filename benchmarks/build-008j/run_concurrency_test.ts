import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import { mapDocumentPagesDiagnostic, analyzeBatchDiagnostic } from './diagnostic_provider';
import { consolidatePageSignals } from '../../lib/ai/retrieval';
import { Category } from '../../lib/ai/schema';

// We will use DOC-012 for the concurrency test
const docId = 'DOC-012';

function parsePages(rawText: string) {
    const parts = rawText.split(/---PAGE_(\d+)---/);
    const pages = [];
    for (let i = 1; i < parts.length; i += 2) {
        pages.push({
            page_number: parseInt(parts[i]),
            content: parts[i+1].trim()
        });
    }
    return pages;
}

const outDir = path.join(process.cwd(), 'benchmarks', 'build-008j', 'diagnostic-results');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runConcurrencyTest() {
    console.log("Starting BUILD-008J Concurrency Diagnosis (Experiment 2)...");
    
    // Clear concurrency metrics if exists
    const concLogPath = path.join(outDir, 'concurrency-results.jsonl');
    if (fs.existsSync(concLogPath)) {
        fs.unlinkSync(concLogPath);
    }

    const textPath = path.join(process.cwd(), 'scratch_texts', `${docId}.txt`);
    const pages = parsePages(fs.readFileSync(textPath, 'utf8'));

    console.log("Mapping DOC-012 to get batches...");
    const { result: mapResult } = await mapDocumentPagesDiagnostic(pages, {
        document_id: docId, document_name: `${docId}_concurrency`, document_type: 'RFQ'
    });

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

    if (batches.length < 3) {
        console.warn("DOC-012 doesn't have 3 batches. Replicating the first batch to force 3 concurrent requests.");
        while (batches.length < 3) {
            batches.push(batches[0]);
        }
    }

    const runExtraction = async (b: any, attempt_modifier: string) => {
        const start = performance.now();
        let error = null;
        try {
            await analyzeBatchDiagnostic(b.pages, `${b.name}_${attempt_modifier}`, {
                document_id: docId, document_name: `${docId}_concurrency_${attempt_modifier}`, document_type: 'RFQ'
            });
        } catch (e: any) {
            error = e.message;
        }
        return { duration: performance.now() - start, error };
    };

    console.log("=== Experiment A: Concurrency = 1 ===");
    let startA = performance.now();
    for (const b of batches) {
        await runExtraction(b, 'C1');
    }
    console.log(`Experiment A E2E: ${(performance.now() - startA).toFixed(2)}ms`);

    console.log("Cooling down for 10 seconds...");
    await new Promise(r => setTimeout(r, 10000));

    console.log("=== Experiment B: Concurrency = 2 ===");
    let startB = performance.now();
    await Promise.all([runExtraction(batches[0], 'C2'), runExtraction(batches[1], 'C2')]);
    await runExtraction(batches[2], 'C2');
    console.log(`Experiment B E2E: ${(performance.now() - startB).toFixed(2)}ms`);

    console.log("Cooling down for 10 seconds...");
    await new Promise(r => setTimeout(r, 10000));

    console.log("=== Experiment C: Concurrency = 3 ===");
    let startC = performance.now();
    await Promise.all(batches.map(b => runExtraction(b, 'C3')));
    console.log(`Experiment C E2E: ${(performance.now() - startC).toFixed(2)}ms`);

    console.log("Concurrency tests complete.");
}

runConcurrencyTest().catch(console.error);
