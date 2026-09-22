import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";
import { AlertCircle, FileText, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Terms of Service | RFPground",
  description: "Terms of Service, subscription billing rules, and strict no-refund policy for RFPground.",
};

export default async function TermsOfServicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-[#111827]">
      <LandingNavbar initialUser={user} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 lg:px-8 py-12 md:py-16">
        {/* Document Header */}
        <header className="border-b border-[#E5E7EB] pb-8 mb-10">
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280] mb-3">
            <FileText className="w-3.5 h-3.5 text-[#3157D5]" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#111827] mb-3">
            Terms of Service
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Effective Date: September 22, 2026 &middot; Last Revised: September 22, 2026
          </p>
          <p className="mt-4 text-[15px] text-[#4B5563] leading-relaxed">
            Please read these Terms of Service carefully before accessing or using RFPground. By creating an account, accessing the platform, or purchasing a subscription, you agree to be bound by the terms, billing rules, and policies described below.
          </p>
        </header>

        {/* Notice Callout: Strict No-Refund & No-Return Policy */}
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-6 mb-12 shadow-xs">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" strokeWidth={2} />
            <div className="space-y-2">
              <h2 className="text-[15px] font-semibold text-[#92400E]">
                Important Notice: All Purchases Are Final, Non-Refundable & Non-Returnable
              </h2>
              <p className="text-[14px] text-[#78350F] leading-relaxed">
                RFPground provides immediate digital software access and automated document analysis capacity upon checkout. Because access to the platform and quota allocations are provisioned instantly, <strong>all purchases, subscription fees, and transactions are strictly non-refundable and non-returnable under any circumstance</strong>.
              </p>
              <p className="text-[13px] text-[#92400E] font-medium">
                No pro-rated refunds, partial credits, or returns are granted for active billing periods or unused analysis quotas.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Body Sections */}
        <div className="space-y-12 text-[15px] leading-relaxed text-[#374151]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering for, or using the RFPground website (accessible at rfpground.com) and associated software services (collectively, the &ldquo;Service&rdquo;), you enter into a binding legal contract with RFPground (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            </p>
            <p>
              If you are agreeing to these Terms on behalf of a company, organization, government entity, or other legal entity, you represent and warrant that you have full legal authority to bind that organization to these Terms. If you do not have such authority or do not agree to all provisions contained herein, you must not access or use RFPground.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              2. Description of the Service
            </h2>
            <p>
              RFPground is an automated software platform designed to assist procurement professionals, contractors, bidders, and commercial teams in reviewing and qualifying Request for Proposal (RFP) documents, tenders, contracts, and solicitations.
            </p>
            <p>
              The platform enables users to upload procurement specifications to automatically identify scope criteria, mandatory qualification requirements, deadlines, compliance checklists, commercial terms, and operational risks. The Service is provided as an assistive productivity tool to streamline pre-bid evaluation.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              3. User Accounts and Security
            </h2>
            <p>
              To access certain features of RFPground, you must create an account using valid authentication credentials. You agree to provide accurate, current, and complete information during registration and to keep your credentials confidential.
            </p>
            <p>
              You are solely responsible for all activities that occur under your account. If you suspect unauthorized access or any security breach involving your account, you must immediately notify our support team at <a href="mailto:support@rfpground.com" className="text-[#3157D5] underline hover:text-[#2544a8]">support@rfpground.com</a>.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              4. Subscription Plans, Fees &amp; Billing
            </h2>
            <p>
              RFPground offers both free evaluation access and paid monthly subscription plans. Current pricing, plan details, and analysis allotments are displayed on our website and in your account dashboard.
            </p>
            
            <div className="border border-[#E5E7EB] bg-white rounded-lg overflow-hidden my-4">
              <div className="bg-[#F9FAFB] px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#111827] uppercase tracking-wider">Plan</span>
                <span className="text-[13px] font-semibold text-[#111827] uppercase tracking-wider">Analysis Allowance</span>
              </div>
              <div className="divide-y divide-[#E5E7EB] text-[14px]">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#111827]">Free Plan</span>
                    <span className="text-[#6B7280] ml-2">(₹0 / Evaluation)</span>
                  </div>
                  <span className="text-[#374151]">3 lifetime tender analyses</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#111827]">Plus Plan</span>
                    <span className="text-[#6B7280] ml-2">(₹499 / month)</span>
                  </div>
                  <span className="text-[#374151]">15 tender analyses per monthly cycle</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#111827]">Pro Plan</span>
                    <span className="text-[#6B7280] ml-2">(₹999 / month)</span>
                  </div>
                  <span className="text-[#374151]">15 tender analyses + deep contract extraction</span>
                </div>
              </div>
            </div>

            <p>
              Subscription fees are billed in advance on a recurring monthly cycle. All fees are stated in Indian Rupees (INR) and are inclusive of applicable taxes unless specified otherwise. By subscribing, you authorize our authorized payment processors to bill your designated payment method at the beginning of each billing period.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              5. Strict No-Refund and No-Return Policy
            </h2>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3.5">
              <p>
                <strong>5.1 Immediate Digital Delivery:</strong> RFPground provides digital software access and automated document intelligence. Upon completing checkout, your account is immediately provisioned with subscription privileges, processing capacity, and allocated analysis quotas.
              </p>
              <p>
                <strong>5.2 Non-Refundable Purchases:</strong> Because digital software services and processing capacities are made accessible instantly upon transaction confirmation, all subscription fees, plan upgrades, and payments made to RFPground are strictly non-refundable under any circumstance.
              </p>
              <p>
                <strong>5.3 Non-Returnable Digital Goods:</strong> As digital software access and analytical capacity cannot be returned once delivered, returns, exchanges, and store credits are not provided.
              </p>
              <p>
                <strong>5.4 No Pro-Rated Refunds or Quota Carryover:</strong> Subscription cycles run for their full monthly term. We do not issue partial refunds, pro-rated reimbursements, or cash equivalents for unused analysis allotments or early account abandonment. Unused monthly allowances do not roll over to subsequent cycles.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              6. Cancellation of Subscription Renewal
            </h2>
            <p>
              You may cancel the automatic renewal of your subscription at any time directly through your account subscription settings. 
            </p>
            <p>
              When you cancel your renewal, your cancellation will take effect at the conclusion of your current paid billing period. Your account will retain uninterrupted access to your subscription tier and allocated analyses until the end of that billing period. Once the paid period expires, no further charges will be billed, and your account will transition to standard evaluation access.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              7. Document Ownership &amp; Confidentiality
            </h2>
            <p>
              <strong>Your Documents:</strong> You retain sole ownership, title, and intellectual property rights in and to all RFP specifications, bid documents, tender packets, and materials that you upload to RFPground.
            </p>
            <p>
              <strong>Confidential Processing:</strong> All documents and data uploaded to RFPground are treated as strictly confidential. We process your uploaded files solely to generate pre-bid intelligence briefs and risk summaries for your authenticated account.
            </p>
            <p>
              <strong>Data Privacy:</strong> We do not sell, license, rent, or publicly disclose your proprietary documents or tender submissions to any third party or to other users of the platform.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              8. Informational Tool &amp; Disclaimer of Warranty
            </h2>
            <p>
              RFPground is an automated software analysis tool designed to aid and accelerate human evaluation of complex solicitations. Findings, risk scores, clause citations, and summaries generated by the platform are provided for informational and decision-support purposes only.
            </p>
            <p>
              RFPground does not provide formal legal, financial, engineering, or regulatory counsel, nor does it guarantee the accuracy, completeness, or suitability of any tender analysis for a specific bidding outcome. Your organization retains sole and final responsibility for reviewing all official tender documents, verifying bid requirements, confirming pricing, and deciding whether to submit a bid.
            </p>
            <p>
              The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express, statutory, or implied, including warranties of merchantability or fitness for a particular purpose.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall RFPground, its officers, employees, partners, or licensors be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, bids, business opportunities, data, or operational interruptions arising from or related to your use of or inability to use the Service.
            </p>
            <p>
              In all cases, RFPground&rsquo;s total cumulative liability arising out of or related to these Terms or your use of the platform shall not exceed the total amount actually paid by you to RFPground in the twelve (12) months preceding the incident giving rise to liability.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              10. Changes to Terms
            </h2>
            <p>
              We reserve the right to revise or update these Terms of Service periodically to reflect changes in our platform, commercial practices, or legal requirements. When revisions occur, we will update the &ldquo;Last Revised&rdquo; date at the top of this document. Continued use of the Service following the publication of updated Terms constitutes your acknowledgment and acceptance of the revised Terms.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3 border-t border-[#E5E7EB] pt-8">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              11. Contact &amp; Support Inquiries
            </h2>
            <p>
              If you have any questions regarding these Terms of Service, billing details, or account support, please reach out to our team:
            </p>
            <div className="pt-1">
              <p className="font-medium text-[#111827]">RFPground Legal &amp; Commercial Support</p>
              <a 
                href="mailto:support@rfpground.com" 
                className="text-[#3157D5] hover:text-[#2544a8] font-medium text-[15px] underline"
              >
                support@rfpground.com
              </a>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
