import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";
import { Check, ArrowRight, HelpCircle, Minus } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RFPGround Pricing | Tender Qualification & Contract Exposure",
  description: "Explore RFPGround Free, Plus, and Pro plans for RFP and tender qualification, analysis, and contract exposure.",
  alternates: {
    canonical: "/pricing",
  },
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F4] text-[#111827]">
      <LandingNavbar initialUser={user} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 lg:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-blue-50 text-[#3157D5] border border-blue-200 mb-4">
            <span>PLANS &amp; PRICING</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#111827]">
            Tender Qualification &amp; Contract Exposure
          </h1>
          <p className="mt-3 text-[15px] text-[#4B5563] leading-relaxed">
            Choose the plan that matches your bidding workflow. Qualify tenders rapidly with Plus, or inspect deep contractual liability and exposure with Pro.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-stretch">
          {/* FREE PLAN */}
          <div className="bg-white rounded-xl border border-[#D9DEE5] p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                FREE
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl md:text-4xl font-extrabold text-[#111827]">₹0</span>
                <span className="text-[13px] text-[#6B7280]">/ lifetime</span>
              </div>
              <p className="text-[13px] text-[#4B5563] mb-6 leading-relaxed">
                Initial evaluation access for evaluating RFPGround on your first tender or procurement opportunity.
              </p>

              <div className="border-t border-[#E5E7EB] pt-5 space-y-3">
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span><strong>3 lifetime</strong> tender analyses</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Tender Qualification summary</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Mandatory requirements &amp; eligibility</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Submission dates &amp; deadlines</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Evidence-backed analysis quotes</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="w-full inline-flex items-center justify-center rounded-sm py-2.5 px-4 text-[13px] font-semibold border border-[#D0D5DD] bg-white text-[#374151] hover:bg-gray-50 transition-colors"
              >
                {user ? "Go to Dashboard" : "Get Started Free"}
              </Link>
            </div>
          </div>

          {/* PLUS PLAN (RECOMMENDED) */}
          <div className="bg-white rounded-xl border-2 border-[#3157D5] p-6 flex flex-col justify-between shadow-md relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3157D5] text-white text-[11px] font-bold uppercase tracking-wider py-0.5 px-3 rounded-full whitespace-nowrap">
              RECOMMENDED &middot; TENDER QUALIFICATION
            </div>

            <div>
              <div className="text-[12px] font-bold text-[#3157D5] uppercase tracking-wider mb-1">
                PLUS
              </div>
              <h3 className="text-[16px] font-bold text-[#111827] mb-1">
                Tender Qualification
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl md:text-4xl font-extrabold text-[#111827]">₹499</span>
                <span className="text-[13px] text-[#6B7280]">/month</span>
              </div>
              <p className="text-[12px] font-semibold text-[#3157D5] italic mb-1">
                &ldquo;Should we bid?&rdquo;
              </p>
              <p className="text-[13px] text-[#4B5563] mb-6 leading-relaxed">
                For commercial teams that need to qualify tenders quickly and filter bid opportunities.
              </p>

              <div className="border-t border-[#E5E7EB] pt-5 space-y-2.5">
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span><strong>15 tender analyses</strong> / billing cycle</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Tender Qualification analysis</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Eligibility criteria verification</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Mandatory requirements checklist</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Submission dates &amp; milestones</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Evaluation criteria &amp; scoring formula</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Financial requirements &amp; turnover</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>EMD / bid security requirements</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Performance security (PBG) thresholds</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Evidence-backed analysis &amp; citations</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
              <Link
                href={user ? "/subscription" : "/login?next=/subscription"}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-sm py-2.5 px-4 text-[13px] font-semibold bg-[#3157D5] text-white hover:bg-[#2845a9] transition-all shadow-xs"
              >
                <span>Select Plus Plan</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          </div>

          {/* PRO PLAN */}
          <div className="bg-white rounded-xl border border-[#D9DEE5] p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                PRO
              </div>
              <h3 className="text-[16px] font-bold text-[#111827] mb-1">
                Tender + Contract Exposure
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl md:text-4xl font-extrabold text-[#111827]">₹999</span>
                <span className="text-[13px] text-[#6B7280]">/month</span>
              </div>
              <p className="text-[12px] font-semibold text-[#111827] italic mb-1">
                &ldquo;What are we taking on if we bid?&rdquo;
              </p>
              <p className="text-[13px] text-[#4B5563] mb-6 leading-relaxed">
                For organizations evaluating high-stakes tenders with complex legal and financial liabilities.
              </p>

              <div className="border-t border-[#E5E7EB] pt-5 space-y-2.5">
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span><strong>15 tender analyses</strong> / billing cycle</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] font-semibold text-[#111827]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Everything included in Plus</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Contract Exposure analysis</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Liability caps &amp; unlimited exposure risks</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Indemnity obligations &amp; hold-harmless review</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Termination &amp; suspension conditions</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Penalties &amp; liquidated damages ceilings</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Insurance &amp; coverage mandates</span>
                </div>
                <div className="flex items-start gap-2.5 text-[13px] text-[#374151]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>Deeper contractual inspection &amp; risk matrix</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
              <Link
                href={user ? "/subscription" : "/login?next=/subscription"}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-sm py-2.5 px-4 text-[13px] font-semibold border border-[#3157D5] bg-white text-[#3157D5] hover:bg-blue-50 transition-colors"
              >
                <span>Select Pro Plan</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="mb-16">
          <div className="mb-6">
            <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">
              Detailed Plan Comparison
            </h2>
            <p className="text-[14px] text-[#6B7280]">
              Evaluate capability breakdown across all RFPGround plans.
            </p>
          </div>

          <div className="border border-[#D9DEE5] rounded-lg bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="py-3.5 px-5 font-semibold text-[#111827] w-1/2">Capability</th>
                    <th className="py-3.5 px-4 font-semibold text-[#111827] text-center">Free (₹0)</th>
                    <th className="py-3.5 px-4 font-semibold text-[#3157D5] text-center">Plus (₹499/mo)</th>
                    <th className="py-3.5 px-4 font-semibold text-[#111827] text-center">Pro (₹999/mo)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Analysis Capacity</td>
                    <td className="py-3 px-4 text-center">3 lifetime</td>
                    <td className="py-3 px-4 text-center font-medium text-[#3157D5]">15 / billing cycle</td>
                    <td className="py-3 px-4 text-center font-medium">15 / billing cycle</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Tender Qualification Overview</td>
                    <td className="py-3 px-4 text-center">Basic</td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Eligibility &amp; Mandatory Criteria</td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Submission Dates &amp; Milestone Timing</td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Evaluation Criteria &amp; Scoring</td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Financial Requirements / EMD / PBG Thresholds</td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Verification Quote &amp; Citation Matching</td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Liability &amp; Contract Risk</td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Indemnity &amp; Hold Harmless</td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Termination &amp; Suspension</td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Penalties &amp; Liquidated Damages</td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Insurance &amp; Financial Security</td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Minus className="w-3.5 h-3.5 text-[#9CA3AF] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-[#111827]">Data Exports</td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#3157D5] mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Commercial Decision FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="mb-6 text-center">
            <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-[14px] text-[#6B7280]">
              Key commercial details about subscriptions and quotas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-1.5">
                Can I upgrade or change my plan later?
              </h3>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Yes. You can change your subscription plan through the available subscription settings. Any plan change will take effect according to the applicable billing and subscription terms shown at the time of the change.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-1.5">
                What happens when my analyses are consumed?
              </h3>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Your plan includes the stated number of analyses for each billing cycle. Once your available analyses are used, you cannot start another analysis until the next billing cycle or until you change to an eligible plan. Unused analyses do not carry forward to the next billing cycle.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-1.5">
                How does the Free plan quota work?
              </h3>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                The Free plan includes 3 tender analyses for your account. These analyses are available without a recurring subscription and allow you to evaluate RFPGround before choosing a paid plan.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-1.5">
                Can I cancel my subscription?
              </h3>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Yes. You can cancel future subscription renewals through the available subscription settings or by contacting RFPGround support. Cancellation prevents the next renewal but does not refund the current paid billing period or unused analysis capacity. See our{" "}
                <Link href="/refund-cancellation" className="text-[#3157D5] hover:underline font-medium">
                  Refund &amp; Cancellation Policy
                </Link>{" "}
                for details.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-1.5">
                Are RFPGround subscriptions refundable?
              </h3>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Subscription fees are generally non-refundable once the applicable billing period has started. Verified duplicate, unauthorized, or erroneous transactions may be investigated and addressed where appropriate. See our{" "}
                <Link href="/refund-cancellation" className="text-[#3157D5] hover:underline font-medium">
                  Refund &amp; Cancellation Policy
                </Link>{" "}
                for details.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <h3 className="text-[14px] font-semibold text-[#111827] mb-1.5">
                Which payment methods and currencies are supported?
              </h3>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                RFPGround subscriptions are billed in Indian Rupees (INR). Available payment methods are shown at checkout and may include supported cards, UPI, and net banking depending on the payment options available for your transaction.
              </p>
            </div>
          </div>
        </div>

        {/* Minimal Commercial Cross-Reference */}
        <div className="text-center border-t border-[#E5E7EB] pt-8 text-[13px] text-[#6B7280]">
          <p>
            Looking for billing resolution or policy details? Review our{" "}
            <Link href="/refund-cancellation" className="text-[#3157D5] hover:underline font-medium">
              Refund &amp; Cancellation Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-[#3157D5] hover:underline font-medium">
              Terms of Service
            </Link>.
          </p>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
