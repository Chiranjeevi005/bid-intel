import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function testReasoningControl() {
  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const model = process.env.DEEPSEEK_MODEL!;

  const makeRequest = async (body: any) => {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Explain quantum physics in detail." }],
        ...body
      })
    });
    return res.json();
  };

  console.log("Running with reasoning_effort: 'low'...");
  const maxTokens = await makeRequest({ reasoning_effort: "low" });
  console.log("reasoning tokens:", maxTokens.usage?.completion_tokens_details?.reasoning_tokens);

}

testReasoningControl();
