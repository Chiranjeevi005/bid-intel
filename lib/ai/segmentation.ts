import { Category } from './schema';
import { CandidateSet, PROCUREMENT_LEXICON } from './retrieval';

export interface EvidenceUnit {
    unit_id: string;
    document_id: string;
    page_number: number;
    category: Category;
    source_text: string;
    trigger_terms: string[];
    context_before: string;
    context_after: string;
    status: 'PENDING' | 'EXTRACTED' | 'REJECTED' | 'ERROR';
}

const MIN_BLOCK_SIZE = 300;
const MAX_BLOCK_SIZE = 2500;

function segmentTextIntoBlocks(text: string): string[] {
    let rawBlocks = text.split(/\n\s*\n/);
    let blocks: string[] = [];

    // Fallback 1: If too large, split by single newline or sentences
    for (const rb of rawBlocks) {
        let current = rb.trim();
        if (!current) continue;
        
        if (current.length > MAX_BLOCK_SIZE) {
            const sub = current.split(/(?<=\.)\s+|\n/);
            for (const s of sub) {
                if (s.trim()) blocks.push(s.trim());
            }
        } else {
            blocks.push(current);
        }
    }

    // Fallback 2: If too small, merge adjacent
    let mergedBlocks: string[] = [];
    let buffer = "";

    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (buffer.length + b.length < MIN_BLOCK_SIZE && i < blocks.length - 1) {
            buffer += (buffer.length > 0 ? " " : "") + b;
        } else {
            buffer += (buffer.length > 0 ? " " : "") + b;
            mergedBlocks.push(buffer);
            buffer = "";
        }
    }
    if (buffer) {
        if (mergedBlocks.length > 0) {
            mergedBlocks[mergedBlocks.length - 1] += " " + buffer;
        } else {
            mergedBlocks.push(buffer);
        }
    }

    return mergedBlocks;
}

export function segmentEvidenceUnits(
    documentId: string,
    pages: { page_number: number; content: string }[],
    candidates: CandidateSet[]
): EvidenceUnit[] {
    const units: EvidenceUnit[] = [];
    const pageContents = new Map(pages.map(p => [p.page_number, p.content]));

    // We process each category's trigger pages
    for (const set of candidates) {
        const keywords = PROCUREMENT_LEXICON[set.category];
        if (!keywords || keywords.length === 0) continue;

        let unitIdx = 0;
        
        for (const pageNum of set.trigger_pages) {
            const content = pageContents.get(pageNum);
            if (!content) continue;

            const blocks = segmentTextIntoBlocks(content);

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const blockLower = block.toLowerCase();
                
                const hits = keywords.filter(kw => blockLower.includes(kw.toLowerCase()));
                if (hits.length > 0) {
                    // It's a hit! Build an Evidence Unit with a 5-block window
                    const beforeBlocks = [];
                    if (i > 1) beforeBlocks.push(blocks[i - 2]);
                    if (i > 0) beforeBlocks.push(blocks[i - 1]);
                    
                    const afterBlocks = [];
                    if (i < blocks.length - 1) afterBlocks.push(blocks[i + 1]);
                    if (i < blocks.length - 2) afterBlocks.push(blocks[i + 2]);

                    const contextBefore = beforeBlocks.join('\n\n');
                    const contextAfter = afterBlocks.join('\n\n');

                    units.push({
                        unit_id: `${documentId}-P${pageNum}-U${unitIdx++}`,
                        document_id: documentId,
                        page_number: pageNum,
                        category: set.category,
                        source_text: block,
                        trigger_terms: hits,
                        context_before: contextBefore,
                        context_after: contextAfter,
                        status: 'PENDING'
                    });
                }
            }
        }
    }

    // Deduplicate exact overlapping blocks within the same category to prevent redundant P1 calls
    const uniqueUnits: EvidenceUnit[] = [];
    const seen = new Set<string>();
    
    for (const u of units) {
        const key = `${u.category}-${u.page_number}-${u.source_text}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueUnits.push(u);
        }
    }

    return uniqueUnits;
}
