import fs from 'fs';
import path from 'path';

const runName = 'build-008o';
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

let agg = {
    docs: 0,
    totalGoldItems: 0,
    criticalGoldItems: 0,
    
    unionOverallRecalled: 0,
    unionCriticalRecalled: 0,
    
    finalOverallRecalled: 0,
    finalCriticalRecalled: 0,
    
    documentAborts: 0,
    latencies: [] as number[],
};

// Agent Matrix: keeps track of which agent found which gold item overall
let agentContributions: Record<string, { total: number, critical: number }> = {
    ELIGIBILITY: { total: 0, critical: 0 },
    DATES_SUBMISSION: { total: 0, critical: 0 },
    COMMERCIAL: { total: 0, critical: 0 },
    LIABILITY_RISK: { total: 0, critical: 0 },
    EVALUATION: { total: 0, critical: 0 }
};

let failureLog = "";
let matrixLog = "| Gold Item ID (Doc-Idx) | ELIGIBILITY | DATES | COMMERCIAL | LEGAL | EVALUATION | UNION | FINAL |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n";

console.log("Evaluating BUILD-008O Benchmark (Multi-Agent Coverage)\n");

for (const doc of manifest) {
    if (!HARD_DOCS.includes(doc.id)) continue;

    const resFile = path.join(outDir, `${doc.id}_result.json`);
    const goldFile = path.join(goldDir, `${doc.id}.json`); 
    
    if (!fs.existsSync(resFile)) {
        agg.documentAborts++;
        continue;
    }
    const { metrics, result } = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    agg.docs++;
    agg.latencies.push(metrics.total_latency * 1000); // ms

    if (!fs.existsSync(goldFile)) continue;

    const goldData = JSON.parse(fs.readFileSync(goldFile, 'utf8'));
    const goldItems = doc.id === 'DOC-001' ? goldData.items : goldData;

    let unionItems = result.verified_union?.findings || [];
    let finalItems = result.extraction?.findings || [];

    for (let i = 0; i < goldItems.length; i++) {
        const gold = goldItems[i];
        agg.totalGoldItems++;
        let isCritical = (gold.priority === 'CRITICAL');
        if (isCritical) agg.criticalGoldItems++;

        let foundByAgents = new Set<string>();
        let unionFound = false;
        let finalFound = false;

        // Check Union
        for (const m of unionItems) {
            if (m.quotes) {
                for (const q of m.quotes) {
                    if (computeWordOverlap(gold.quote, q.quote) > 0.6) {
                        unionFound = true;
                        if (m._sourceAgent) foundByAgents.add(m._sourceAgent);
                    }
                }
            }
        }

        // Check Final (Adjudicated)
        for (const m of finalItems) {
            if (m.quotes) {
                for (const q of m.quotes) {
                    if (computeWordOverlap(gold.quote, q.quote) > 0.6) {
                        finalFound = true;
                    }
                }
            }
        }

        if (unionFound) {
            agg.unionOverallRecalled++;
            if (isCritical) agg.unionCriticalRecalled++;
            
            for (const agent of foundByAgents) {
                if (agentContributions[agent]) {
                    agentContributions[agent].total++;
                    if (isCritical) agentContributions[agent].critical++;
                }
            }
        } else {
            failureLog += `[DOC: ${doc.id}] UNION_MISS: "${gold.fact}" (Page ${gold.page_number})\n`;
        }

        if (finalFound) {
            agg.finalOverallRecalled++;
            if (isCritical) agg.finalCriticalRecalled++;
        }

        matrixLog += `| ${doc.id}-${i} | ${foundByAgents.has('ELIGIBILITY')?'✓':'✗'} | ${foundByAgents.has('DATES_SUBMISSION')?'✓':'✗'} | ${foundByAgents.has('COMMERCIAL')?'✓':'✗'} | ${foundByAgents.has('LIABILITY_RISK')?'✓':'✗'} | ${foundByAgents.has('EVALUATION')?'✓':'✗'} | ${unionFound?'✓':'✗'} | ${finalFound?'✓':'✗'} |\n`;
    }
}

const latenciesSec = agg.latencies.map(l => l / 1000).sort((a, b) => a - b);
const p50Latency = latenciesSec[Math.floor(latenciesSec.length * 0.5)] || 0;
const p90Latency = latenciesSec[Math.floor(latenciesSec.length * 0.9)] || 0;

console.log(`Documents Evaluated: ${agg.docs}`);
console.log(`Total Gold Items: ${agg.totalGoldItems} (Critical: ${agg.criticalGoldItems})`);

const unionCritRec = (agg.unionCriticalRecalled / agg.criticalGoldItems * 100).toFixed(1);
const finalCritRec = (agg.finalCriticalRecalled / agg.criticalGoldItems * 100).toFixed(1);

console.log(`\n### BUILD-008O Multi-Agent Results`);
console.log(`| Metric | Result |`);
console.log(`| --- | --- |`);
console.log(`| **Union Critical Recall** (Pre-Adjudicator) | ${unionCritRec}% |`);
console.log(`| **Final Critical Recall** (Post-Adjudicator)| ${finalCritRec}% |`);
console.log(`| **p90 E2E Latency** | ${p90Latency.toFixed(1)}s |`);

console.log(`\n### Agent Contribution Matrix`);
console.log(`| Agent | Total Found | Critical Found |`);
console.log(`| --- | --- | --- |`);
for (const [agent, stats] of Object.entries(agentContributions)) {
    console.log(`| ${agent} | ${stats.total} | ${stats.critical} |`);
}

fs.writeFileSync(path.join(outDir, 'agent_matrix.md'), matrixLog);
if (failureLog.length > 0) fs.writeFileSync(path.join(outDir, 'failure_log.txt'), failureLog);

console.log(`\nDetailed matrix saved to benchmarks/build-008o/results/agent_matrix.md`);
