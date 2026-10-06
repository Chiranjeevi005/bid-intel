import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";
import { Shield, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | RFPGround",
  description: "Learn how RFPGround processes personal information when you use its RFP and tender analysis services.",
  alternates: {
    canonical: "/privacy",
  },
};

export default async function PrivacyPolicyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-[#111827]">
      <LandingNavbar initialUser={user} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 lg:px-8 py-12 md:py-16">
        {/* Document Header */}
        <header className="border-b border-[#E5E7EB] pb-8 mb-10">
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280] mb-3">
            <Shield className="w-3.5 h-3.5 text-[#3157D5]" />
            <span>Data Protection &amp; Privacy</span>
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#111827] mb-3">
            Privacy Policy
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Effective Date: September 22, 2026 &middot; Last Revised: October 6, 2026
          </p>
          <p className="mt-4 text-[15px] text-[#4B5563] leading-relaxed">
            This Privacy Policy explains how RFPGround processes personal information when you use our website, application, and RFP and tender analysis services.
          </p>
        </header>

        {/* Content Body */}
        <div className="space-y-12 text-[15px] leading-relaxed text-[#374151]">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              1. Information We Process
            </h2>
            <p>
              Depending on how you interact with RFPGround, we may process the following categories of information:
            </p>
            <div className="space-y-3 text-[14px]">
              <div>
                <strong className="text-[#111827]">Account Information:</strong> We may process information associated with your RFPGround account, such as your name, email address, authentication information, and account preferences.
              </div>
              <div>
                <strong className="text-[#111827]">Authentication &amp; Security Information:</strong> We may process login events, timestamps, session-related information, and security information needed to authenticate users and protect accounts.
              </div>
              <div>
                <strong className="text-[#111827]">Service Usage Information:</strong> We may process information about how you interact with RFPGround, including features used, actions taken, and service activity.
              </div>
              <div>
                <strong className="text-[#111827]">Tender and RFP Content:</strong> When you submit tender, RFP, contract, or related content for analysis, RFPGround processes that content to provide the requested analysis and related service functionality.
              </div>
              <div>
                <strong className="text-[#111827]">Analysis Information:</strong> We may process information generated through your use of the service, including analysis results, findings, evidence references, and related service records.
              </div>
              <div>
                <strong className="text-[#111827]">Billing Information:</strong> Subscription and payment transactions may involve billing-related information necessary to process payments, maintain subscription status, prevent fraud, and provide billing support.
              </div>
              <div>
                <strong className="text-[#111827]">Technical Information:</strong> We may process limited technical information such as browser or device information, IP address, timestamps, diagnostic information, and similar information necessary for security, reliability, and service operation.
              </div>
            </div>

            {/* Data Minimisation Callout */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 my-2 text-[13.5px] text-[#4B5563]">
              <strong className="text-[#111827]">Data Minimisation:</strong> We seek to process personal information that is reasonably necessary for the purposes described in this Privacy Policy. We do not intentionally request personal information that is unnecessary to provide or secure the service.
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              2. How We Use Personal Information
            </h2>
            <p>
              We process personal information for the following specified purposes:
            </p>
            <div className="space-y-3 text-[14px]">
              <div>
                <strong className="text-[#111827]">Providing the Service:</strong> To operate RFPGround, authenticate accounts, process submitted content, provide analysis, and deliver requested functionality.
              </div>
              <div>
                <strong className="text-[#111827]">Account &amp; Authentication:</strong> To create and maintain accounts and authenticate users.
              </div>
              <div>
                <strong className="text-[#111827]">Service Operations:</strong> To maintain reliability, diagnose operational issues, prevent misuse, and protect the service.
              </div>
              <div>
                <strong className="text-[#111827]">Subscription &amp; Billing:</strong> To process subscriptions, maintain entitlement status, process payments through applicable payment service providers, and address billing issues.
              </div>
              <div>
                <strong className="text-[#111827]">Communications:</strong> To send service-related communications, account notifications, billing notices, security messages, and other communications necessary to provide the service.
              </div>
              <div>
                <strong className="text-[#111827]">Security &amp; Fraud Prevention:</strong> To detect, investigate, and prevent unauthorized access, fraud, abuse, and security incidents.
              </div>
              <div>
                <strong className="text-[#111827]">Legal Compliance:</strong> To comply with applicable legal obligations and respond to lawful requests where required.
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              3. Customer-Submitted Content
            </h2>
            <p>
              RFPGround processes tender, RFP, contract, and related content that you submit to the service for the purpose of providing the requested analysis and related functionality.
            </p>
            <p>
              You should ensure that you have the necessary authority and rights to submit content to RFPGround and to permit us to process it for these purposes.
            </p>
            <p>
              RFPGround does not use customer-submitted tender or contract content as public content or sell such content as a product.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              4. Service Providers
            </h2>
            <p>
              RFPGround may work with third-party service providers that support the operation and delivery of the service.
            </p>
            <p>
              Depending on the service involved, these providers may assist with areas such as infrastructure, security, payment processing, communications, analytics, authentication, or automated service functionality.
            </p>
            <p>
              Such providers may process information only as necessary to perform the services they provide to RFPGround or as otherwise permitted by applicable law.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              5. Data Security
            </h2>
            <p>
              RFPGround maintains reasonable technical and organisational measures designed to protect personal information against unauthorized access, misuse, alteration, loss, or disclosure.
            </p>
            <p>
              Access to information is restricted based on operational requirements and appropriate access controls.
            </p>
            <p>
              We review our security practices periodically and may update them as the service and applicable requirements evolve.
            </p>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 space-y-1.5 text-[13.5px]">
              <strong className="text-[#111827]">Personal Data Breaches:</strong>
              <p className="text-[#4B5563]">
                If RFPGround becomes aware of a personal data breach requiring notification under applicable law, we will take appropriate steps to investigate, contain, and address the incident and provide notifications required by applicable law.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              6. Retention &amp; Deletion
            </h2>
            <p>
              We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, to provide the service, maintain security, resolve disputes, comply with legal obligations, and enforce our agreements.
            </p>
            <p>
              When personal information is no longer required for these purposes, we take appropriate steps to delete or otherwise dispose of it in accordance with applicable law and our operational processes.
            </p>
            <p>
              Certain information may need to be retained for longer where required by law or necessary for legitimate legal, security, accounting, or dispute-resolution purposes.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              7. Your Privacy Rights &amp; Choices
            </h2>
            <p>
              Depending on applicable law, you may have rights concerning the personal information processed by RFPGround, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[14px] text-[#4B5563]">
              <li>
                <strong className="text-[#111827]">Access</strong> &mdash; request information about personal data processed about you.
              </li>
              <li>
                <strong className="text-[#111827]">Correction</strong> &mdash; request correction of inaccurate or incomplete personal data.
              </li>
              <li>
                <strong className="text-[#111827]">Erasure</strong> &mdash; request deletion of personal data where applicable.
              </li>
              <li>
                <strong className="text-[#111827]">Consent withdrawal</strong> &mdash; where processing is based on consent, withdraw consent through available mechanisms.
              </li>
              <li>
                <strong className="text-[#111827]">Grievance redressal</strong> &mdash; raise a privacy-related concern with RFPGround.
              </li>
              <li>
                <strong className="text-[#111827]">Nomination</strong> &mdash; where applicable, exercise the right to nominate another individual in accordance with applicable law.
              </li>
            </ul>
            <p className="text-[13.5px] text-[#6B7280]">
              Some requests may be subject to applicable legal, security, contractual, or other lawful limitations.
            </p>

            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 space-y-1.5 text-[13.5px]">
              <strong className="text-[#111827]">Consent Withdrawal:</strong>
              <p className="text-[#4B5563]">
                Where RFPGround processes personal information based on consent, you may withdraw that consent using the available mechanism or by contacting us. Withdrawal of consent does not affect the lawfulness of processing carried out before withdrawal.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              8. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes to our services, data-processing practices, applicable law, or regulatory requirements.
            </p>
            <p>
              When we make changes, we will update the Last Revised date on this page. Where appropriate, we may provide additional notice for material changes.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 border-t border-[#E5E7EB] pt-8">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              9. Privacy Inquiries &amp; Grievance Redressal
            </h2>
            <p>
              If you have a question, concern, request, or grievance regarding the processing of your personal information, contact us at:
            </p>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 text-[13.5px] space-y-1.5 text-[#4B5563]">
              <p className="font-semibold text-[#111827]">
                RFPGround Privacy Support
              </p>
              <a
                href="mailto:support@rfpground.com"
                className="text-[#3157D5] hover:text-[#2544a8] underline inline-flex items-center gap-1 font-medium"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>support@rfpground.com</span>
              </a>
              <p className="text-[12.5px] text-[#6B7280] pt-1">
                Please include enough information for us to identify your account and understand your request.
              </p>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
