import { verifyQuote } from '../lib/ai/validator';
import * as assert from 'assert';

console.log("Running BUILD-007 Evidence Validation Regression Tests...\n");

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err.message}`);
    process.exit(1);
  }
}

const page1 = "The bidder must hold an ISO 9001 certification. \n  Delivery is expected in 30 days.";
const page2 = "However, in section 4, delivery   must occur within 45 days.";
const page3 = "This is a short RFP. Just one page long.";

// 1. Valid single-page evidence
runTest("1. Valid single-page evidence", () => {
  const result = verifyQuote(page1, "The bidder must hold an ISO 9001 certification.");
  assert.strictEqual(result, true);
});

// 2. Invalid evidence (hallucinated)
runTest("2. Invalid evidence (hallucinated)", () => {
  const result = verifyQuote(page1, "The bidder must hold an ISO 27001 certification.");
  assert.strictEqual(result, false);
});

// 3. Whitespace-normalized evidence (handling line breaks and extra spaces)
runTest("3. Whitespace-normalized evidence", () => {
  // Quote is formatted slightly differently from source
  const result = verifyQuote(page2, "delivery must occur within 45 days.");
  assert.strictEqual(result, true);
});

// 4. Multi-page evidence (Testing the concept that quotes from multiple pages work independently)
runTest("4. Multi-page evidence (simulated logic from route.ts)", () => {
  const quote1 = { page: 1, text: "ISO 9001 certification" };
  const quote2 = { page: 2, text: "delivery must occur within 45 days" };
  
  assert.strictEqual(verifyQuote(page1, quote1.text), true);
  assert.strictEqual(verifyQuote(page2, quote2.text), true);
});

// 5. Contradiction with two valid citations
runTest("5. Contradiction with two valid citations", () => {
  assert.strictEqual(verifyQuote(page1, "Delivery is expected in 30 days."), true);
  assert.strictEqual(verifyQuote(page2, "delivery must occur within 45 days."), true);
});

// 6. Contradiction with one invalid citation
runTest("6. Contradiction with one invalid citation", () => {
  assert.strictEqual(verifyQuote(page1, "Delivery is expected in 30 days."), true);
  assert.strictEqual(verifyQuote(page2, "delivery must occur within 60 days."), false); // Fails
});

// 7. Legitimate short RFP
runTest("7. Legitimate short RFP", () => {
  assert.strictEqual(verifyQuote(page3, "This is a short RFP."), true);
});

console.log("\nAll deterministic evidence validation tests passed.");
