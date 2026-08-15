import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { qualifyDocument } from '../lib/ai/qualification';

console.log("Running BUILD-008B Document Qualification Tests...\n");

const testDocs = [
  // 5 PROCUREMENT DOCUMENTS
  {
    type: "PROCUREMENT",
    name: "Standard City IT RFP",
    pages: [{ page_number: 1, content: "REQUEST FOR PROPOSALS\nCity of Springfield\nIT Managed Services\nDue: November 1, 2026.\nVendor must have 5 years experience." }]
  },
  {
    type: "PROCUREMENT",
    name: "Federal Tender Notice",
    pages: [{ page_number: 1, content: "TENDER NOTICE\nDept of Defense\nProcurement of ruggedized laptops.\nBids accepted until Friday." }]
  },
  {
    type: "PROCUREMENT",
    name: "University RFQ",
    pages: [{ page_number: 1, content: "Request for Quotes (RFQ)\nState University\nSeeking quotes for 100 ergonomic office chairs.\nSubmit pricing by EOD." }]
  },
  {
    type: "PROCUREMENT",
    name: "Enterprise RFI",
    pages: [{ page_number: 1, content: "Request for Information (RFI)\nAcme Corp\nSeeking information on enterprise CRM solutions to inform future RFP." }]
  },
  {
    type: "PROCUREMENT",
    name: "Construction EOI",
    pages: [{ page_number: 1, content: "Expression of Interest\nHighway expansion project phase 2.\nContractors must submit qualifications by Oct 12." }]
  },

  // 5 NON-PROCUREMENT DOCUMENTS
  {
    type: "NON_PROCUREMENT",
    name: "Software Engineer Job Description",
    pages: [{ page_number: 1, content: "Job Description: Senior Full Stack Engineer\nRequirements: 5+ years React, Node.js.\nSalary: $120k-$150k.\nPlease submit resume to HR." }]
  },
  {
    type: "NON_PROCUREMENT",
    name: "Monthly Invoice",
    pages: [{ page_number: 1, content: "INVOICE #1024\nBilled To: City of Springfield\nServices: Cloud hosting October 2026.\nTotal Due: $450.00" }]
  },
  {
    type: "NON_PROCUREMENT",
    name: "Marketing Brochure",
    pages: [{ page_number: 1, content: "Acme Cloud Solutions\nWe provide the best IT services for municipalities. Contact our sales team for a demo today!" }]
  },
  {
    type: "NON_PROCUREMENT",
    name: "Internal Company Policy",
    pages: [{ page_number: 1, content: "Employee Travel Policy\nAll flights must be booked through the company portal. Max hotel rate is $200/night." }]
  },
  {
    type: "NON_PROCUREMENT",
    name: "Vendor Contract Draft",
    pages: [{ page_number: 1, content: "MASTER SERVICES AGREEMENT\nThis contract is entered between Acme Corp and Tech Inc.\nTerm: 3 years.\nNot a solicitation." }]
  },

  // 2 AMBIGUOUS DOCUMENTS
  {
    type: "AMBIGUOUS",
    name: "Market Research Report",
    pages: [{ page_number: 1, content: "Q3 Market Analysis on Enterprise Software Procurement.\nMany RFPs were issued this quarter for AI tools." }]
  },
  {
    type: "AMBIGUOUS",
    name: "Meeting Minutes",
    pages: [{ page_number: 1, content: "City Council Meeting\nAgenda Item 4: Discuss whether to issue an RFP for the new park project. Vote passed 5-0." }]
  }
];

async function runTests() {
  let falseAcceptances = 0; // Non-procurement classified as procurement
  let falseRejections = 0;  // Procurement classified as non-procurement
  let totalProcurement = 5;
  let totalNonProcurement = 5;

  let totalLatencyMs = 0;

  for (const doc of testDocs) {
    console.log(`Testing: ${doc.name} (${doc.type})`);
    
    const startTime = Date.now();
    try {
      const result = await qualifyDocument(doc.pages);
      const latency = Date.now() - startTime;
      totalLatencyMs += latency;

      console.log(`  -> is_procurement_opportunity: ${result.is_procurement_opportunity}`);
      console.log(`  -> document_type: ${result.document_type}`);
      console.log(`  -> confidence: ${result.confidence}`);
      console.log(`  -> Latency: ${latency}ms`);
      
      if (doc.type === "PROCUREMENT" && !result.is_procurement_opportunity) {
        falseRejections++;
        console.log(`  [!] FALSE REJECTION`);
      } else if (doc.type === "NON_PROCUREMENT" && result.is_procurement_opportunity) {
        falseAcceptances++;
        console.log(`  [!] FALSE ACCEPTANCE`);
      } else if (doc.type === "AMBIGUOUS") {
        console.log(`  [*] AMBIGUOUS RESULT: ${result.is_procurement_opportunity ? 'Procurement' : 'Non-Procurement'} (${result.confidence} confidence)`);
      } else {
        console.log(`  [✓] Correctly classified`);
      }
    } catch (err: any) {
      console.error(`  [ERROR] ${err.message}`);
    }
    console.log('');
  }

  const far = (falseAcceptances / totalNonProcurement) * 100;
  const frr = (falseRejections / totalProcurement) * 100;
  const avgLatency = totalLatencyMs / testDocs.length;

  console.log("=== QUALIFICATION BENCHMARK RESULTS ===");
  console.log(`False Acceptance Rate (FAR): ${far}% (${falseAcceptances}/${totalNonProcurement})`);
  console.log(`False Rejection Rate (FRR):  ${frr}% (${falseRejections}/${totalProcurement})`);
  console.log(`Average Latency:             ${Math.round(avgLatency)}ms`);
}

runTests();
