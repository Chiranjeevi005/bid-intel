import { Finding } from './schema';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum tokens allowed per extraction call. Configurable. Never hard-coded. */
export function getMaxTokensExtraction(): number {
  const env = process.env.DEEPSEEK_MAX_TOKENS_EXTRACTION;
  return env ? parseInt(env, 10) : 8192;
}

/** Minimum pages per batch before splitting is halted. Configurable. */
export function getMinExtractionPages(): number {
  const env = process.env.DEEPSEEK_MIN_EXTRACTION_PAGES;
  return env ? parseInt(env, 10) : 1;
}

/** Concurrency limit for parallel extraction sub-batches. Configurable. */
export function getExtractionConcurrencyLimit(): number {
  const env = process.env.DEEPSEEK_EXTRACTION_CONCURRENCY;
  return env ? parseInt(env, 10) : 3;
}

// ---------------------------------------------------------------------------
// Ceiling Detection
// ---------------------------------------------------------------------------

export interface CeilingAnalysis {
  /** True only when finish_reason === "length" — mandatory split trigger */
  ceiling_hit: boolean;
  /** output_budget_ratio = completion_tokens / configured max_tokens */
  output_budget_ratio: number;
  /** Diagnostic: >70% of budget consumed */
  budget_warning: boolean;
  /** Diagnostic: >85% of budget consumed (but finish_reason !== "length") */
  budget_high: boolean;
}

export function analyzeCeiling(
  finishReason: string,
  completionTokens: number
): CeilingAnalysis {
  const maxTokens = getMaxTokensExtraction();
  const ratio = completionTokens / maxTokens;

  return {
    ceiling_hit: finishReason === 'length',
    output_budget_ratio: ratio,
    budget_warning: ratio > 0.70 && finishReason !== 'length',
    budget_high: ratio > 0.85 && finishReason !== 'length',
  };
}

/**
 * Returns true if and only if finish_reason === "length".
 * A high budget ratio on a successful stop response is NOT a split trigger.
 */
export function shouldSplitExtraction(finishReason: string): boolean {
  return finishReason === 'length';
}

// ---------------------------------------------------------------------------
// Page-Based Batch Splitting
// ---------------------------------------------------------------------------

/**
 * Bisects a page array into two roughly equal halves.
 * Page-based only — never splits individual findings or JSON.
 */
export function splitBatch(
  pages: { page_number: number; content: string }[]
): [{ page_number: number; content: string }[], { page_number: number; content: string }[]] {
  const mid = Math.ceil(pages.length / 2);
  return [pages.slice(0, mid), pages.slice(mid)];
}

// ---------------------------------------------------------------------------
// Finding Merge
// ---------------------------------------------------------------------------

/**
 * Merges two finding arrays from split sub-batches.
 * Deduplicates only when verified quote overlap > 0.5 normalized word overlap.
 * Every deduplication decision is logged for audit — false deduplication = recall failure.
 */
export function mergeFindingArrays(a: Finding[], b: Finding[]): Finding[] {
  const merged = [...a];
  const deduplicationLog: { kept: string; discarded: string; overlap: number }[] = [];

  for (const candidate of b) {
    const isDuplicate = merged.some(existing => {
      const overlap = quoteWordOverlap(existing, candidate);
      if (overlap > 0.5) {
        deduplicationLog.push({
          kept: existing.title,
          discarded: candidate.title,
          overlap,
        });
        return true;
      }
      return false;
    });

    if (!isDuplicate) {
      merged.push(candidate);
    }
  }

  if (deduplicationLog.length > 0) {
    console.log(`[splitter] Deduplicated ${deduplicationLog.length} findings:`);
    for (const entry of deduplicationLog) {
      console.log(`  kept="${entry.kept}" discarded="${entry.discarded}" overlap=${entry.overlap.toFixed(2)}`);
    }
  }

  return merged;
}

/**
 * Computes normalized word overlap between the quote texts of two findings.
 * Returns 0.0–1.0. 1.0 = identical quotes; 0.0 = no shared words.
 */
function quoteWordOverlap(a: Finding, b: Finding): number {
  const aWords = extractQuoteWords(a);
  const bWords = extractQuoteWords(b);

  if (aWords.size === 0 || bWords.size === 0) return 0;

  let intersection = 0;
  for (const word of aWords) {
    if (bWords.has(word)) intersection++;
  }

  const union = aWords.size + bWords.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function extractQuoteWords(finding: Finding): Set<string> {
  const words = new Set<string>();
  if (!finding.quotes) return words;
  for (const q of finding.quotes) {
    for (const word of q.quote.toLowerCase().split(/\W+/).filter(w => w.length > 3)) {
      words.add(word);
    }
  }
  return words;
}

// ---------------------------------------------------------------------------
// Bounded Concurrency Helper
// ---------------------------------------------------------------------------

/**
 * Runs an array of async tasks with a maximum concurrency limit.
 * Prevents unbounded Promise.all fan-out.
 */
export async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}
