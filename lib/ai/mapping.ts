import { z } from 'zod';
import { MAPPING_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import { CategoryEnum } from './schema';

export const PageSignalSchema = z.object({
  page_number: z.number().int(),
  signals: z.array(CategoryEnum)
});

export const DocumentMapSchema = z.object({
  page_maps: z.array(PageSignalSchema)
});

export type DocumentMap = z.infer<typeof DocumentMapSchema>;

// K4: Large-document threshold. Only chunked mapping activates above this.
const CHUNKED_MAPPING_PAGE_THRESHOLD = 40;
const CHUNKED_MAPPING_CHUNK_SIZE = 30;

export interface MappingTelemetry {
  mapping_chunk_count?: number;
  mapping_chunk_size?: number;
  mapping_chunks_failed?: number;
  mapping_fallback_used?: boolean;
}

export async function mapDocumentPages(pages: { page_number: number; content: string }[]): Promise<{ result: DocumentMap, usage: any, telemetry?: MappingTelemetry }> {
  // K4: Automatically use chunked mapping for large documents
  if (pages.length > CHUNKED_MAPPING_PAGE_THRESHOLD) {
    console.log(`[mapping] ${pages.length} pages > threshold ${CHUNKED_MAPPING_PAGE_THRESHOLD} — using chunked mapping (chunk_size=${CHUNKED_MAPPING_CHUNK_SIZE})`);
    return mapDocumentPagesChunked(pages, CHUNKED_MAPPING_CHUNK_SIZE);
  }

  return mapDocumentPagesSingle(pages);
}

/** Standard mapping for documents <= CHUNKED_MAPPING_PAGE_THRESHOLD pages. Unchanged from BUILD-008I. */
async function mapDocumentPagesSingle(pages: { page_number: number; content: string }[]): Promise<{ result: DocumentMap, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
  }

  const userPrompt = buildUserPrompt(pages);

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: MAPPING_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    thinking: { type: "disabled" }
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
    console.error("DeepSeek API Error (Mapping):", errorText);
    throw new Error(`DeepSeek API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  
  if (!rawContent) {
    throw new Error("Empty response from DeepSeek API during mapping");
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (e) {
    console.error("Failed to parse DeepSeek JSON response (Mapping):", rawContent);
    throw new Error("Invalid JSON returned by provider");
  }

  const validationResult = DocumentMapSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error("Schema validation failed (Mapping):", validationResult.error);
    throw new Error("Model response failed schema validation");
  }

  return { result: validationResult.data, usage: data.usage };
}

/**
 * K4: Chunked mapping for large documents (> CHUNKED_MAPPING_PAGE_THRESHOLD pages).
 * Splits pages into chunks of `chunkSize`, maps each chunk concurrently,
 * then merges the page_maps arrays deduplicated by page_number.
 */
export async function mapDocumentPagesChunked(
  pages: { page_number: number; content: string }[],
  chunkSize: number = CHUNKED_MAPPING_CHUNK_SIZE
): Promise<{ result: DocumentMap, usage: any, telemetry: MappingTelemetry }> {
  const chunks: { page_number: number; content: string }[][] = [];
  for (let i = 0; i < pages.length; i += chunkSize) {
    chunks.push(pages.slice(i, i + chunkSize));
  }

  console.log(`[mapping] Chunked mapping: ${pages.length} pages -> ${chunks.length} chunks of <=${chunkSize} pages`);

  let mapping_chunks_failed = 0;

  const chunkResults = await Promise.all(chunks.map(async (chunk, idx) => {
    const chunkName = `${idx + 1}/${chunks.length}`;
    console.log(`[mapping] Dispatching chunk ${chunkName} (pages ${chunk[0].page_number}-${chunk[chunk.length - 1].page_number})`);
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await mapDocumentPagesSingle(chunk);
        return { success: true, result: res.result, usage: res.usage };
      } catch (err: any) {
        console.warn(`[mapping] Chunk ${chunkName} failed attempt ${attempt}: ${err.message}`);
        if (attempt === 2) {
          console.error(`[mapping] Chunk ${chunkName} terminal failure. Falling back to empty map for these pages.`);
          mapping_chunks_failed++;
          return { success: false, result: { page_maps: [] }, usage: null };
        }
      }
    }
    return { success: false, result: { page_maps: [] }, usage: null };
  }));

  // Merge all page_maps, deduplicate by page_number
  const mergedPageMap = new Map<number, { page_number: number; signals: any[] }>();
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for (const r of chunkResults) {
    for (const pm of r.result.page_maps) {
      mergedPageMap.set(pm.page_number, pm);
    }
    if (r.usage) {
      totalUsage.prompt_tokens += r.usage.prompt_tokens || 0;
      totalUsage.completion_tokens += r.usage.completion_tokens || 0;
      totalUsage.total_tokens += r.usage.total_tokens || 0;
    }
  }

  const mergedMaps = Array.from(mergedPageMap.values()).sort((a, b) => a.page_number - b.page_number);

  const validationResult = DocumentMapSchema.safeParse({ page_maps: mergedMaps });
  if (!validationResult.success) {
    // This should theoretically never happen now because we catch individual chunk schema errors
    console.error("Schema validation failed on merged chunked mapping:", validationResult.error);
    throw new Error("Chunked mapping merge failed schema validation");
  }

  return {
    result: validationResult.data,
    usage: totalUsage,
    telemetry: {
      mapping_chunk_count: chunks.length,
      mapping_chunk_size: chunkSize,
      mapping_chunks_failed,
      mapping_fallback_used: mapping_chunks_failed > 0
    }
  };
}
