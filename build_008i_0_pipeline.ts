import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import * as fs from 'fs';
import * as path from 'path';
import { QUALIFICATION_SYSTEM_PROMPT, buildQualificationUserPrompt, SYSTEM_PROMPT, buildUserPrompt } from './lib/ai/prompts';
import { DocumentQualificationSchema } from './lib/ai/qualification';
import { AnalysisResultSchema } from './lib/ai/schema';
import { verifyQuote } from './lib/ai/validator';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const docsToTest = ['DOC-007', 'DOC-013', 'DOC-006', 'DOC-008'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parsePages(rawText: string) {
    const parts = rawText.split(/---PAGE_(\d+)---/);
    const pages = [];
    for (let i = 1; i < parts.length; i += 2) {
        pages.push({ page_number: parseInt(parts[i]), content: parts[i+1].trim() });
    }
    return pages;
}

async function streamRequest(systemPrompt: string, userPrompt: string, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const start = performance.now();
        try {
            const res = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model,
                    messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userPrompt } ],
                    stream: true,
                    temperature: 0.1,
                    stream_options: { include_usage: true },
                    thinking: { type: "disabled" },
                    response_format: { type: "json_object" }
                })
            });
            
            if (!res.ok) throw new Error("API call failed: " + await res.text());
            
            const reader = res.body?.getReader();
            if (!reader) throw new Error("No reader");
            
            let ttft = -1;
            let fullText = "";
            let usage = null;
            let buffer = "";
            const decoder = new TextDecoder("utf-8");
            
            while (true) {
                const { done, value } = await reader.read();
                if (ttft === -1) {
                    ttft = performance.now();
                }
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || "";
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: ')) continue;
                    if (trimmed === 'data: [DONE]') continue;
                    
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        if (data.choices && data.choices[0] && data.choices[0].delta.content) {
                            fullText += data.choices[0].delta.content;
                        }
                        if (data.usage) {
                            usage = data.usage;
                        }
                    } catch (e) {}
                }
            }
            const end = performance.now();
            
            return {
                total_ms: end - start,
                ttft_ms: ttft - start,
                generation_ms: end - ttft,
                text: fullText,
                usage: usage
            };
        } catch (e: any) {
            console.error(`Attempt ${attempt} failed:`, e.message);
            if (attempt === retries) throw e;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

async function runDiagnostic() {
    console.log("=== BUILD-008I-0 LATENCY DECOMPOSITION ===");
    
    let results: any[] = [];
    
    for (const docId of docsToTest) {
        console.log(`\n--- Processing ${docId} ---`);
        const textPath = path.join(process.cwd(), 'scratch_texts', `${docId}.txt`);
        const pages = parsePages(fs.readFileSync(textPath, 'utf8'));
        
        const qualUserPrompt = buildQualificationUserPrompt(pages);
        const extUserPrompt = buildUserPrompt(pages);
        
        let qualMetrics, extMetrics;
        let zodQualMs = 0, zodExtMs = 0;
        let evidenceValidationMs = 0;
        let persistenceMs = 0;
        
        let parsedQual: any;
        try {
            console.log("Running Qualification...");
            qualMetrics = await streamRequest(QUALIFICATION_SYSTEM_PROMPT, qualUserPrompt);
            
            const zodStart = performance.now();
            parsedQual = JSON.parse(qualMetrics.text);
            const valResult = DocumentQualificationSchema.safeParse(parsedQual);
            if (!valResult.success) {
                console.warn(`Zod Qualification Validation Failed for ${docId}:`, JSON.stringify(valResult.error.issues));
            }
            zodQualMs = performance.now() - zodStart;
        } catch (e: any) {
            console.error(`Error on Qualification ${docId}:`, e.message);
            // We need qualMetrics to exist to prevent errors below, initialize empty if failed
            qualMetrics = qualMetrics || { total_ms: 0, ttft_ms: 0, generation_ms: 0, text: "", usage: null };
        }
        
        // Extraction / Intelligence Phase
        let parsedExt: any = null;
        try {
            console.log("Running Intelligence...");
            extMetrics = await streamRequest(SYSTEM_PROMPT, extUserPrompt);
            
            const zodStart = performance.now();
            parsedExt = JSON.parse(extMetrics.text);
            const valResult = AnalysisResultSchema.safeParse(parsedExt);
            if (!valResult.success) {
                console.warn(`Zod Intelligence Validation Failed for ${docId}:`, JSON.stringify(valResult.error.issues));
            }
            zodExtMs = performance.now() - zodStart;
        } catch (e: any) {
            console.error(`Error on Intelligence ${docId}:`, e.message);
            extMetrics = extMetrics || { total_ms: 0, ttft_ms: 0, generation_ms: 0, text: "", usage: null };
        }
        
        // Evidence Validation Phase
        console.log("Running Evidence Validation...");
        const evidenceStart = performance.now();
        let validFindingsCount = 0;
        let validQuotesCount = 0;
        const validFindingsToInsert = [];
        const validQuotesToInsert = [];
        const runId = crypto.randomUUID();
        const documentId = crypto.randomUUID();

        if (parsedExt && parsedExt.findings) {
            for (const finding of parsedExt.findings) {
                if (finding.status !== 'CONFIRMED' || !finding.quotes || finding.quotes.length === 0) continue;
                let allQuotesValid = true;
                for (const q of finding.quotes) {
                    const sourcePage = pages.find((p: any) => p.page_number === q.page_number);
                    if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
                        allQuotesValid = false;
                        break;
                    }
                }
                if (allQuotesValid) {
                    validFindingsCount++;
                    const findingId = crypto.randomUUID();
                    validFindingsToInsert.push({
                        id: findingId,
                        analysis_run_id: runId,
                        document_id: documentId,
                        category: finding.category,
                        title: finding.title,
                        finding: finding.fact,
                        severity: finding.priority,
                        confidence: finding.confidence
                    });
                    for (const q of finding.quotes) {
                        validQuotesCount++;
                        validQuotesToInsert.push({
                            finding_id: findingId,
                            page_number: q.page_number,
                            quote_text: q.quote
                        });
                    }
                }
            }
        }
        evidenceValidationMs = performance.now() - evidenceStart;
        
        // Persistence Phase
        console.log("Running Persistence...");
        const persistStart = performance.now();
        const userId = crypto.randomUUID();
        
        await supabase.from('documents').insert({
            id: documentId,
            user_id: userId,
            filename: `${docId}_diagnostic.pdf`,
            status: 'TEXT_EXTRACTED'
        });
        
        await supabase.from('analysis_runs').insert({
            id: runId,
            document_id: documentId,
            status: 'COMPLETED'
        });
        
        if (validFindingsToInsert.length > 0) {
            await supabase.from('analysis_findings').insert(validFindingsToInsert);
        }
        if (validQuotesToInsert.length > 0) {
            await supabase.from('analysis_finding_quotes').insert(validQuotesToInsert);
        }
        
        await supabase.from('analysis_metrics').insert({
            run_id: runId,
            document_id: documentId,
            step_name: 'diagnostic',
            duration_ms: Math.round(extMetrics.total_ms),
            prompt_tokens: extMetrics.usage?.prompt_tokens,
            completion_tokens: extMetrics.usage?.completion_tokens,
            total_tokens: extMetrics.usage?.total_tokens,
            reasoning_tokens: extMetrics.usage?.completion_tokens_details?.reasoning_tokens || 0,
            cached_tokens: extMetrics.usage?.prompt_cache_hit_tokens || 0,
            estimated_cost_cents: 0
        });
        persistenceMs = performance.now() - persistStart;
        
        const totalZodMs = zodQualMs + zodExtMs;
        const totalTokensIn = (qualMetrics.usage?.prompt_tokens || 0) + (extMetrics.usage?.prompt_tokens || 0);
        const totalTokensOut = (qualMetrics.usage?.completion_tokens || 0) + (extMetrics.usage?.completion_tokens || 0);
        const totalReasoning = (qualMetrics.usage?.completion_tokens_details?.reasoning_tokens || 0) + (extMetrics.usage?.completion_tokens_details?.reasoning_tokens || 0);
        const totalCached = (qualMetrics.usage?.prompt_cache_hit_tokens || 0) + (extMetrics.usage?.prompt_cache_hit_tokens || 0);
        
        results.push({
            document: docId,
            pages: pages.length,
            qualification_ms: qualMetrics.total_ms,
            qualification_ttft_ms: qualMetrics.ttft_ms,
            qualification_generation_ms: qualMetrics.generation_ms,
            intelligence_ms: extMetrics.total_ms,
            intelligence_ttft_ms: extMetrics.ttft_ms,
            intelligence_generation_ms: extMetrics.generation_ms,
            zod_ms: totalZodMs,
            evidence_validation_ms: evidenceValidationMs,
            persistence_ms: persistenceMs,
            prompt_tokens: totalTokensIn,
            cached_tokens: totalCached,
            completion_tokens: totalTokensOut,
            reasoning_tokens: totalReasoning
        });
    }
    
    // Output Markdown Table
    let md = `## BUILD-008I-0 Latency Decomposition Results\n\n`;
    md += `| Document | Pages | Qual TTFT | Qual Gen | Intel TTFT | Intel Gen | Zod | Ev Val | Persist | Tokens (In / Cache / Out) |\n`;
    md += `| -------- | ----: | --------: | -------: | ---------: | --------: | --: | -----: | ------: | ------------------------: |\n`;
    
    for (const r of results) {
        md += `| ${r.document} | ${r.pages} | ${Math.round(r.qualification_ttft_ms)}ms | ${Math.round(r.qualification_generation_ms)}ms | ${Math.round(r.intelligence_ttft_ms)}ms | ${Math.round(r.intelligence_generation_ms)}ms | ${Math.round(r.zod_ms)}ms | ${Math.round(r.evidence_validation_ms)}ms | ${Math.round(r.persistence_ms)}ms | ${r.prompt_tokens} / ${r.cached_tokens} / ${r.completion_tokens} |\n`;
    }
    
    md += `\n### Detailed Breakdown\n`;
    md += '```json\n' + JSON.stringify(results, null, 2) + '\n```\n';
    
    fs.writeFileSync('build_008i_0_decomposition.md', md);
    console.log("\nResults written to build_008i_0_decomposition.md");
}

runDiagnostic();
