import fs from 'fs';
import path from 'path';

const runName = 'build-008p';
const outDir = path.join(process.cwd(), 'benchmarks', runName, 'results');
const goldDir = path.join(process.cwd(), 'benchmarks', 'build-008h', 'gold-standards');
const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const HARD_DOCS = ['DOC-006', 'DOC-008', 'DOC-010', 'DOC-011', 'DOC-012', 'DOC-013'];

function computeWordOverlap(s1: string, s2: string): number {
    const w1 = new Set(s1.toLowerCase().split(/\W+/).filter(x => x.length > 2));
    const w2 = new Set(s2.toLowerCase().split(/\W+/).filter(x => x.length > 2));
    let match = 0;
    for (const w of w1) {
        if (w2.has(w)) match++;
    }
    return match / Math.min(w1.size, w2.size);
}

function normalizeQuote(q: string) {
    return q.replace(/\s+/g, ' ').toLowerCase().trim();
}

let agg = {
    docs: 0,
    totalGoldItems: 0,
    criticalGoldItems: 0,
    
    localizedFound: 0, // Did the evidence unit capture it?
    
    p1BaselineOverall: 0,
    p1BaselineCritical: 0,
    
    finalOverall: 0,
    finalCritical: 0,
    
    totalAuditFlags: 0,
    validAuditFlags: 0,
    recoveredItems: 0,
    
    p90Latencies: [] as number[],
    aborts: 0,
    
    // Coverage Telemetry
    coverageStatusCount: {
        COVERED: 0,
        REVIEW_REQUIRED: 0,
        EXTRACTION_UNCERTAIN: 0
    }
};

console.log("Evaluating BUILD-008P Benchmark (Evidence-Unit Extraction)\n");

for (const doc of manifest) {
    if (!HARD_DOCS.includes(doc.id)) continue;

    const resFile = path.join(outDir, `${doc.id}_result.json`);
    const goldFile = path.join(goldDir, `${doc.id}.json`); 
    
    if (!fs.existsSync(resFile)) {
        agg.aborts++;
        continue;
    }
    const { metrics, result } = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    agg.docs++;
    agg.p90Latencies.push(metrics.total_latency);

    if (!fs.existsSync(goldFile)) continue;
    const goldData = JSON.parse(fs.readFileSync(goldFile, 'utf8'));
    const goldItems = doc.id === 'DOC-001' ? goldData.items : goldData;

    agg.totalAuditFlags += result.audit_flags?.length || 0;

    for (const gold of goldItems) {
        agg.totalGoldItems++;
        let isCritical = (gold.priority === 'CRITICAL');
        if (isCritical) agg.criticalGoldItems++;

        const normGold = normalizeQuote(gold.quote);

        // 1. Localization Check
        // The orchestrator already validated this, but we recount here for the metrics table.
        // Wait, the results JSON doesn't store all units, just extracted, rejected, recovered.
        // But we can check if it's in ANY unit.
        let isLocalized = false;
        let isP1Found = false;
        let isRecovered = false;
        let isAuditFlagValid = false;
        
        const allUnits = [...result.extracted, ...result.rejected];
        for (const u of allUnits) {
            const unit = u.unit_id ? u : { unit_id: u.unit_id, source_text: u.source_text }; // Handle extracted format vs raw rejected format
            const st = unit.source_text ? normalizeQuote(unit.source_text) : "";
            // We can't perfectly recount localization without context_before/after, but we can check if the quote overlap is high in extraction
        }

        // Simpler evaluation: just check extraction arrays
        for (const ex of result.extracted) {
            if (ex.finding?.exact_quote) {
                if (computeWordOverlap(gold.quote, ex.finding.exact_quote) > 0.6) {
                    isP1Found = true;
                    isLocalized = true;
                    break;
                }
            }
        }
        
        for (const rec of result.recovered) {
            if (rec.finding?.exact_quote) {
                if (computeWordOverlap(gold.quote, rec.finding.exact_quote) > 0.6) {
                    isRecovered = true;
                    isAuditFlagValid = true;
                    isLocalized = true; // if it was recovered, it must have been localized
                    break;
                }
            }
        }

        if (isP1Found) {
            agg.p1BaselineOverall++;
            if (isCritical) agg.p1BaselineCritical++;
        }

        if (isP1Found || isRecovered) {
            agg.finalOverall++;
            if (isCritical) agg.finalCritical++;
        }
        
        if (isRecovered) agg.recoveredItems++;
        if (isAuditFlagValid) agg.validAuditFlags++;
    }
}

const latenciesSec = agg.p90Latencies.sort((a, b) => a - b);
const p90Latency = latenciesSec[Math.floor(latenciesSec.length * 0.9)] || 0;
const maxLatency = latenciesSec[latenciesSec.length - 1] || 0;

// Read Telemetry
const telemetryPath = path.join(outDir, 'global_telemetry.json');
if (fs.existsSync(telemetryPath)) {
    const globalTelemetry = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
    for (const t of globalTelemetry) {
        if (t.coverage) {
            for (const cat of Object.keys(t.coverage)) {
                const status = t.coverage[cat].status;
                if (agg.coverageStatusCount[status] !== undefined) {
                    agg.coverageStatusCount[status]++;
                }
            }
        }
    }
}

console.log(`Documents Evaluated: ${agg.docs}`);
console.log(`Total Gold Items: ${agg.totalGoldItems} (Critical: ${agg.criticalGoldItems})`);

const p1Crit = (agg.p1BaselineCritical / agg.criticalGoldItems * 100).toFixed(1);
const finalCrit = (agg.finalCritical / agg.criticalGoldItems * 100).toFixed(1);
const finalOverall = (agg.finalOverall / agg.totalGoldItems * 100).toFixed(1);

const recoveryYield = agg.totalAuditFlags > 0 ? (agg.recoveredItems / agg.totalAuditFlags * 100).toFixed(1) : "0.0";
const auditPrecision = agg.totalAuditFlags > 0 ? (agg.validAuditFlags / agg.totalAuditFlags * 100).toFixed(1) : "0.0";

console.log(`\n### BUILD-008P Benchmarks`);
console.log(`| Metric | Result | Target |`);
console.log(`| --- | --- | --- |`);
console.log(`| **P1 Baseline Critical Recall** | ${p1Crit}% | - |`);
console.log(`| **Final Critical Recall (+Recovery)**| **${finalCrit}%** | ≥90% |`);
console.log(`| **Overall Recall** | ${finalOverall}% | ≥80% |`);
console.log(`| **Recovery Yield** | ${recoveryYield}% | - |`);
console.log(`| **Audit Precision** | ${auditPrecision}% | - |`);
console.log(`| **p90 E2E Latency** | ${p90Latency.toFixed(1)}s | 75-90s |`);
console.log(`| **Max Latency** | ${maxLatency.toFixed(1)}s | ≤120s |`);

console.log(`\n### Coverage Telemetry (across ${agg.docs} documents)`);
console.log(`| Status | Count |`);
console.log(`| --- | --- |`);
console.log(`| ✅ COVERED | ${agg.coverageStatusCount.COVERED} |`);
console.log(`| ⚠️ REVIEW_REQUIRED | ${agg.coverageStatusCount.REVIEW_REQUIRED} |`);
console.log(`| ❌ EXTRACTION_UNCERTAIN | ${agg.coverageStatusCount.EXTRACTION_UNCERTAIN} |`);
