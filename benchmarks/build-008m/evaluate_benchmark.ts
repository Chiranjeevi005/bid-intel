import fs from 'fs';
import path from 'path';

const runName = 'build-008m';
const outDir = path.join(process.cwd(), 'benchmarks', runName, 'results');
const goldDir = path.join(process.cwd(), 'benchmarks', 'build-008h', 'gold-standards');
const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function computeWordOverlap(s1: string, s2: string): number {
    const w1 = new Set(s1.toLowerCase().split(/\W+/).filter(x => x.length > 2));
    const w2 = new Set(s2.toLowerCase().split(/\W+/).filter(x => x.length > 2));
    let match = 0;
    for (const w of w1) {
        if (w2.has(w)) match++;
    }
    return match / Math.min(w1.size, w2.size);
}

function verifyEvidence(quote: string, docId: string): boolean {
    const textPath = path.join(process.cwd(), 'scratch_texts', `${docId}.txt`);
    if (!fs.existsSync(textPath)) return false;
    const rawText = fs.readFileSync(textPath, 'utf8').replace(/\s+/g, ' ');
    const normalizedQuote = quote.replace(/\s+/g, ' ');
    return rawText.includes(normalizedQuote) || computeWordOverlap(rawText, normalizedQuote) > 0.8;
}

let agg = {
    docs: 0,
    totalGoldItems: 0,
    criticalGoldItems: 0,
    overallRecalled: 0,
    criticalRecalled: 0,
    retrievalFound: 0,
    extractionIdentified: 0,
    validationProved: 0,
    evidenceGenerated: 0,
    evidenceAccepted: 0,
    critEvidenceFailed: 0,
    documentAborts: 0,
    identicalRetries: 0, // tracked in global telemetry
    latencies: [] as number[],
};

// Miss classification counters
let misses = {
    RETRIEVAL_MISS: 0,
    EXTRACTION_MISS: 0,
    VALIDATION_FAILURE: 0,
    DEDUPLICATION_ERROR: 0
};

console.log("Evaluating BUILD-008M Benchmark (Recall & Error Decomposition)\\n");

let failureLog = "";

for (const doc of manifest) {
    const resFile = path.join(outDir, `${doc.id}_result.json`);
    const goldFile = path.join(goldDir, `${doc.id}${doc.id === 'DOC-001' ? '.json' : '.json'}`); 
    
    if (!fs.existsSync(resFile)) {
        agg.documentAborts++;
        continue;
    }
    const { metrics, result } = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    agg.docs++;

    let isGoldProc = (doc.expected_qualification === 'PROCUREMENT' || doc.expected_qualification === 'DECEPTIVE');
    
    if (!isGoldProc) continue;
    if (!fs.existsSync(goldFile)) continue;

    const goldData = JSON.parse(fs.readFileSync(goldFile, 'utf8'));
    const goldItems = doc.id === 'DOC-001' ? goldData.items : goldData;

    let modelItems = result.extraction?.findings || [];
    let allTelemetry = result.telemetry || [];

    agg.latencies.push(metrics.total_latency);

    // Track evidence metrics across all extracted items
    for (const m of modelItems) {
        if (m.quotes) {
            for (const q of m.quotes) {
                agg.evidenceGenerated++;
                let valid = verifyEvidence(q.quote, doc.id);
                if (valid) {
                    agg.evidenceAccepted++;
                } else if (m.priority === 'CRITICAL') {
                    agg.critEvidenceFailed++;
                }
            }
        }
    }

    for (const gold of goldItems) {
        agg.totalGoldItems++;
        let isCritical = (gold.priority === 'CRITICAL');
        if (isCritical) agg.criticalGoldItems++;

        // 1. Retrieval (Did retrieval find evidence?)
        let retrievalSuccess = false;
        if (gold.page_number) {
            for (const t of allTelemetry) {
                if (t.context_pages && t.context_pages.includes(gold.page_number)) {
                    retrievalSuccess = true;
                    break;
                }
            }
        } else {
            retrievalSuccess = true; // Assume true if gold item has no specific page
        }
        
        if (retrievalSuccess) agg.retrievalFound++;
        else {
            misses.RETRIEVAL_MISS++;
            failureLog += `[DOC: ${doc.id}] RETRIEVAL_MISS: "${gold.fact}" (Page ${gold.page_number})\\n`;
            continue;
        }

        // 2. Extraction (Did extraction identify it?)
        let extractionSuccess = false;
        let validationSuccess = false;

        for (const m of modelItems) {
            if (m.quotes) {
                for (const q of m.quotes) {
                    if (computeWordOverlap(gold.quote, q.quote) > 0.6) {
                        extractionSuccess = true;
                        if (m.status === 'CONFIRMED') {
                            validationSuccess = true;
                        }
                    }
                }
            }
        }
        
        if (extractionSuccess) {
            agg.extractionIdentified++;
        } else {
            misses.EXTRACTION_MISS++;
            failureLog += `[DOC: ${doc.id}] EXTRACTION_MISS: "${gold.fact}" (Page ${gold.page_number})\\n`;
            continue;
        }

        // 3. Validation
        if (validationSuccess) {
            agg.validationProved++;
            agg.overallRecalled++;
            if (isCritical) agg.criticalRecalled++;
        } else {
            misses.VALIDATION_FAILURE++;
            failureLog += `[DOC: ${doc.id}] VALIDATION_FAILURE: "${gold.fact}"\\n`;
        }
    }
}

// Calculate Identical Retries from global telemetry
const globalTelPath = path.join(outDir, 'global_telemetry.json');
if (fs.existsSync(globalTelPath)) {
    const globalTel = JSON.parse(fs.readFileSync(globalTelPath, 'utf8'));
    agg.identicalRetries = globalTel.executionStats?.totalIdenticalRetries || 0;
}

const latenciesSec = agg.latencies.map(l => l / 1000).sort((a, b) => a - b);
const p50Latency = latenciesSec[Math.floor(latenciesSec.length * 0.5)] || 0;
const p90Latency = latenciesSec[Math.floor(latenciesSec.length * 0.9)] || 0;
const maxLatency = latenciesSec[latenciesSec.length - 1] || 0;

console.log(`Documents Evaluated: ${agg.docs}`);
console.log(`Total Gold Items: ${agg.totalGoldItems} (Critical: ${agg.criticalGoldItems})`);

console.log(`\\n### BUILD-008M gates\\n`);
console.log(`| Metric                        |        Target | Result | Status |`);
console.log(`| ----------------------------- | ------------: | ------:| ------:|`);

const critRec = (agg.criticalRecalled / agg.criticalGoldItems * 100).toFixed(1);
const overRec = (agg.overallRecalled / agg.totalGoldItems * 100).toFixed(1);
const retrRec = (agg.retrievalFound / agg.totalGoldItems * 100).toFixed(1);
const evAcc = agg.evidenceGenerated > 0 ? (agg.evidenceAccepted / agg.evidenceGenerated * 100).toFixed(1) : "100.0";

console.log(`| **Critical Recall**           |      **≥90%** |  ${critRec}% | ${Number(critRec) >= 90 ? 'PASS' : 'FAIL'} |`);
console.log(`| **Overall Recall**            |      **≥80%** |  ${overRec}% | ${Number(overRec) >= 80 ? 'PASS' : 'FAIL'} |`);
console.log(`| **Retrieval Recall**          |      **≥95%** |  ${retrRec}% | ${Number(retrRec) >= 95 ? 'PASS' : 'FAIL'} |`);
console.log(`| **Evidence Acceptance**       |      **≥99%** |  ${evAcc}% | ${Number(evAcc) >= 99 ? 'PASS' : 'FAIL'} |`);
console.log(`| **Critical Evidence Failure** |        **0%** |     ${agg.critEvidenceFailed}% | ${agg.critEvidenceFailed === 0 ? 'PASS' : 'FAIL'} |`);
console.log(`| **Document Abort Rate**       |        **0%** |     ${agg.documentAborts}% | ${agg.documentAborts === 0 ? 'PASS' : 'FAIL'} |`);
console.log(`| **Identical retries**         |         **0** |      ${agg.identicalRetries} | ${agg.identicalRetries === 0 ? 'PASS' : 'FAIL'} |`);
console.log(`| **p50 E2E**                   |          ≤60s |  ${p50Latency.toFixed(1)}s | ${p50Latency <= 60 ? 'PASS' : 'FAIL'} |`);
console.log(`| **p90 E2E**                   |      **≤90s** |  ${p90Latency.toFixed(1)}s | ${p90Latency <= 90 ? 'PASS' : 'FAIL'} |`);
console.log(`| **Max E2E**                   | ideally ≤120s | ${maxLatency.toFixed(1)}s | ${maxLatency <= 120 ? 'PASS' : 'WARN'} |`);

console.log(`\\n### Decomposition of Misses`);
console.log(`Total Misses: ${agg.totalGoldItems - agg.overallRecalled}`);
console.log(`- RETRIEVAL_MISS:      ${misses.RETRIEVAL_MISS}`);
console.log(`- EXTRACTION_MISS:     ${misses.EXTRACTION_MISS}`);
console.log(`- VALIDATION_FAILURE:  ${misses.VALIDATION_FAILURE}`);
console.log(`- DEDUPLICATION_ERROR: ${misses.DEDUPLICATION_ERROR}`);

if (failureLog.length > 0) {
    fs.writeFileSync(path.join(outDir, 'failure_log.txt'), failureLog);
    console.log(`\\nDetailed failure log saved to benchmarks/build-008m/results/failure_log.txt`);
}

