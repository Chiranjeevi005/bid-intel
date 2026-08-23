import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getCategoryCandidates } from '../../lib/ai/retrieval';
import { analyzeBatch, analyzeAdjudicator } from '../../lib/ai/provider';

function computeWordOverlap(s1: string, s2: string): number {
    const w1 = new Set(s1.toLowerCase().split(/\W+/).filter(x => x.length > 2));
    const w2 = new Set(s2.toLowerCase().split(/\W+/).filter(x => x.length > 2));
    let match = 0;
    for (const w of w1) {
        if (w2.has(w)) match++;
    }
    return match / Math.min(w1.size, w2.size);
}

const runName = 'build-008o';
const outDir = path.join(process.cwd(), 'benchmarks', runName, 'results');
fs.mkdirSync(outDir, { recursive: true });

const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const HARD_DOCS = ['DOC-006', 'DOC-008', 'DOC-010', 'DOC-011', 'DOC-012', 'DOC-013'];

function verifyEvidence(quote: string, docId: string): boolean {
    const textPath = path.join(process.cwd(), 'scratch_texts', `${docId}.txt`);
    if (!fs.existsSync(textPath)) return false;
    const rawText = fs.readFileSync(textPath, 'utf8').replace(/\s+/g, ' ');
    const normalizedQuote = quote.replace(/\s+/g, ' ').trim();
    if (normalizedQuote.length < 5) return false;
    return rawText.includes(normalizedQuote) || computeWordOverlap(rawText, normalizedQuote) > 0.8;
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

async function extractPages(docId: string): Promise<{ page_number: number; content: string }[]> {
    const textPath = path.join(process.cwd(), 'scratch_texts', `${docId}.txt`);
    if (fs.existsSync(textPath)) {
        const raw = fs.readFileSync(textPath, 'utf8');
        return parsePages(raw);
    }
    return [];
}

async function runO1Benchmark() {
    console.log(`Starting BUILD-008O Benchmark (Multi-Agent O1)...\n`);
    const globalTelemetry = {
        totalDocs: 0,
        totalCeilingHits: 0,
        totalSplits: 0,
        totalIdenticalRetries: 0,
    };

    const agents = [
        { name: 'ELIGIBILITY', target: 'ELIGIBILITY', deps: ['ELIGIBILITY'] },
        { name: 'DATES_SUBMISSION', target: 'DATES_SUBMISSION', deps: ['DATES_SUBMISSION'] },
        { name: 'COMMERCIAL', target: 'COMMERCIAL', deps: ['COMMERCIAL'] },
        { name: 'LIABILITY_RISK', target: 'LIABILITY_RISK', deps: ['LIABILITY_RISK', 'TERMINATION'] },
        { name: 'EVALUATION', target: 'EVALUATION', deps: ['EVALUATION'] }
    ];

    for (const doc of manifest) {
        if (!HARD_DOCS.includes(doc.id)) continue;
        console.log(`\nProcessing ${doc.id}...`);
        const startTime = Date.now();

        const pages = await extractPages(doc.id);
        const candidates = getCategoryCandidates(pages);

        // Pre-compute page inputs for each agent based on overlap logic
        const agentInputs = agents.map(agent => {
            const pageNums = new Set<number>();
            for (const dep of agent.deps) {
                const set = candidates.find(c => c.category === dep);
                if (set) {
                    set.context_pages.forEach(p => pageNums.add(p));
                }
            }
            const inputPages = Array.from(pageNums).sort((a,b)=>a-b).map(pn => pages.find(p => p.page_number === pn)).filter(Boolean) as {page_number: number, content: string}[];
            return { agent, inputPages };
        });

        // Run 5 agents concurrently
        const agentPromises = agentInputs.map(async ({ agent, inputPages }) => {
            if (inputPages.length === 0) return { agent: agent.name, findings: [] };
            
            // To prevent timeouts/huge inputs, we only pass up to 15 pages in this mock. 
            // In production, `splitter.ts` handles it, but we'll slice here to simulate constraints.
            const slice = inputPages.slice(0, 15);
            try {
                process.env.EXTRACTION_STRATEGY = 'O1'; // enforce router
                const res = await analyzeBatch(slice, `${doc.id}_${agent.name}`, agent.target);
                // Assign agent source to each finding
                const findings = res.result.findings.map((f: any) => ({ ...f, _sourceAgent: agent.name }));
                return { agent: agent.name, findings };
            } catch (e: any) {
                console.error(`[provider] Error running agent ${agent.name} on ${doc.id}:`, e.message);
                return { agent: agent.name, findings: [] };
            }
        });

        const agentResults = await Promise.all(agentPromises);
        
        let rawCandidateFindings: any[] = [];
        agentResults.forEach(res => {
            rawCandidateFindings.push(...res.findings);
        });

        // Deterministic Verification
        let verifiedUnion: any[] = [];
        for (const finding of rawCandidateFindings) {
            if (!finding.quotes || finding.quotes.length === 0) continue;
            let verifiedQuotes = finding.quotes.filter((q: any) => verifyEvidence(q.quote, doc.id));
            if (verifiedQuotes.length > 0) {
                verifiedUnion.push({
                    ...finding,
                    quotes: verifiedQuotes
                });
            }
        }

        // Adjudication (O3)
        let finalFindings: any[] = [];
        if (verifiedUnion.length > 0) {
            try {
                // Remove _sourceAgent before sending to adjudicator so it doesn't get confused
                const cleanUnion = verifiedUnion.map(({_sourceAgent, ...f}) => f);
                const adjRes = await analyzeAdjudicator(cleanUnion, `${doc.id}_ADJUDICATOR`);
                finalFindings = adjRes.result.findings;
            } catch(e: any) {
                console.error(`[provider] Error adjudicating ${doc.id}:`, e.message);
                finalFindings = verifiedUnion; // fallback if adjudicator fails
            }
        }

        const endTime = Date.now();
        const latency = (endTime - startTime) / 1000;

        const resultPayload = {
            metrics: {
                total_latency: latency,
                agents_completed: agentResults.map(r => r.agent),
                raw_findings_count: rawCandidateFindings.length,
                verified_union_count: verifiedUnion.length,
                final_findings_count: finalFindings.length
            },
            result: {
                verified_union: { findings: verifiedUnion },
                extraction: { findings: finalFindings }
            }
        };

        fs.writeFileSync(path.join(outDir, `${doc.id}_result.json`), JSON.stringify(resultPayload, null, 2));
    }

    console.log(`\nBenchmark Complete.`);
}

runO1Benchmark().catch(console.error);
