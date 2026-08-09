'use client';

import { event } from '@/lib/analytics';

export default function Home() {
  const handleCtaClick = (label: string) => {
    event({
      action: 'product_cta_clicked',
      category: 'engagement',
      label,
    });
    
    const target = document.getElementById('capabilities');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 py-24 md:py-32 text-center bg-gray-50 border-b border-gray-200">
        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl mb-6">
          Understand the opportunity before you write the proposal.
        </h1>
        <p className="max-w-2xl text-lg md:text-xl text-gray-600 mb-10">
          Designed to analyze RFPs before you commit to the response. Pre-Bid Intelligence will surface requirements, identify risks, and highlight missing information so you can make informed bid decisions.
        </p>
        <button
          onClick={() => handleCtaClick('hero')}
          className="rounded-md bg-gray-900 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-colors"
        >
          See How It Works
        </button>
      </section>

      {/* Value Proposition */}
      <section className="px-6 py-20 md:py-24 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-6">
          Bidding costs money.
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Don&apos;t invest days into a proposal before understanding the true requirements and hidden risks of the RFP. We are shifting focus from &quot;help me write&quot; to &quot;help me understand the commitment.&quot;
        </p>
      </section>

      {/* Capabilities Overview */}
      <section id="capabilities" className="bg-gray-50 px-6 py-20 md:py-24 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <article className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirement Intelligence</h3>
              <p className="text-gray-600 text-sm flex-grow">Surface mandatory requirements and compliance obligations directly from the document.</p>
            </article>
            <article className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Risk Detection</h3>
              <p className="text-gray-600 text-sm flex-grow">Highlight non-standard terms, delivery risks, and potential pitfalls hidden in the text.</p>
            </article>
            <article className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Ambiguity Analysis</h3>
              <p className="text-gray-600 text-sm flex-grow">Find contradictory statements or vague clauses before they become contract issues.</p>
            </article>
            <article className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Clarification Intelligence</h3>
              <p className="text-gray-600 text-sm flex-grow">Turn unresolved requirements into focused clarification questions for the Q&A period.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Output Preview */}
      <section className="px-6 py-20 md:py-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            Evidence-Based Analysis
          </h2>
          <p className="text-lg text-gray-600">
            Insights mapped directly back to source documents.
          </p>
        </div>
        
        {/* Conceptual Finding */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-10 relative max-w-3xl mx-auto">
          <span className="absolute top-4 right-4 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded">
            Illustrative Finding
          </span>
          <div className="flex items-start mb-4">
            <div className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded mr-3 mt-0.5">High Risk</div>
            <h3 className="text-xl font-semibold text-gray-900">SLA Response Time is not defined</h3>
          </div>
          <div className="mb-6 pl-14">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold text-gray-900">Evidence: </span> 
              &quot;Contractor must provide an immediate response to critical system failures.&quot;
            </p>
            <p className="text-sm text-gray-500">Source: Part B, Section 4.2 (Page 12)</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 pl-14">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Recommended Action</h4>
            <p className="text-sm text-blue-800">
              Request a measurable maximum response-time requirement during the Q&A period.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-gray-900 px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
          Stop guessing. Start analyzing.
        </h2>
        <button
          onClick={() => handleCtaClick('footer')}
          className="rounded-md bg-white px-8 py-3 text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
        >
          See How It Works
        </button>
      </section>
      
      <footer className="bg-white py-8 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Pre-Bid Intelligence. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
