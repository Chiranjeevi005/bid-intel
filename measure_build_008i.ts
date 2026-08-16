import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import { QUALIFICATION_SYSTEM_PROMPT, buildQualificationUserPrompt } from './lib/ai/prompts';
import { mapDocumentPages } from './lib/ai/mapping';
import { consolidatePageSignals } from './lib/ai/retrieval';
import { analyzeBatch, reasoningReview } from './lib/ai/provider';
import { Category, Finding } from './lib/ai/schema';

const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

const manifestPath = path.join(process.cwd(), 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const outDir = path.join(process.cwd(), 'benchmarks', 'build-008i', 'results');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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

async function makeRequest(systemPrompt: string, userPrompt: string) {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: model,
            messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userPrompt } ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            thinking: { type: "disabled" }
        })
    });
    if (!res.ok) {
        console.error("API error:", await res.text());
        throw new Error("API call failed");
    }
    return res.json();
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            console.log(`Error during execution, retrying (${i + 1}/${retries})...`, error.message);
            if (i === retries - 1) throw error;
        }
    }
    throw new Error("Unreachable");
}

async function runBenchmark() {
    console.log("Starting BUILD-008I Benchmark Execution...");
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

        try {
            // 1. Qualification
            const qualStart = performance.now();
            const qualUserPrompt = buildQualificationUserPrompt(pages);
            const qualRes = await makeRequest(QUALIFICATION_SYSTEM_PROMPT, qualUserPrompt);
            metrics.qual_latency = performance.now() - qualStart;
            metrics.qual_usage = qualRes.usage;
            result.qualification = JSON.parse(qualRes.choices[0].message.content);

            // 2. Extraction (4-stage pipeline)
            if (result.qualification.is_procurement_opportunity) {
                let totalTokens = 0;
                let promptTokens = 0;
                let completionTokens = 0;
                let cachedTokens = 0;

                const addUsage = (usage: any) => {
                    if (!usage) return;
                    totalTokens += usage.total_tokens || 0;
                    promptTokens += usage.prompt_tokens || 0;
                    completionTokens += usage.completion_tokens || 0;
                    cachedTokens += usage.cached_tokens || usage.prompt_cache_hit_tokens || 0;
                };

                // Stage 1 & 2
                const mapStart = performance.now();
                const { result: mapResult, usage: mapUsage } = await withRetry(() => mapDocumentPages(pages));
                const consolidated = consolidatePageSignals(pages, mapResult.page_maps);
                metrics.mapping_latency = performance.now() - mapStart;
                addUsage(mapUsage);

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

                // Stage 3 (Parallel Extraction)
                const extStart = performance.now();
                const extResults = await Promise.all(batches.map(b => withRetry(() => analyzeBatch(b.pages, b.name))));
                metrics.extraction_latency = performance.now() - extStart;

                const allFindings: Finding[] = [];
                for (const r of extResults) {
                    allFindings.push(...r.result.findings);
                    addUsage(r.usage);
                }

                // Stage 4 (Parallel Reasoning)
                const reasonStart = performance.now();
                const finalFindings: Finding[] = [];
                const toReason = allFindings.filter(f => f.requires_reasoning_review);
                const notReason = allFindings.filter(f => !f.requires_reasoning_review);

                const reasonPromises = toReason.map(finding => {
                    const pageNumbers = finding.quotes?.map(q => q.page_number) || [];
                    const contextPages = pages.filter(p => pageNumbers.includes(p.page_number));
                    return withRetry(() => reasoningReview(finding, contextPages));
                });

                const reasonResults = await Promise.all(reasonPromises);
                metrics.reasoning_latency = performance.now() - reasonStart;

                finalFindings.push(...notReason);
                for (const r of reasonResults) {
                    finalFindings.push(r.result);
                    addUsage(r.usage);
                }

                result.extraction = { findings: finalFindings };
                metrics.ext_usage = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens, cached_tokens: cachedTokens };
                metrics.ext_latency = metrics.mapping_latency + metrics.extraction_latency + metrics.reasoning_latency;

            } else {
                result.extraction = null;
                metrics.mapping_latency = 0;
                metrics.extraction_latency = 0;
                metrics.reasoning_latency = 0;
                metrics.ext_latency = 0;
                metrics.ext_usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cached_tokens: 0 };
            }

            metrics.total_latency = performance.now() - totalStart;
        } catch (error: any) {
            console.error(`Document ${doc.id} failed after retries:`, error.message);
            result.error = error.message;
            result.extraction = null;
            if (!result.qualification) {
                result.qualification = { is_procurement_opportunity: false };
            }
            metrics.total_latency = performance.now() - totalStart;
        }

        // Save
        fs.writeFileSync(path.join(outDir, `${doc.id}_result.json`), JSON.stringify({ metrics, result }, null, 2));
    }
    console.log("Benchmark Execution Complete.");
}

runBenchmark().catch(console.error);
