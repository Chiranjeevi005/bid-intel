import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

async function testStream() {
    const start = performance.now();
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: model,
            messages: [ { role: "user", content: "Say hello and explain the universe in 10 words." } ],
            stream: true
        })
    });
    
    if (!res.ok) {
        console.error("API error:", await res.text());
        return;
    }
    
    const reader = res.body?.getReader();
    if (!reader) return;
    
    let firstChunkTime = -1;
    let text = "";
    
    while (true) {
        const { done, value } = await reader.read();
        if (firstChunkTime === -1) {
            firstChunkTime = performance.now();
            console.log(`TTFT: ${(firstChunkTime - start).toFixed(2)} ms`);
        }
        if (done) break;
        text += new TextDecoder().decode(value);
    }
    const end = performance.now();
    console.log(`Total Time: ${(end - start).toFixed(2)} ms`);
    console.log(`Generation Time: ${(end - firstChunkTime).toFixed(2)} ms`);
}

testStream();
