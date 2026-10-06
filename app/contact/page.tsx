import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import ContactInteractiveSection from "@/components/contact/ContactInteractiveSection";
import { createClient } from "@/lib/supabase/server";
import { Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact RFPGround | Customer Support",
  description: "Contact RFPGround for product, account, billing, and procurement support.",
  alternates: {
    canonical: "/contact",
  },
};

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F4] text-[#111827]">
      <LandingNavbar initialUser={user} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 lg:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-blue-50 text-[#3157D5] border border-blue-200 mb-4">
            <span>CUSTOMER SUPPORT</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#111827]">
            How Can We Help You?
          </h1>
          <p className="mt-3 text-[15px] text-[#4B5563] leading-relaxed">
            Contact the RFPGround team for product, account, billing, or procurement-related assistance.
          </p>
        </div>

        {/* Top Support Card */}
        <div className="bg-white border border-[#D9DEE5] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#3157D5] flex items-center justify-center border border-blue-100 shrink-0">
              <Mail className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#111827]">
                Support Email
              </h3>
              <p className="text-[13.5px] text-[#6B7280]">
                Direct channel for product inquiries, technical support, and account assistance.
              </p>
            </div>
          </div>
          <a
            href="mailto:support@rfpground.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3157D5] hover:bg-[#2845a9] text-white text-[13px] font-semibold rounded-sm transition-all duration-150 active:scale-[0.98] shadow-xs shrink-0"
          >
            <Mail className="w-4 h-4" />
            <span>support@rfpground.com</span>
          </a>
        </div>

        {/* Interactive Categories and Real Form */}
        <ContactInteractiveSection />
      </main>

      <LandingFooter />
    </div>
  );
}
