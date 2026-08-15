import { AnalysisResult, AnalysisResultSchema } from './schema';
import { SYSTEM_PROMPT_TASK_A, SYSTEM_PROMPT_TASK_B, buildUserPrompt } from './prompts';

export async function analyzeRfpPages(pages: { page_number: number; content: string }[]): Promise<{ result: AnalysisResult, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
  }

  const userPrompt = buildUserPrompt(pages);

  const makeRequest = async (systemPrompt: string) => {
    const requestBody = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    };

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API Error:", errorText);
      throw new Error(`DeepSeek API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error("Empty response from DeepSeek API");
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch (e) {
      console.error("Failed to parse DeepSeek JSON response:", rawContent);
      throw new Error("Invalid JSON returned by provider");
    }

    return { data: parsedJson, usage: data.usage };
  };

  // Run Task A and Task B concurrently
  const [taskAResponse, taskBResponse] = await Promise.all([
    makeRequest(SYSTEM_PROMPT_TASK_A),
    makeRequest(SYSTEM_PROMPT_TASK_B)
  ]);

  // Merge findings
  const mergedFindings = [
    ...(taskAResponse.data.findings || []),
    ...(taskBResponse.data.findings || [])
  ];

  const mergedResult = { findings: mergedFindings };

  // Enforce schema validation on merged result
  const validationResult = AnalysisResultSchema.safeParse(mergedResult);
  if (!validationResult.success) {
    console.error("Schema validation failed on merged output:", validationResult.error);
    throw new Error("Model response failed schema validation");
  }

  // Aggregate usage
  const aggregatedUsage = {
    prompt_tokens: (taskAResponse.usage?.prompt_tokens || 0) + (taskBResponse.usage?.prompt_tokens || 0),
    completion_tokens: (taskAResponse.usage?.completion_tokens || 0) + (taskBResponse.usage?.completion_tokens || 0),
    total_tokens: (taskAResponse.usage?.total_tokens || 0) + (taskBResponse.usage?.total_tokens || 0),
    taskA: taskAResponse.usage,
    taskB: taskBResponse.usage
  };

  return { result: validationResult.data, usage: aggregatedUsage };
}
