import fs from 'fs';
import path from 'path';

const runName = process.argv[2] || 'build-008h';
const outDir = path.join(process.cwd(), 'benchmarks', runName, 'results');
const goldDir = path.join(process.cwd(), 'benchmarks', 'build-008h', 'gold-standards'); // Gold standards are in build-008h
const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Cost per token (DeepSeek v4 Flash approx: $0.14/1M input, $0.28/1M output)
const COST_IN_PER_TOKEN = 0.14 / 1000000;
const COST_OUT_PER_TOKEN = 0.28 / 1000000;

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
    qualFar: 0, qualFrr: 0, qualTotalNon: 0, qualTotalProc: 0,
    critRecallSum: 0, critTotalSum: 0,
    highRecallSum: 0, highTotalSum: 0,
    goldRecallSum: 0, goldTotalSum: 0,
    evidenceAccepted: 0, evidenceGenerated: 0,
    critEvidenceFailed: 0, critEvidenceGenerated: 0,
    latencies: [] as number[],
    costs: [] as number[]
};

let perDocTable = `| ID | Type | Pages | Qualification | Gold Items | Recalled | Critical Recall | Evidence | E2E | Cost |\n| -------- | ---- | ----: | :---: | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
let failureRegister = `\n# Failure Register\n`;
let latencyDecomposition = `\n# Latency Decomposition (Per Document)\n\n`;

for (const doc of manifest) {
    const resFile = path.join(outDir, `${doc.id}_result.json`);
    const goldFile = path.join(goldDir, `${doc.id}${doc.id === 'DOC-001' ? '.json' : '.json'}`); // 002-005 are .txt normally, wait we handled them manually in generate_gold as .txt
    
    if (!fs.existsSync(resFile)) {
        console.log(`Missing result for ${doc.id}`);
        continue;
    }
    const { metrics, result } = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    agg.docs++;

    let isGoldProc = (doc.expected_qualification === 'PROCUREMENT' || doc.expected_qualification === 'DECEPTIVE');
    let isModelProc = result.qualification.is_procurement_opportunity;
    
    let qualStatus = "PASS";
    if (isGoldProc && !isModelProc) { agg.qualFrr++; agg.qualTotalProc++; qualStatus = "FAIL (FRR)"; }
    else if (!isGoldProc && isModelProc) { agg.qualFar++; agg.qualTotalNon++; qualStatus = "FAIL (FAR)"; }
    else if (isGoldProc) { agg.qualTotalProc++; }
    else { agg.qualTotalNon++; }

    let goldItems: any[] = [];
    if (isGoldProc) {
        if (fs.existsSync(goldFile)) {
            const goldData = JSON.parse(fs.readFileSync(goldFile, 'utf8'));
            goldItems = doc.id === 'DOC-001' ? goldData.items : goldData;
        }
    }

    let modelItems = result.extraction?.findings || [];
    let recalled = new Set<number>();
    
    // Evaluate Evidence
    let docEvAcc = 0;
    let docEvGen = 0;
    for (const m of modelItems) {
        let isCrit = m.priority === 'CRITICAL';
        if (m.quotes) {
            for (const q of m.quotes) {
                docEvGen++;
                agg.evidenceGenerated++;
                if (isCrit) agg.critEvidenceGenerated++;
                
                let verified = verifyEvidence(q.quote, doc.id);
                if (verified) {
                    docEvAcc++;
                    agg.evidenceAccepted++;
                } else {
                    if (isCrit) agg.critEvidenceFailed++;
                    failureRegister += `\n**DOC: ${doc.id}**\nEvidence failure:\n  - Generated quote: "${q.quote}"\n  - Verification result: FAIL\n  - Customer impact: ${m.priority}\n  - Root cause: Evidence Generation\n`;
                }
            }
        }
    }

    // Evaluate Recall
    for (let i = 0; i < goldItems.length; i++) {
        let matched = false;
        const g = goldItems[i];
        for (const m of modelItems) {
            if (m.quotes && m.quotes.some((q: any) => computeWordOverlap(q.quote, g.quote) > 0.5)) {
                matched = true;
                break;
            }
        }
        if (matched) {
            recalled.add(i);
        } else {
            failureRegister += `\n**DOC: ${doc.id}**\nMissed:\n  - Gold concept: ${g.concept}\n  - Priority: ${g.priority}\n  - Expected page: ${g.page_number}\n  - Root cause: Matching / Extraction\n`;
        }
    }

    let docCritTotal = goldItems.filter(g => g.priority === 'CRITICAL').length;
    let docCritRecalled = goldItems.filter((g, i) => g.priority === 'CRITICAL' && recalled.has(i)).length;
    let docHighTotal = goldItems.filter(g => g.priority === 'HIGH').length;
    let docHighRecalled = goldItems.filter((g, i) => g.priority === 'HIGH' && recalled.has(i)).length;

    agg.critTotalSum += docCritTotal;
    agg.critRecallSum += docCritRecalled;
    agg.highTotalSum += docHighTotal;
    agg.highRecallSum += docHighRecalled;
    agg.goldTotalSum += goldItems.length;
    agg.goldRecallSum += recalled.size;

    let e2e = (metrics.total_latency / 1000).toFixed(2);
    agg.latencies.push(metrics.total_latency);
    
    let cost = (metrics.qual_usage.prompt_tokens * COST_IN_PER_TOKEN) + (metrics.qual_usage.completion_tokens * COST_OUT_PER_TOKEN);
    if (metrics.ext_usage) {
        cost += (metrics.ext_usage.prompt_tokens * COST_IN_PER_TOKEN) + (metrics.ext_usage.completion_tokens * COST_OUT_PER_TOKEN);
    }
    agg.costs.push(cost);

    let pagesCount = 1;
    let textPath = path.join(process.cwd(), 'scratch_texts', `${doc.id}.txt`);
    if (fs.existsSync(textPath)) {
        pagesCount = (fs.readFileSync(textPath, 'utf8').match(/---PAGE_/g) || []).length || 1;
    }
    
    let evStr = docEvGen > 0 ? `${((docEvAcc/docEvGen)*100).toFixed(1)}%` : 'N/A';
    perDocTable += `| ${doc.id} | ${doc.expected_type} | ${pagesCount} | ${qualStatus} | ${goldItems.length} | ${recalled.size} | ${docCritRecalled}/${docCritTotal} | ${evStr} | ${e2e}s | $${cost.toFixed(4)} |\n`;

    if (runName === 'build-008i' && isModelProc) {
        latencyDecomposition += `**${doc.id}**\n`;
        latencyDecomposition += `Queue wait:       N/A (Local Runner)\n`;
        latencyDecomposition += `Qualification:    ${(metrics.qual_latency/1000).toFixed(1)}s\n`;
        latencyDecomposition += `Mapping:          ${(metrics.mapping_latency/1000).toFixed(1)}s\n`;
        latencyDecomposition += `Extraction:       ${(metrics.extraction_latency/1000).toFixed(1)}s\n`;
        latencyDecomposition += `Reasoning:        ${(metrics.reasoning_latency/1000).toFixed(1)}s\n`;
        latencyDecomposition += `Validation:       N/A (Local Runner)\n`;
        latencyDecomposition += `-----------------------\n`;
        latencyDecomposition += `E2E:              ${e2e}s\n\n`;
    }
}

// Compute Aggregates
agg.latencies.sort((a,b) => a-b);
let p50 = agg.latencies[Math.floor(agg.latencies.length * 0.5)] / 1000;
let p90 = agg.latencies[Math.floor(agg.latencies.length * 0.9)] / 1000;
let max = agg.latencies[agg.latencies.length - 1] / 1000;

agg.costs.sort((a,b) => a-b);
let avgCost = agg.costs.reduce((a,b) => a+b, 0) / agg.costs.length;
let p90Cost = agg.costs[Math.floor(agg.costs.length * 0.9)];

let aggTable = `| Metric | Result |\n| ------ | ------ |\n`;
aggTable += `| Documents | ${agg.docs} |\n`;
aggTable += `| Qualification FAR | ${agg.qualTotalNon > 0 ? ((agg.qualFar/agg.qualTotalNon)*100).toFixed(1) : 0}% |\n`;
aggTable += `| Qualification FRR | ${agg.qualTotalProc > 0 ? ((agg.qualFrr/agg.qualTotalProc)*100).toFixed(1) : 0}% |\n`;
aggTable += `| Critical Recall | ${agg.critTotalSum > 0 ? ((agg.critRecallSum/agg.critTotalSum)*100).toFixed(1) : 0}% |\n`;
aggTable += `| High Recall | ${agg.highTotalSum > 0 ? ((agg.highRecallSum/agg.highTotalSum)*100).toFixed(1) : 0}% |\n`;
aggTable += `| Overall Gold Recall | ${agg.goldTotalSum > 0 ? ((agg.goldRecallSum/agg.goldTotalSum)*100).toFixed(1) : 0}% |\n`;
aggTable += `| Critical Miss Rate | ${agg.critTotalSum > 0 ? (((agg.critTotalSum - agg.critRecallSum)/agg.critTotalSum)*100).toFixed(1) : 0}% |\n`;
aggTable += `| Evidence Acceptance | ${agg.evidenceGenerated > 0 ? ((agg.evidenceAccepted/agg.evidenceGenerated)*100).toFixed(1) : 0}% |\n`;
aggTable += `| Critical Evidence Failure | ${agg.critEvidenceGenerated > 0 ? ((agg.critEvidenceFailed/agg.critEvidenceGenerated)*100).toFixed(1) : 0}% |\n`;
aggTable += `| p50 E2E | ${p50.toFixed(2)}s |\n`;
aggTable += `| p90 E2E | ${p90.toFixed(2)}s |\n`;
aggTable += `| Max E2E | ${max.toFixed(2)}s |\n`;
aggTable += `| Avg Cost | $${avgCost.toFixed(4)} |\n`;
aggTable += `| p90 Cost | $${p90Cost.toFixed(4)} |\n`;

console.log('--- AGGREGATE METRICS ---');
console.log(aggTable);
console.log('\n--- PER DOCUMENT METRICS ---');
console.log(perDocTable);
console.log(latencyDecomposition);
console.log(failureRegister);

fs.writeFileSync(path.join(outDir, 'final_report.md'), aggTable + '\n' + perDocTable + '\n' + latencyDecomposition + failureRegister);
