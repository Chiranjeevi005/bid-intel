"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface InvestigationStage {
  step: string;
  badge: string;
  title: string;
  shortDesc: string;
  consoleTitle: string;
  metric: string;
  metricLabel: string;
  visualTag: string;
  visualTagColor: "blue" | "danger" | "success";
  documentContext: {
    section: string;
    page: string;
    quote?: string;
  };
  forensicInsights: {
    label: string;
    value: string;
    status?: "covered" | "danger" | "warning";
  }[];
  verdictAction: string;
}

const INVESTIGATION_STAGES: InvestigationStage[] = [
  {
    step: "01",
    badge: "FORENSIC INGESTION",
    title: "Document Ingestion & Section Parsing",
    shortDesc:
      "Deep OCR decomposition parses multi-part PDFs, annexures, and addenda into structured, searchable clause entities.",
    consoleTitle: "Tender Specimen Decomposition",
    metric: "49 Pages · 142 Clauses",
    metricLabel: "OCR Confidence 99.8%",
    visualTag: "PARSING COMPLETE",
    visualTagColor: "blue",
    documentContext: {
      section: "Full Specimen Package: MOT-2026-EXP",
      page: "Pages 1 – 49",
      quote:
        "Tender specifications, Commercial Schedules A through D, Technical SLA Addenda, and General Conditions of Contract (GCC).",
    },
    forensicInsights: [
      { label: "Document Type", value: "Public Transit Infrastructure RFP" },
      { label: "Mandatory Schedules", value: "4 Schedules · 2 Technical Annexures" },
      { label: "Submission Deadline", value: "18 September 2026 (17:00 EST)" },
      { label: "Estimated Baseline", value: "$42,000,000 USD" },
    ],
    verdictAction:
      "Deconstructed 142 discrete obligations into normalized categories for automated cross-examination.",
  },
  {
    step: "02",
    badge: "CLAUSE CROSS-EXAMINATION",
    title: "Contractual Trap & Risk Interrogation",
    shortDesc:
      "Every clause is cross-examined against standard commercial playbooks to expose uncapped liabilities, missing SLAs, and punitive terms.",
    consoleTitle: "Forensic Risk Interrogation",
    metric: "2 Critical Traps",
    metricLabel: "3 Ambiguities Flagged",
    visualTag: "CRITICAL EXPOSURE",
    visualTagColor: "danger",
    documentContext: {
      section: "Section 6.2 — Indemnification & Third-Party Claims",
      page: "Page 14",
      quote:
        "The Supplier shall indemnify, defend and hold harmless the Authority from and against any and all claims, losses, damages, liabilities, costs and expenses arising out of or related to this Agreement without limitation.",
    },
    forensicInsights: [
      { label: "Liability Ceiling", value: "Uncapped (No aggregate stop-loss)", status: "danger" },
      { label: "Delay Penalties", value: "$15,000 / calendar day (Uncapped)", status: "danger" },
      { label: "Response Time SLA", value: "'Immediate' (Legally ambiguous)", status: "warning" },
      { label: "Mandatory ISO Certs", value: "ISO 27001 & ISO 9001 Required", status: "covered" },
    ],
    verdictAction:
      "Identified uncapped indemnification risk. Bidding without amending clause 6.2 creates unlimited balance sheet liability.",
  },
  {
    step: "03",
    badge: "BID DECISION DOSSIER",
    title: "Executive Decision Dossier & Q&A Strategy",
    shortDesc:
      "Synthesizes verified findings into an executive decision dossier, line-item risk highlights, and formal clarification inquiries for the Q&A period.",
    consoleTitle: "Pre-Bid Executive Dossier",
    metric: "Status: Review Required",
    metricLabel: "4 Clarification Questions",
    visualTag: "EXECUTIVE DOSSIER",
    visualTagColor: "danger",
    documentContext: {
      section: "Executive Action Plan · Q&A Submission Draft",
      page: "Dossier Summary",
      quote:
        "Tender contains high commercial risk in Section 6.2 and 9.4. Do not commit formal bid pricing until clarification answers cap total liability at 100% contract value.",
    },
    forensicInsights: [
      { label: "Commercial Risk Rating", value: "High (Score 78/100)", status: "danger" },
      { label: "Technical Eligibility", value: "Qualified (3/3 criteria met)", status: "covered" },
      { label: "Recommended Action", value: "Submit Clarification Request #1–4", status: "warning" },
      { label: "Bid Effort Estimate", value: "240 Engineering & Commercial Hours" },
    ],
    verdictAction:
      "Drafted 4 precise Q&A inquiries to propose a standard 100% liability cap and 10% liquidated damages stop-loss during the tender clarification window.",
  },
];

export default function DecisionBrief({ user = null }: { user?: any | null }) {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(1);
  const activeStage = INVESTIGATION_STAGES[activeStepIndex];

  return (
    <div className="w-full bg-[#F5F6F4] text-[#111827] flex flex-col items-center">
      {/* ────────────────────────────────────────────────────────────
          SECTION 01: HERO (Horizontal Asymmetric 2-Column Split)
      ──────────────────────────────────────────────────────────── */}
      <section id="product" className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-12 md:pt-20 pb-16 md:pb-24 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          
          {/* Left Column: Core Value Proposition */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col items-start"
          >
            {/* Live Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#E4E7EC] text-[#344054] text-[11px] font-semibold tracking-wider uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5] animate-pulse" />
              Pre-Bid Forensic Intelligence Desk
            </div>

            <h1 className="text-[36px] sm:text-[44px] lg:text-[50px] font-bold tracking-tight leading-[1.08] text-[#111827] mb-6">
              Is this tender worth committing your team to?
            </h1>

            <p className="text-[16px] md:text-[18px] text-[#475467] font-normal leading-relaxed mb-8 max-w-xl">
              A tender consumes weeks of engineering, commercial, and executive time. RFPground investigates the fine print, surfaces uncapped liability, and validates feasibility before your resources are committed.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center rounded-sm bg-[#3157D5] px-6 py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#2845a9] transition-all duration-150 active:scale-[0.98]"
              >
                Analyse a tender &rarr;
              </Link>
              <a
                href="#investigation-process"
                className="inline-flex items-center justify-center rounded-sm border border-[#D0D5DD] bg-white px-5 py-3.5 text-[14px] font-medium text-[#344054] hover:bg-gray-50 transition-colors duration-150"
              >
                Explore the investigation flow &darr;
              </a>
            </div>

            {/* Micro-Metrics Bar */}
            <div className="w-full grid grid-cols-3 gap-4 pt-6 border-t border-[#D9DEE5]">
              <div>
                <div className="text-[18px] font-bold text-[#111827]">~30s</div>
                <div className="text-[12px] text-[#667085] font-medium">Forensic OCR Intake</div>
              </div>
              <div>
                <div className="text-[18px] font-bold text-[#111827]">100%</div>
                <div className="text-[12px] text-[#667085] font-medium">Citation-Backed Evidence</div>
              </div>
              <div>
                <div className="text-[18px] font-bold text-[#111827]">0%</div>
                <div className="text-[12px] text-[#667085] font-medium">Silent Hallucinations</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Live RFP Investigation Surface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 w-full"
          >
            <div className="w-full bg-white border border-[#D9DEE5] rounded-md shadow-sm overflow-hidden">
              {/* Document Header Bar */}
              <div className="bg-[#F8F9FA] px-5 py-3.5 border-b border-[#D9DEE5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B42318]" />
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#B42318]">
                    Tender Under Investigation
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#667085]">
                  ID: MOT-2026-EXP
                </span>
              </div>

              {/* Document Details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">
                      Ministry of Transport
                    </h2>
                    <p className="text-[14px] text-[#667085] font-medium">
                      High-Speed Transit Infrastructure RFP
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] rounded border border-[#FECDCA]">
                    High Exposure
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-[#667085] mb-6 pb-5 border-b border-[#EAECF0]">
                  <span>49 pages</span>
                  <span>·</span>
                  <span>Submission 18 Sep 2026</span>
                  <span>·</span>
                  <span>$42M Est. Value</span>
                </div>

                {/* Key Risk Finding Excerpt */}
                <div className="mb-5 bg-[#F9FAFB] p-4 rounded border border-[#EAECF0]">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">
                    <span>Critical Clause · Section 6.2</span>
                    <span>Page 14</span>
                  </div>
                  <p className="text-[15px] font-serif leading-relaxed text-[#1F2937] italic">
                    &quot;The Supplier shall indemnify, defend and hold harmless the Authority from and against any and all claims, losses, damages, liabilities...&quot;
                  </p>
                  <div className="mt-2 text-[12px] font-medium text-[#B42318]">
                    ● Uncapped liability exposure detected (No stop-loss ceiling)
                  </div>
                </div>

                {/* Findings Matrix */}
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-[#344054]">Eligibility</span>
                    <span className="text-[#027A48] font-semibold">✓ Covered</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-[#344054]">Liability Cap</span>
                    <span className="text-[#B42318] font-semibold">! Uncapped</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-[#344054]">Milestone Penalties</span>
                    <span className="text-[#B42318] font-semibold">! $15k/Day</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-[#344054]">Support SLAs</span>
                    <span className="text-[#B54708] font-semibold">? Ambiguous</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          SECTION 02: THE FORENSIC INVESTIGATION WORKFLOW (Interactive)
      ──────────────────────────────────────────────────────────── */}
      <section
        id="investigation-process"
        className="w-full border-t border-[#D9DEE5] bg-white py-16 md:py-24 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          
          {/* Section Header */}
          <div className="flex flex-col items-start mb-14">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#E4E7EC] text-[#344054] text-[11px] font-semibold tracking-wider uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
              Forensic Tender Investigation
            </div>
            <h2 className="text-[28px] md:text-[38px] font-bold tracking-tight text-[#111827]">
              The 3-stage interrogation: From raw RFP to bid verdict
            </h2>
            <p className="text-[16px] text-[#667085] max-w-2xl mt-2 font-normal">
              Click through the investigation stages below to inspect how RFPground deconstructs tender specifications, exposes contractual traps, and builds your decision brief.
            </p>
          </div>

          {/* 3-Stage Interactive Selector Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {INVESTIGATION_STAGES.map((stage, idx) => {
              const isActive = idx === activeStepIndex;
              return (
                <button
                  key={stage.step}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`text-left p-5 rounded-md border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                    isActive
                      ? "bg-[#F5F6F4] border-[#3157D5] ring-2 ring-[#3157D5]/20 shadow-sm"
                      : "bg-white border-[#D9DEE5] hover:border-gray-300 hover:bg-gray-50/70"
                  }`}
                >
                  {/* Top indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute top-0 left-0 right-0 h-1 bg-[#3157D5]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[12px] font-mono font-bold ${isActive ? "text-[#3157D5]" : "text-[#98A2B3]"}`}>
                        STAGE {stage.step}
                      </span>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white border border-[#D9DEE5] text-[#344054]">
                        {stage.badge}
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold text-[#111827] mb-2 leading-snug">
                      {stage.title}
                    </h3>

                    <p className="text-[13px] text-[#475467] line-clamp-2 leading-relaxed">
                      {stage.shortDesc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] font-semibold text-[#667085]">
                    <span>{stage.metric}</span>
                    <span className={isActive ? "text-[#3157D5]" : "text-gray-400"}>
                      {isActive ? "Viewing Specimen →" : "Click to inspect"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Forensic Console Screen */}
          <div className="w-full bg-[#111827] text-white rounded-lg p-6 sm:p-8 md:p-10 shadow-xl border border-gray-800">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStage.step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex flex-col gap-6"
              >
                {/* Console Terminal Header */}
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-800 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[13px] font-mono font-semibold tracking-wider uppercase text-gray-300">
                      FORENSIC DESK // {activeStage.consoleTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded ${
                        activeStage.visualTagColor === "danger"
                          ? "bg-red-900/60 text-red-300 border border-red-700/50"
                          : activeStage.visualTagColor === "success"
                          ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
                          : "bg-blue-900/60 text-blue-300 border border-blue-700/50"
                      }`}
                    >
                      ● {activeStage.visualTag}
                    </span>
                    <span className="text-[12px] font-mono text-gray-400">
                      {activeStage.metricLabel}
                    </span>
                  </div>
                </div>

                {/* Main Console Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Console: Evidence Quote & Citations */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="text-[11px] font-mono font-semibold tracking-wider uppercase text-gray-400 flex items-center justify-between">
                      <span>Source Evidence Interrogation</span>
                      <span className="text-gray-500 font-normal">{activeStage.documentContext.page}</span>
                    </div>

                    <div className="p-5 bg-gray-900/80 border border-gray-800 rounded-md">
                      <div className="text-[12px] font-mono text-blue-400 mb-2 font-medium">
                        {activeStage.documentContext.section}
                      </div>
                      <p className="text-[16px] sm:text-[17px] font-serif leading-relaxed text-gray-200 italic">
                        &quot;{activeStage.documentContext.quote}&quot;
                      </p>
                    </div>

                    {/* Forensic Finding Box */}
                    <div className="p-4 bg-gray-900/40 border border-gray-800/80 rounded-md">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                        Forensic Assessment
                      </div>
                      <p className="text-[13px] text-gray-300 leading-relaxed">
                        {activeStage.verdictAction}
                      </p>
                    </div>
                  </div>

                  {/* Right Console: Line-Item Clause Audit Log */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="text-[11px] font-mono font-semibold tracking-wider uppercase text-gray-400 mb-1">
                      Investigation Audit Log
                    </div>

                    <div className="flex flex-col divide-y divide-gray-800 bg-gray-900/80 border border-gray-800 rounded-md">
                      {activeStage.forensicInsights.map((insight, i) => (
                        <div key={i} className="p-3.5 flex flex-col gap-1">
                          <span className="text-[11px] font-mono text-gray-400 uppercase">
                            {insight.label}
                          </span>
                          <span
                            className={`text-[13px] font-medium flex items-center justify-between ${
                              insight.status === "danger"
                                ? "text-red-400 font-semibold"
                                : insight.status === "warning"
                                ? "text-amber-400 font-semibold"
                                : insight.status === "covered"
                                ? "text-emerald-400 font-semibold"
                                : "text-gray-200"
                            }`}
                          >
                            {insight.value}
                            {insight.status === "danger" && <span className="text-[11px]">! CRITICAL</span>}
                            {insight.status === "warning" && <span className="text-[11px]">? AMBIGUOUS</span>}
                            {insight.status === "covered" && <span className="text-[11px]">✓ VERIFIED</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Bottom Console Action Row */}
                <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[12px] font-mono text-gray-400">
                    Step {activeStage.step} of 03 in the automated pre-bid forensic pipeline.
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveStepIndex((prev) => (prev > 0 ? prev - 1 : 2))}
                      className="px-3 py-1.5 text-[12px] font-mono bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700 transition-colors"
                    >
                      &larr; Prev Stage
                    </button>
                    <button
                      onClick={() => setActiveStepIndex((prev) => (prev < 2 ? prev + 1 : 0))}
                      className="px-3 py-1.5 text-[12px] font-mono bg-[#3157D5] hover:bg-[#2845a9] text-white rounded transition-colors"
                    >
                      Next Stage &rarr;
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Action Strip */}
          <div className="mt-16 pt-10 border-t border-[#EAECF0] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-[17px] font-bold text-[#111827]">
                Ready to investigate your upcoming tender?
              </h4>
              <p className="text-[13px] text-[#667085]">
                Upload your RFP documents and receive a comprehensive pre-bid intelligence brief in under a minute.
              </p>
            </div>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center rounded-sm bg-[#3157D5] px-6 py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#2845a9] transition-all duration-150 active:scale-[0.98] shrink-0"
            >
              Analyse a tender now &rarr;
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
