"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { CheckCircle2, AlertTriangle, HelpCircle, ChevronLeft, ChevronRight, ArrowRight, ArrowDown } from "lucide-react";

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
    badge: "DOCUMENT QUALIFICATION",
    title: "Document Ingestion & Qualification Gate",
    shortDesc:
      "Direct PDF parsing extracts page content with scan detection. An AI qualification gate validates whether the document is a genuine procurement opportunity before pipeline execution.",
    consoleTitle: "Document Intake & Qualification Gate",
    metric: "49 Pages Processed",
    metricLabel: "Status: AI_QUALIFIED (High)",
    visualTag: "PROCUREMENT VERIFIED",
    visualTagColor: "blue",
    documentContext: {
      section: "Document Preamble · Specimen: MOT-2026-EXP",
      page: "Page 1 of 49",
      quote:
        "Request for Proposals (RFP) for the Engineering, Procurement, and Construction (EPC) of High-Speed Transit Infrastructure for the Ministry of Transport.",
    },
    forensicInsights: [
      { label: "Document Type", value: "Procurement Opportunity (RFP / Tender)", status: "covered" },
      { label: "Qualification State", value: "AI_QUALIFIED (Confidence: HIGH)", status: "covered" },
      { label: "Text Extraction", value: "49 Pages Extracted · Direct Stream Parsing", status: "covered" },
      { label: "Candidate Retrieval", value: "12 Critical Procurement Domains Indexed" },
    ],
    verdictAction:
      "Document authenticated as genuine public procurement tender. Trigger and context window expansion initialized across all 49 pages.",
  },
  {
    step: "02",
    badge: "EVIDENCE VALIDATION",
    title: "Clause Extraction & Verbatim Evidence Validation",
    shortDesc:
      "Targeted extraction analyzes critical procurement categories. Every extracted finding is tested against 100% exact substring matching to eliminate synthetic hallucinations.",
    consoleTitle: "Clause Extraction & Verbatim Match Engine",
    metric: "18 Verified Findings",
    metricLabel: "100% Substring Grounding · 0 Hallucinations",
    visualTag: "CRITICAL EXPOSURE",
    visualTagColor: "danger",
    documentContext: {
      section: "Section 6.2: Indemnification & Liability Risk",
      page: "Page 14",
      quote:
        "The Supplier shall indemnify, defend and hold harmless the Authority from and against any and all claims, losses, damages, liabilities, costs and expenses arising out of or related to this Agreement without limitation.",
    },
    forensicInsights: [
      { label: "Liability Ceiling", value: "Uncapped (No aggregate stop-loss ceiling)", status: "danger" },
      { label: "Delay Penalties", value: "₹1,25,000 / calendar day of delay", status: "danger" },
      { label: "Support SLAs", value: "'Immediate response required' (Ambiguous SLA)", status: "warning" },
      { label: "Performance Security", value: "5% PBG required within 15 days (Pg 22)", status: "covered" },
    ],
    verdictAction:
      "Discovered uncapped indemnification risk. Verbatim quote verified character-for-character against Page 14 raw text. Zero unsupported claims accepted into confirmed findings.",
  },
  {
    step: "03",
    badge: "DECISION BRIEF",
    title: "Selective Risk Interpretation & 12-Domain Coverage",
    shortDesc:
      "High-risk clauses receive automated business implication analysis and actionable pre-bid clarification inquiries. 12 critical domains are audited for coverage health.",
    consoleTitle: "Executive Decision Dossier & Q&A Strategy",
    metric: "12 Critical Domains Evaluated",
    metricLabel: "Domain Health: Review Required",
    visualTag: "ACTION REQUIRED",
    visualTagColor: "danger",
    documentContext: {
      section: "Pre-Bid Clarification Action Item #1 · Section 6.2",
      page: "Page 14 (Indemnity)",
      quote:
        "Formal Pre-Bid Clarification Request: Propose amendment to Clause 6.2 inserting an aggregate liability cap of 100% contract value, and a 10% maximum cumulative ceiling on liquidated damages.",
    },
    forensicInsights: [
      { label: "Liability Risk Domain", value: "REVIEW_REQUIRED (Uncapped risk on Pg 14)", status: "danger" },
      { label: "Penalties & LDs Domain", value: "REVIEW_REQUIRED (No cumulative cap on LDs)", status: "warning" },
      { label: "Eligibility & Mandatory Docs", value: "COVERED (Turnover & ISO certs met)", status: "covered" },
      { label: "Pre-Bid Clarifications", value: "3 Clarification Inquiries Drafted", status: "covered" },
    ],
    verdictAction:
      "Executive dossier compiled. Recommends raising clarification questions during the official pre-bid window to negotiate a standard 100% liability cap before submitting a price bid.",
  },
];

export default function DecisionBrief({ user = null }: { user?: any | null }) {
  const [[activeStepIndex, direction], setStage] = useState<[number, number]>([0, 0]);
  const activeStage = INVESTIGATION_STAGES[activeStepIndex];

  const navigateTo = (newIndex: number) => {
    if (newIndex === activeStepIndex) return;
    const dir = newIndex > activeStepIndex ? 1 : -1;
    setStage([newIndex, dir]);
  };

  const handleNext = () => {
    const nextIndex = activeStepIndex < 2 ? activeStepIndex + 1 : 0;
    const dir = nextIndex > activeStepIndex ? 1 : 1;
    setStage([nextIndex, dir]);
  };

  const handlePrev = () => {
    const prevIndex = activeStepIndex > 0 ? activeStepIndex - 1 : 2;
    const dir = prevIndex < activeStepIndex ? -1 : -1;
    setStage([prevIndex, dir]);
  };

  const consoleVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 20 : dir < 0 ? -20 : 0,
      opacity: 0,
      filter: "blur(4px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        x: { type: "spring" as const, stiffness: 320, damping: 30 },
        opacity: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
        filter: { duration: 0.22 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -20 : dir < 0 ? 20 : 0,
      opacity: 0,
      filter: "blur(4px)",
      transition: {
        x: { type: "spring" as const, stiffness: 320, damping: 30 },
        opacity: { duration: 0.18, ease: "easeInOut" },
        filter: { duration: 0.18 },
      },
    }),
  };

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
                className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-[#3157D5] px-6 py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#2845a9] transition-all duration-150 active:scale-[0.98]"
              >
                <span>Analyse a tender</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-[#D0D5DD] bg-white px-5 py-3.5 text-[14px] font-medium text-[#344054] hover:bg-gray-50 transition-colors duration-150"
              >
                <span>Explore the investigation flow</span>
                <ArrowDown className="w-3.5 h-3.5 text-[#667085]" strokeWidth={2} />
              </a>
            </div>

            {/* Micro-Metrics Bar */}
            <div className="w-full grid grid-cols-3 gap-4 pt-6 border-t border-[#D9DEE5]">
              <div>
                <div className="text-[18px] font-bold text-[#111827]">~30s</div>
                <div className="text-[12px] text-[#667085] font-medium">Automated Intake & Audit</div>
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
                  <span>₹350 Cr Est. Value</span>
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
                    <span className="inline-flex items-center gap-1 text-[#027A48] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Covered
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-[#344054]">Liability Cap</span>
                    <span className="inline-flex items-center gap-1 text-[#B42318] font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Uncapped
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-[#344054]">Milestone Penalties</span>
                    <span className="inline-flex items-center gap-1 text-[#B42318] font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ₹1.25L/Day
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-[#344054]">Support SLAs</span>
                    <span className="inline-flex items-center gap-1 text-[#B54708] font-semibold">
                      <HelpCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Ambiguous
                    </span>
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
        id="how-it-works"
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
                <motion.button
                  key={stage.step}
                  onClick={() => navigateTo(idx)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`text-left p-5 rounded-md border transition-all duration-200 flex flex-col justify-between relative overflow-hidden cursor-pointer ${
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
                      transition={{ type: "spring", stiffness: 350, damping: 32 }}
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
                </motion.button>
              );
            })}
          </div>

          {/* Dynamic Forensic Console Screen - LIGHT THEME */}
          <div className="w-full bg-[#FAFAFC] rounded-xl p-6 sm:p-8 md:p-9 shadow-sm border border-[#D9DEE5] overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeStage.step}
                custom={direction}
                variants={consoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col gap-6"
              >
                {/* Console Terminal Header */}
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#E4E7EC] gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                    <span className="text-[12px] font-mono font-semibold tracking-wider uppercase text-[#344054]">
                      FORENSIC PIPELINE DESK // {activeStage.consoleTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border transition-colors ${
                        activeStage.visualTagColor === "danger"
                          ? "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]"
                          : activeStage.visualTagColor === "success"
                          ? "bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]"
                          : "bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]"
                      }`}
                    >
                      ● {activeStage.visualTag}
                    </span>
                    <span className="text-[12px] font-mono font-medium text-[#667085]">
                      {activeStage.metricLabel}
                    </span>
                  </div>
                </div>

                {/* Main Console Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Console: Evidence Quote & Citations */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="lg:col-span-7 flex flex-col gap-4"
                  >
                    <div className="text-[11px] font-mono font-semibold tracking-wider uppercase text-[#667085] flex items-center justify-between">
                      <span>Source Evidence Interrogation</span>
                      <span className="text-[#475467] font-medium">{activeStage.documentContext.page}</span>
                    </div>

                    <div className="p-5 bg-white border border-[#E4E7EC] rounded-lg shadow-xs">
                      <div className="text-[12px] font-mono text-[#3157D5] mb-2.5 font-semibold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />
                        {activeStage.documentContext.section}
                      </div>
                      <div className="p-4 bg-[#F8F9FA] rounded border-l-3 border-[#3157D5]">
                        <p className="text-[15px] sm:text-[16px] font-serif leading-relaxed text-[#1F2937] italic">
                          &quot;{activeStage.documentContext.quote}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Forensic Finding Box */}
                    <div className="p-4 bg-white border border-[#E4E7EC] rounded-lg shadow-xs">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] mb-1.5">
                        Pipeline Action & Grounding
                      </div>
                      <p className="text-[13px] text-[#344054] leading-relaxed">
                        {activeStage.verdictAction}
                      </p>
                    </div>
                  </motion.div>

                  {/* Right Console: Line-Item Clause Audit Log */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="lg:col-span-5 flex flex-col gap-3"
                  >
                    <div className="text-[11px] font-mono font-semibold tracking-wider uppercase text-[#667085] mb-1">
                      Investigation Audit Log
                    </div>

                    <div className="flex flex-col divide-y divide-[#EAECF0] bg-white border border-[#E4E7EC] rounded-lg shadow-xs overflow-hidden">
                      {activeStage.forensicInsights.map((insight, i) => (
                        <div key={i} className="p-3.5 flex flex-col gap-1 hover:bg-[#F9FAFB] transition-colors">
                          <span className="text-[11px] font-mono text-[#667085] uppercase tracking-wider">
                            {insight.label}
                          </span>
                          <span
                            className={`text-[13px] font-medium flex items-center justify-between ${
                              insight.status === "danger"
                                ? "text-[#B42318] font-semibold"
                                : insight.status === "warning"
                                ? "text-[#B54708] font-semibold"
                                : insight.status === "covered"
                                ? "text-[#027A48] font-semibold"
                                : "text-[#1F2937]"
                            }`}
                          >
                            <span>{insight.value}</span>
                            {insight.status === "danger" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] shrink-0">
                                <AlertTriangle className="w-3 h-3 text-[#B42318] shrink-0" strokeWidth={2.5} />
                                CRITICAL
                              </span>
                            )}
                            {insight.status === "warning" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] shrink-0">
                                <HelpCircle className="w-3 h-3 text-[#B54708] shrink-0" strokeWidth={2.5} />
                                AMBIGUOUS
                              </span>
                            )}
                            {insight.status === "covered" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-[#027A48] shrink-0" strokeWidth={2.5} />
                                VERIFIED
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                </div>

                {/* Bottom Console Action Row */}
                <div className="pt-4 border-t border-[#E4E7EC] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-mono text-[#667085]">
                      Stage {activeStage.step} of 03 in the RFPground analysis pipeline.
                    </span>
                    {/* Visual Stage Progress Track */}
                    <div className="flex items-center gap-1.5">
                      {INVESTIGATION_STAGES.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => navigateTo(i)}
                          aria-label={`Jump to Stage 0${i + 1}`}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            i === activeStepIndex
                              ? "w-6 bg-[#3157D5]"
                              : "w-2 bg-[#D0D5DD] hover:bg-gray-400"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={handlePrev}
                      className="group inline-flex items-center px-3.5 py-1.5 text-[12px] font-mono font-medium bg-white hover:bg-gray-50 text-[#344054] rounded border border-[#D0D5DD] shadow-2xs hover:shadow-xs transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.5} />
                      <span>Prev Stage</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={handleNext}
                      className="group inline-flex items-center px-4 py-1.5 text-[12px] font-mono font-semibold bg-[#3157D5] hover:bg-[#2845a9] text-white rounded shadow-2xs hover:shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Next Stage</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
