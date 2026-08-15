import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function testThinkingDisabled() {
  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Explain quantum physics in 2 sentences." }],
      thinking: { type: "disabled" }
    })
  });
  
  if (!res.ok) {
    console.error("Error:", await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("reasoning tokens:", data.usage?.completion_tokens_details?.reasoning_tokens);
  console.log("total tokens:", data.usage?.total_tokens);
}

testThinkingDisabled();
