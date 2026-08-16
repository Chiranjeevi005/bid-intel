import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import { QUALIFICATION_SYSTEM_PROMPT, buildQualificationUserPrompt, SYSTEM_PROMPT, buildUserPrompt } from './lib/ai/prompts';

const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const docsToTest = ['DOC-007', 'DOC-013', 'DOC-006', 'DOC-008'];

function parsePages(rawText: string) {
    const parts = rawText.split(/---PAGE_(\d+)---/);
    const pages = [];
    for (let i = 1; i < parts.length; i += 2) {
        pages.push({ page_number: parseInt(parts[i]), content: parts[i+1].trim() });
    }
    return pages;
}

async function streamRequest(systemPrompt: string, userPrompt: string) {
    const start = performance.now();
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: model,
            messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userPrompt } ],
            stream: true,
            temperature: 0.1,
            // stream_options allows getting token usage in the final chunk for OpenAI compatible APIs
            stream_options: { include_usage: true } 
        })
    });
    
    if (!res.ok) throw new Error("API call failed: " + await res.text());
    
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No reader");
    
    let ttft = -1;
    let fullText = "";
    let usage = null;
    
    while (true) {
        const { done, value } = await reader.read();
        if (ttft === -1) {
            ttft = performance.now();
        }
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
            if (line === 'data: [DONE]') continue;
            try {
                const data = JSON.parse(line.slice(6));
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
}

async function runDiagnostic() {
    console.log("=== BUILD-008I-0 LATENCY DECOMPOSITION ===\n");
    let mdOutput = `| Document | Pages | Qual TTFT | Qual Gen | Qual Total | Ext TTFT | Ext Gen | Ext Total | Total E2E | Tokens (In/Out) |\n`;
    mdOutput +=    `| -------- | ----: | --------: | -------: | ---------: | -------: | ------: | --------: | --------: | --------------: |\n`;
    
    for (const docId of docsToTest) {
        console.log(`Processing ${docId}...`);
        const textPath = path.join(process.cwd(), 'scratch_texts', `${docId}.txt`);
        const pages = parsePages(fs.readFileSync(textPath, 'utf8'));
        
        const qualUserPrompt = buildQualificationUserPrompt(pages);
        const extUserPrompt = buildUserPrompt(pages);
        
        let qualMetrics, extMetrics;
        
        try {
            qualMetrics = await streamRequest(QUALIFICATION_SYSTEM_PROMPT, qualUserPrompt);
            extMetrics = await streamRequest(SYSTEM_PROMPT, extUserPrompt);
        } catch (e: any) {
            console.error(`Error on ${docId}:`, e.message);
            continue;
        }
        
        let totalE2E = qualMetrics.total_ms + extMetrics.total_ms;
        let tokensIn = (qualMetrics.usage?.prompt_tokens || 0) + (extMetrics.usage?.prompt_tokens || 0);
        let tokensOut = (qualMetrics.usage?.completion_tokens || 0) + (extMetrics.usage?.completion_tokens || 0);
        
        mdOutput += `| ${docId} | ${pages.length} | ${(qualMetrics.ttft_ms).toFixed(0)}ms | ${(qualMetrics.generation_ms).toFixed(0)}ms | ${(qualMetrics.total_ms).toFixed(0)}ms | ${(extMetrics.ttft_ms).toFixed(0)}ms | ${(extMetrics.generation_ms).toFixed(0)}ms | ${(extMetrics.total_ms).toFixed(0)}ms | ${(totalE2E).toFixed(0)}ms | ${tokensIn} / ${tokensOut} |\n`;
        
        console.log(`\n${docId} Details:`);
        console.log(`Qualification: TTFT=${(qualMetrics.ttft_ms/1000).toFixed(2)}s, Gen=${(qualMetrics.generation_ms/1000).toFixed(2)}s, Tokens In=${qualMetrics.usage?.prompt_tokens}`);
        console.log(`Extraction:    TTFT=${(extMetrics.ttft_ms/1000).toFixed(2)}s, Gen=${(extMetrics.generation_ms/1000).toFixed(2)}s, Tokens In=${extMetrics.usage?.prompt_tokens}`);
        console.log(`Total E2E: ${(totalE2E/1000).toFixed(2)}s\n`);
    }
    
    fs.writeFileSync('build_008i_0_results.md', mdOutput);
    console.log("Diagnostic complete.");
}

runDiagnostic();
