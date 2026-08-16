import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import fs from 'fs';
import path from 'path';
import { mapDocumentPages } from './lib/ai/mapping';
import { consolidatePageSignals } from './lib/ai/retrieval';
import { analyzeBatch, reasoningReview } from './lib/ai/provider';
import { Category, Finding } from './lib/ai/schema';

function parsePages(rawText: string) {
    const parts = rawText.split(/---PAGE_(\d+)---/);
    const pages = [];
    for (let i = 1; i < parts.length; i += 2) {
        pages.push({ page_number: parseInt(parts[i]), content: parts[i+1].trim() });
    }
    return pages;
}

async function runTest() {
    console.log("=== BUILD-008I END-TO-END PIPELINE TEST ===");
    const textPath = path.join(process.cwd(), 'scratch_texts', 'DOC-007.txt');
    if (!fs.existsSync(textPath)) {
        console.error("Test file DOC-007.txt not found.");
        return;
    }

    const pages = parsePages(fs.readFileSync(textPath, 'utf8'));
    console.log(`Loaded ${pages.length} pages.`);

    // 1. Mapping
    console.log("\n[Stage 1] AI Mapping...");
    const { result: mapResult } = await mapDocumentPages(pages);
    console.log(`Mapped signals for ${mapResult.page_maps.length} pages.`);

    // 2. Retrieval
    console.log("\n[Stage 2] Deterministic Retrieval & Union...");
    const consolidated = consolidatePageSignals(pages, mapResult.page_maps);
    console.log("Consolidated Signals:");
    for (const [pageNum, signals] of Object.entries(consolidated)) {
        if (signals.length > 0) {
            console.log(`Page ${pageNum}: ${signals.join(', ')}`);
        }
    }

    // Prepare Batches
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
    ];

    // 3. Targeted Extraction
    console.log("\n[Stage 3] Targeted Extraction...");
    let allFindings: Finding[] = [];
    for (const batch of batches) {
        if (batch.pages.length === 0) {
            console.log(`Skipping ${batch.name} batch (0 pages).`);
            continue;
        }
        console.log(`Extracting ${batch.name} batch from ${batch.pages.length} pages...`);
        const { result } = await analyzeBatch(batch.pages, batch.name);
        allFindings.push(...result.findings);
        console.log(`Found ${result.findings.length} items in ${batch.name}.`);
    }

    // 4. Selective Reasoning
    console.log("\n[Stage 4] Selective Reasoning...");
    const finalFindings: Finding[] = [];
    for (const finding of allFindings) {
        if (finding.requires_reasoning_review) {
            console.log(`Flagged for reasoning: ${finding.title}`);
            const pageNumbers = finding.quotes?.map(q => q.page_number) || [];
            const contextPages = pages.filter(p => pageNumbers.includes(p.page_number));
            
            const { result } = await reasoningReview(finding, contextPages);
            finalFindings.push(result);
            console.log(`Reasoning complete for: ${result.title}`);
        } else {
            finalFindings.push(finding);
        }
    }

    console.log("\n=== FINAL PIPELINE RESULTS ===");
    console.log(`Total Findings: ${finalFindings.length}`);
    console.log(JSON.stringify(finalFindings, null, 2));
}

runTest();
