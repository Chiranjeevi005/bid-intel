import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";
import { RefreshCw, AlertCircle, ShieldCheck, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | RFPGround",
  description: "Learn how RFPGround handles subscription cancellations, refunds, renewals, and billing issues.",
  alternates: {
    canonical: "/refund-cancellation",
  },
};

export default async function RefundCancellationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-[#111827]">
      <LandingNavbar initialUser={user} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 lg:px-8 py-12 md:py-16">
        {/* Document Header */}
        <header className="border-b border-[#E5E7EB] pb-8 mb-10">
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280] mb-3">
            <RefreshCw className="w-3.5 h-3.5 text-[#3157D5]" />
            <span>Commercial &amp; Billing Policy</span>
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#111827] mb-3">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Effective Date: September 22, 2026 &middot; Last Revised: October 6, 2026
          </p>
          <p className="mt-4 text-[15px] text-[#4B5563] leading-relaxed">
            This policy explains how subscription cancellations, refunds, and billing issues are handled for RFPGround.
          </p>
        </header>

        {/* Content Body */}
        <div className="space-y-12 text-[15px] leading-relaxed text-[#374151]">
          {/* Section 1: Subscription Cancellation */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              1. Subscription Cancellation
            </h2>
            <p>
              RFPGround subscriptions operate on recurring monthly billing cycles. Customers may cancel their subscription at any time before the next renewal.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827]">
                  How to Cancel
                </h3>
                <p className="text-[14px] text-[#4B5563] mt-1">
                  You can cancel your subscription through your account subscription settings or by contacting our billing support team at{" "}
                  <a href="mailto:support@rfpground.com" className="text-[#3157D5] underline hover:text-[#2544a8]">
                    support@rfpground.com
                  </a>.
                </p>
              </div>

              <div>
                <h3 className="text-[14px] font-semibold text-[#111827]">
                  Effect of Cancellation
                </h3>
                <p className="text-[14px] text-[#4B5563] mt-1">
                  Cancellation stops future subscription renewals. It does not cancel the current billing period or create a refund for the subscription fee already paid.
                </p>
              </div>

              <div>
                <h3 className="text-[14px] font-semibold text-[#111827]">
                  Continued Access
                </h3>
                <p className="text-[14px] text-[#4B5563] mt-1">
                  After cancellation, your paid-plan access remains available through the end of the current paid billing period, subject to the applicable plan terms. The subscription will not renew after that period.
                </p>
              </div>
            </div>

            {/* Central Commercial Rule Callout */}
            <div className="bg-[#EFF4FF] border border-[#BFDBFE] rounded-lg p-4 my-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#3157D5] shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[14px] font-semibold text-[#1E40AF] leading-snug">
                Cancellation stops the next charge &mdash; it does not refund the current billing period.
              </p>
            </div>
          </section>

          {/* Section 2: Refund Policy */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              2. Refund Policy
            </h2>
            <p>
              RFPGround is a digital software platform that provides immediate access to tender and RFP analysis capabilities. Subscription fees are therefore generally non-refundable once a subscription period has started.
            </p>

            <div>
              <p className="font-medium text-[#111827] mb-2">
                RFPGround does not provide refunds for:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-[14px] text-[#4B5563]">
                <li>voluntary subscription cancellation;</li>
                <li>unused time remaining in a billing period;</li>
                <li>unused analysis capacity or quota;</li>
                <li>partial use of a subscription period.</li>
              </ul>
            </div>

            {/* Verified Billing Exceptions Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-[#111827] font-semibold text-[15px]">
                <ShieldCheck className="w-4 h-4 text-[#3157D5]" />
                <span>Verified Billing Exceptions</span>
              </div>
              <p className="text-[13.5px] text-[#4B5563] leading-relaxed">
                While subscription fees are generally non-refundable, RFPGround may investigate and correct verified billing issues, including:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[13.5px] text-[#4B5563]">
                <li>
                  <strong className="text-[#111827]">Duplicate charges</strong> &mdash; Multiple charges for the same billing cycle.
                </li>
                <li>
                  <strong className="text-[#111827]">Technical billing errors</strong> &mdash; A verified payment or billing error that resulted in an incorrect charge.
                </li>
                <li>
                  <strong className="text-[#111827]">Unauthorized transactions</strong> &mdash; A legitimate report of an unauthorized payment associated with an RFPGround account.
                </li>
                <li>
                  <strong className="text-[#111827]">Applicable legal remedies</strong> &mdash; Any refund, reversal, or other remedy required under applicable law.
                </li>
              </ul>
              <p className="text-[13px] text-[#6B7280] pt-1 border-t border-[#F3F4F6]">
                These exceptions do not create a general right to a refund for unused subscription time or voluntary cancellation.
              </p>
            </div>
          </section>

          {/* Section 3: Requesting a Billing Investigation */}
          <section className="space-y-4">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              3. Requesting a Billing Investigation
            </h2>
            <p>
              If you believe you were charged incorrectly or experienced one of the billing issues described above, contact our billing support team within seven (7) days of the charge where reasonably possible.
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827]">
                  What to provide
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-[14px] text-[#4B5563] mt-1.5">
                  <li>registered account email;</li>
                  <li>transaction date;</li>
                  <li>amount charged;</li>
                  <li>payment reference, if available;</li>
                  <li>brief description of the issue.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[14px] font-semibold text-[#111827]">
                  Investigation
                </h3>
                <p className="text-[14px] text-[#4B5563] mt-1">
                  RFPGround will review the reported transaction and, where a billing error is verified, take the appropriate corrective action.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Payment Failure */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              4. Payment Failure
            </h2>
            <p>
              If an automatic monthly renewal payment fails, RFPGround may attempt to process the payment again according to the applicable payment-provider process.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-[14px] text-[#4B5563]">
              <li>You may receive a notification about the failed renewal.</li>
              <li>Paid-plan access may be restricted or suspended if the renewal remains unpaid.</li>
              <li>
                Your account and eligible documents remain associated with your account subject to RFPGround&rsquo;s applicable{" "}
                <Link href="/terms" className="text-[#3157D5] underline hover:text-[#2544a8]">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#3157D5] underline hover:text-[#2544a8]">
                  Privacy Policy
                </Link>.
              </li>
              <li>A successful subsequent payment will be handled according to the applicable billing cycle.</li>
            </ul>
          </section>

          {/* Section 5: Billing Disputes */}
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              5. Billing Disputes
            </h2>
            <p>
              We are committed to resolving legitimate billing questions promptly and fairly.
            </p>
            <p>
              If you believe a charge is incorrect, contact us at{" "}
              <a href="mailto:support@rfpground.com" className="text-[#3157D5] underline hover:text-[#2544a8]">
                support@rfpground.com
              </a>{" "}
              before initiating an external payment dispute where reasonably possible. This allows us to review the transaction and resolve verified billing issues directly.
            </p>
          </section>

          {/* Section 6: Billing Support */}
          <section className="space-y-3 border-t border-[#E5E7EB] pt-8">
            <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight">
              6. Billing Support
            </h2>
            <p>
              For subscription cancellation, billing questions, or payment investigations, contact:
            </p>
            <div className="pt-2">
              <p className="font-semibold text-[#111827]">
                RFPGround Billing &amp; Subscriptions
              </p>
              <a
                href="mailto:support@rfpground.com"
                className="text-[#3157D5] hover:text-[#2544a8] font-medium text-[15px] underline inline-flex items-center gap-1.5 mt-1"
              >
                <Mail className="w-4 h-4" />
                <span>support@rfpground.com</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
