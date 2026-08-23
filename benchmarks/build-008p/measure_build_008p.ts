import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { getCategoryCandidates } from '../../lib/ai/retrieval';
import { segmentEvidenceUnits, EvidenceUnit } from '../../lib/ai/segmentation';
import { analyzeEvidenceUnit, auditRejectedUnits, recoverMissedUnit } from '../../lib/ai/provider';
import { Category } from '../../lib/ai/schema';
import { assessCriticalCoverage, CRITICAL_CATEGORIES } from '../../lib/ai/coverage';

const CONCURRENCY = parseInt(process.env.CONCURRENCY || "10");
console.log(`\n=== BUILD-008P Benchmarking (Concurrency: ${CONCURRENCY}) ===\n`);

const HARD_DOCS = ['DOC-006', 'DOC-008', 'DOC-010', 'DOC-011', 'DOC-012', 'DOC-013'];
const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const outDir = path.join(process.cwd(), 'benchmarks', 'build-008p', 'results');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}
// Clear telemetry for fresh run
const telemetryPath = path.join(outDir, 'global_telemetry.json');
if (fs.existsSync(telemetryPath)) {
    fs.unlinkSync(telemetryPath);
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

function normalizeQuote(q: string) {
    return q.replace(/\s+/g, ' ').toLowerCase().trim();
}

async function runBenchmark() {
    let globalGoldCount = 0;
    let globalLocalizedCount = 0;
    
    // Step 1: Gold Localization Check
    for (const doc of manifest) {
        if (!HARD_DOCS.includes(doc.id)) continue;

        const pages = await extractPages(doc.id);
        const candidates = getCategoryCandidates(pages);
        const units = segmentEvidenceUnits(doc.id, pages, candidates);

        const goldDir = path.join(process.cwd(), 'benchmarks', 'build-008h', 'gold-standards');
        const goldFile = path.join(goldDir, `${doc.id}.json`);
        if (!fs.existsSync(goldFile)) continue;

        const goldData = JSON.parse(fs.readFileSync(goldFile, 'utf8'));
        const goldItems = doc.id === 'DOC-001' ? goldData.items : goldData;

        for (const gold of goldItems) {
            globalGoldCount++;
            let found = false;
            const normGold = normalizeQuote(gold.quote);
            
            for (const unit of units) {
                const combinedContext = `${unit.context_before} ${unit.source_text} ${unit.context_after}`;
                if (normalizeQuote(combinedContext).includes(normGold)) {
                    found = true;
                    break;
                }
            }
            if (found) globalLocalizedCount++;
            else {
                console.log(`[LOCALIZATION MISS] DOC: ${doc.id} - ${gold.concept || gold.category}: ${normGold.substring(0, 50)}...`);
            }
        }
    }

    const locRate = (globalLocalizedCount / globalGoldCount) * 100;
    console.log(`\nGold Quote Localization Rate: ${locRate.toFixed(2)}% (${globalLocalizedCount}/${globalGoldCount})`);

    if (locRate < 95) {
        console.error("ABORTING: Localization rate is below 95%. Fix segmentation first.");
        return;
    }

    const limit = pLimit(CONCURRENCY);

    for (const doc of manifest) {
        if (!HARD_DOCS.includes(doc.id)) continue;
        console.log(`\nProcessing ${doc.id}...`);
        
        const pages = await extractPages(doc.id);
        const candidates = getCategoryCandidates(pages);
        const units = segmentEvidenceUnits(doc.id, pages, candidates);
        
        console.log(`Generated ${units.length} Evidence Units.`);
        
        const metrics: any = { id: doc.id, units_generated: units.length };
        const result: any = { id: doc.id, extracted: [], rejected: [], recovered: [], audit_flags: [] };
        
        const t0 = performance.now();
        let p1Fails = 0;
        
        // P1: Baseline Extraction
        const p1Tasks = units.map(unit => limit(async () => {
            try {
                const res = await analyzeEvidenceUnit(unit, "deepseek-chat");
                if (res.contains && res.finding?.exact_quote) {
                    
                    // P3: Evidence Verification (Strict substring check)
                    const sq = normalizeQuote(res.finding.exact_quote);
                    const st = normalizeQuote(unit.source_text);
                    if (st.includes(sq)) {
                        unit.status = 'EXTRACTED';
                        result.extracted.push({ unit_id: unit.unit_id, finding: res.finding });
                    } else {
                        // Verification failed
                        unit.status = 'REJECTED';
                        result.rejected.push(unit);
                    }
                } else {
                    unit.status = 'REJECTED';
                    result.rejected.push(unit);
                }
            } catch (e: any) {
                p1Fails++;
                unit.status = 'ERROR';
                if (p1Fails === 1) console.error("First P1 Error:", e);
            }
        }));

        await Promise.all(p1Tasks);
        metrics.p1_latency = (performance.now() - t0) / 1000;
        metrics.p1_fails = p1Fails;
        console.log(`P1 Complete: ${result.extracted.length} extracted, ${result.rejected.length} rejected, ${p1Fails} errors. Latency: ${metrics.p1_latency.toFixed(2)}s`);

        // P2: Coverage Audit
        const t1 = performance.now();
        let auditFlags: string[] = [];
        
        if (result.rejected.length > 0) {
            // Batch rejected units in chunks of 10 to avoid token limits
            const chunkLimit = pLimit(5); // run up to 5 audit batches concurrently
            const chunkSize = 10;
            const chunks = [];
            for (let i = 0; i < result.rejected.length; i += chunkSize) {
                chunks.push(result.rejected.slice(i, i + chunkSize));
            }
            
            const auditTasks = chunks.map(chunk => chunkLimit(async () => {
                try {
                    const res = await auditRejectedUnits(chunk, "deepseek-chat");
                    auditFlags.push(...res.missed_unit_ids);
                } catch (e) {
                    console.error("Audit batch failed", e);
                }
            }));
            await Promise.all(auditTasks);
        }
        
        metrics.p2_latency = (performance.now() - t1) / 1000;
        result.audit_flags = auditFlags;
        console.log(`P2 Complete: ${auditFlags.length} missed units flagged. Latency: ${metrics.p2_latency.toFixed(2)}s`);

        // P3: Targeted Recovery
        const t2 = performance.now();
        if (auditFlags.length > 0) {
            const recoveryTasks = auditFlags.map(id => limit(async () => {
                const unit = result.rejected.find((u: EvidenceUnit) => u.unit_id === id);
                if (unit) {
                    try {
                        const res = await recoverMissedUnit(unit, "deepseek-chat");
                        if (res.contains && res.finding?.exact_quote) {
                            const sq = normalizeQuote(res.finding.exact_quote);
                            const st = normalizeQuote(unit.source_text);
                            if (st.includes(sq)) {
                                result.recovered.push({ unit_id: unit.unit_id, finding: res.finding });
                            }
                        }
                    } catch (e) {
                        console.error(`Recovery failed for ${id}`, e);
                    }
                }
            }));
            await Promise.all(recoveryTasks);
        }
        metrics.p3_latency = (performance.now() - t2) / 1000;
        
        // P4: Coverage Assessment
        const t3 = performance.now();
        const allVerified = [...result.extracted, ...result.recovered];
        const coverageReport = assessCriticalCoverage(units, allVerified);
        metrics.coverage_latency = (performance.now() - t3) / 1000;
        metrics.total_latency = (performance.now() - t0) / 1000;
        
        result.coverage = coverageReport;
        
        fs.writeFileSync(path.join(outDir, `${doc.id}_result.json`), JSON.stringify({ metrics, result }, null, 2));
        
        // Generate Markdown Report
        let mdReport = `# Intelligence Report: ${doc.id}\n\n`;
        mdReport += `## Critical Coverage\n\n`;
        mdReport += `| Category | Status | Evidence | Analyst Action |\n`;
        mdReport += `|---|---|---|---|\n`;
        for (const cat of CRITICAL_CATEGORIES) {
            const cov = coverageReport[cat];
            let statusIcon = '❌ Extraction Uncertain';
            let action = 'Manual verification required';
            if (cov.status === 'COVERED') {
                statusIcon = '✅ Covered';
                action = '—';
            } else if (cov.status === 'REVIEW_REQUIRED') {
                statusIcon = '⚠️ Review Required';
                action = 'Review relevant sections';
            }
            
            let evidenceText = cov.status === 'COVERED' ? `${cov.verified_findings_count} findings` : 
                               cov.status === 'REVIEW_REQUIRED' ? `0 findings, ${cov.evidence_units_count} candidates` : 
                               `Insufficient coverage`;
            
            mdReport += `| ${cat} | ${statusIcon} | ${evidenceText} | ${action} |\n`;
        }
        
        mdReport += `\n## Verified Findings\n\n`;
        for (const vf of allVerified) {
            const finding = vf.finding;
            if (!finding) continue;
            mdReport += `### [${finding.category}] ${finding.title}\n`;
            mdReport += `**Priority:** ${finding.priority} | **Status:** ${finding.status}\n\n`;
            mdReport += `${finding.fact}\n\n`;
            if (finding.quotes) {
                for (const q of finding.quotes) {
                    mdReport += `> (Page ${q.page_number}): "${q.quote}"\n\n`;
                }
            }
        }
        
        fs.writeFileSync(path.join(outDir, `${doc.id}_report.md`), mdReport);

        // Update global telemetry
        let globalTelemetry: any[] = [];
        if (fs.existsSync(telemetryPath)) {
            globalTelemetry = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
        }
        globalTelemetry.push({
            doc_id: doc.id,
            metrics,
            coverage: coverageReport
        });
        fs.writeFileSync(telemetryPath, JSON.stringify(globalTelemetry, null, 2));

        console.log(`P3 Complete: ${result.recovered.length} recovered. Latency: ${metrics.p3_latency.toFixed(2)}s`);
        console.log(`Coverage check complete. Doc Total Latency: ${metrics.total_latency.toFixed(2)}s`);
    }
    
    console.log("\nBenchmark Complete.");
}

runBenchmark().catch(console.error);
