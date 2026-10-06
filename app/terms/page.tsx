import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";
import { FileText, ShieldAlert, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | RFPGround",
  description: "Terms governing the use of RFPGround's RFP and tender analysis and decision-support service.",
  alternates: {
    canonical: "/terms",
  },
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
            <span>Contractual Agreement</span>
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#111827] mb-3">
            Terms of Service
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Effective Date: September 22, 2026 &middot; Last Revised: October 6, 2026
          </p>
          <p className="mt-4 text-[15px] text-[#4B5563] leading-relaxed">
            Please read these Terms of Service carefully before accessing or using RFPGround.
          </p>
        </header>

        {/* Legal Body Sections */}
        <div className="space-y-12 text-[15px] leading-relaxed text-[#374151]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering for, or using the RFPGround website, application, or related services, you agree to these Terms of Service and our{" "}
              <Link href="/privacy" className="text-[#3157D5] underline hover:text-[#2544a8]">
                Privacy Policy
              </Link>. If you do not agree with these Terms, please do not use RFPGround.
            </p>
            <p>
              If you are entering into these Terms on behalf of an organization or company, you represent that you have authority to bind that organization.
            </p>
            <p>
              These Terms form the agreement governing your use of RFPGround.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              2. Description of the Service
            </h2>
            <p>
              RFPGround is an automated RFP and tender analysis and decision-support platform. The service helps users inspect procurement documents, identify requirements, organize evidence, surface potential exposure, and support informed bid decisions.
            </p>
            <p>
              RFPGround may process information contained in uploaded tenders, RFPs, contracts, and related documents to provide analysis and related functionality.
            </p>
            <p>
              RFPGround is a decision-support tool. It does not replace the user&rsquo;s own review, professional judgment, or responsibility for decisions relating to a tender, bid, contract, or procurement opportunity.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              3. User Accounts and Acceptable Use
            </h2>
            <p>
              You are responsible for maintaining the security of your account credentials and for activity carried out through your account.
            </p>
            <p>
              You must provide information that is accurate and reasonably current and must not use RFPGround for unlawful, fraudulent, abusive, or unauthorized purposes.
            </p>
            <p>
              You agree not to attempt to reverse engineer, decompile, or gain unauthorized access to the underlying systems, or use the service in violation of applicable laws or procurement regulations.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              4. Plans and Subscriptions
            </h2>
            <p>
              RFPGround offers commercial tiers including Free (₹0 for 3 lifetime analyses), Plus (₹499/month for 15 analyses per billing cycle with Tender Qualification capabilities), and Pro (₹999/month for 15 analyses per billing cycle with Tender Qualification and Contract Exposure capabilities).
            </p>
            <p>
              Current plan features, limits, and pricing are displayed on the{" "}
              <Link href="/pricing" className="text-[#3157D5] underline hover:text-[#2544a8]">
                Pricing page
              </Link>.
            </p>
            <p>
              RFPGround may modify plan features, limits, pricing, or availability from time to time. Changes to recurring pricing will apply prospectively and will not alter a billing period that has already been paid for, except where otherwise required by applicable law.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              5. Payment Terms
            </h2>
            <p>
              Subscription fees are payable in Indian Rupees (INR) at the time of purchase or renewal of the applicable subscription.
            </p>
            <p>
              Subscription fees are generally non-refundable once the applicable billing period has started, subject to our{" "}
              <Link href="/refund-cancellation" className="text-[#3157D5] underline hover:text-[#2544a8]">
                Refund &amp; Cancellation Policy
              </Link>{" "}
              and any rights or remedies that cannot legally be excluded.
            </p>
            <p>
              Customers may cancel future subscription renewals in accordance with the Refund &amp; Cancellation Policy. Cancellation does not create a refund for the current billing period or unused analysis capacity.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              6. Cancellation of Subscriptions
            </h2>
            <p>
              You may cancel your subscription at any time before the next scheduled renewal through the available subscription settings in your account or by contacting RFPGround support.
            </p>
            <p>
              Cancellation prevents future subscription renewals. It does not terminate the current paid billing period or entitle you to a refund for the current subscription fee or unused analysis capacity.
            </p>
            <p>
              Unless otherwise required by applicable law, paid-plan access remains available through the end of the current paid billing period.
            </p>
            <p>
              Further information is provided in our{" "}
              <Link href="/refund-cancellation" className="text-[#3157D5] underline hover:text-[#2544a8]">
                Refund &amp; Cancellation Policy
              </Link>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              7. Customer Documents &amp; Intellectual Property
            </h2>
            <p>
              You retain ownership of the documents, data, and other content that you upload to RFPGround.
            </p>
            <p>
              You grant RFPGround a limited, non-exclusive right to host, store, reproduce, process, inspect, and analyze uploaded content only to the extent reasonably necessary to provide, secure, maintain, and operate the RFPGround service, subject to these Terms, our Privacy Policy, and applicable law.
            </p>
            <p>
              This permission does not transfer ownership of your uploaded content to RFPGround.
            </p>
            <p>
              You are responsible for ensuring that you have the necessary rights and authority to upload the content and authorize RFPGround to process it.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              8. Confidentiality &amp; Data Handling
            </h2>
            <p>
              RFPGround processes account information, uploaded documents, and other personal information in accordance with its{" "}
              <Link href="/privacy" className="text-[#3157D5] underline hover:text-[#2544a8]">
                Privacy Policy
              </Link>.
            </p>
            <p>
              RFPGround does not sell customer-uploaded tender documents as a product or intentionally make customer-uploaded documents publicly available.
            </p>
            <p>
              RFPGround may use infrastructure and service providers necessary to operate the service. Information handled by such providers is subject to appropriate contractual, technical, or organizational controls applicable to the service.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              9. Automated Analysis &amp; Professional Judgment
            </h2>
            <p>
              RFPGround uses automated processing and AI-assisted methods to identify, organize, extract, and explain information contained in uploaded documents.
            </p>
            <p>
              Automated analysis may contain omissions, inaccuracies, extraction errors, or other limitations. Users should review the underlying tender, RFP, contract, or other source document before relying on an analysis result.
            </p>
            <p>
              RFPGround is a decision-support tool and does not provide legal, tax, financial, procurement, engineering, or other professional advice.
            </p>
            <p>
              Users remain responsible for evaluating the underlying documents and making their own commercial, procurement, legal, financial, or other decisions.
            </p>
            <div className="bg-[#EFF4FF] border border-[#BFDBFE] rounded-lg p-4 my-2 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[14px] font-semibold text-[#1E40AF] leading-snug">
                The absence of a detected finding does not establish the absence of a contractual or tender requirement.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              10. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, RFPGround will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, business opportunities, goodwill, or data arising from or related to your use of the service.
            </p>
            <p>
              To the extent permitted by applicable law, RFPGround&rsquo;s cumulative liability arising out of or related to these Terms or your use of the service shall not exceed the total fees paid by you to RFPGround in the twelve (12) months preceding the incident giving rise to liability.
            </p>
            <p className="font-medium text-[#111827]">
              Nothing in these Terms excludes, restricts, or waives any right, remedy, liability, or protection that cannot lawfully be excluded, restricted, or waived under applicable law.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              11. Changes to the Service
            </h2>
            <p>
              RFPGround may modify, improve, suspend, or discontinue features or functionality from time to time as the service evolves.
            </p>
            <p>
              Where a material change significantly affects an active paid service, RFPGround will provide reasonable notice where practicable, subject to security, legal, operational, and emergency requirements.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              12. Changes to These Terms
            </h2>
            <p>
              RFPGround may update these Terms from time to time to reflect changes to the service, applicable law, business practices, or security requirements.
            </p>
            <p>
              The updated Terms will be published on this page with a revised effective date or last-revised date.
            </p>
            <p>
              Where appropriate, material changes may also be communicated through reasonable additional means.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              13. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These Terms are governed by the laws of India. Subject to applicable law, courts having jurisdiction in Bengaluru, Karnataka will have jurisdiction over disputes arising from or relating to these Terms or the service.
            </p>
          </section>

          {/* Section 14 */}
          <section className="space-y-3 border-t border-[#E5E7EB] pt-8">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              14. Service Provider &amp; Contact Information
            </h2>
            <p className="font-medium text-[#111827]">
              RFPGround &mdash; RFP &amp; Tender Decision Intelligence
            </p>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 text-[13.5px] space-y-2 text-[#4B5563]">
              <p>
                <strong className="text-[#111827]">Operated By:</strong> <strong className="text-[#111827]">POOVADI KISHOREBABU CHIRANJEEVI</strong>
              </p>
              <p>
                <strong className="text-[#111827]">Operating Location:</strong> Bengaluru, Karnataka, India
              </p>
              <p>
                <strong className="text-[#111827]">Customer Support:</strong> For customer support and inquiries regarding these Terms, contact{" "}
                <a
                  href="mailto:support@rfpground.com"
                  className="text-[#3157D5] hover:text-[#2544a8] underline inline-flex items-center gap-1 font-medium"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>support@rfpground.com</span>
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
