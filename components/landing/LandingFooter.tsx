import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="w-full bg-[#ECEEEB] border-t border-[#D9DEE5] pt-16 pb-12 px-6 lg:px-12 text-[#111827]">
      <div className="max-w-6xl mx-auto">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12 border-b border-[#D4D8DF]">
          {/* Brand Column (Col 1-5) */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col items-start gap-4">
            <Link href="/" className="inline-flex items-center">
              <Image 
                src="/brand-assets/navbar-logo.png" 
                alt="RFPground" 
                width={220} 
                height={52} 
                className="h-10 md:h-11 w-auto object-contain"
              />
            </Link>
            <p className="text-[14px] text-[#4B5563] leading-relaxed max-w-sm">
              Pre-bid intelligence for teams making serious bid decisions. Uncover uncapped liability, missing SLAs, and qualification blockers before committing proposal resources.
            </p>
            <div className="inline-flex items-center gap-2 pt-2 text-[12px] font-medium text-[#4B5563]">
              <ShieldCheck className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2} />
              <span>Verifiable evidence with citation-backed ground truth</span>
            </div>
          </div>

          {/* Navigation Columns (Col 6-12) */}
          <div className="md:col-span-6 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 1: Exploration */}
            <div className="flex flex-col gap-3.5">
              <span className="text-[11px] font-semibold text-[#111827] uppercase tracking-wider">
                Platform
              </span>
              <Link 
                href="#how-it-works" 
                className="text-[14px] text-[#4B5563] hover:text-[#111827] transition-colors"
              >
                How it works
              </Link>
              <Link 
                href="/subscription" 
                className="text-[14px] text-[#4B5563] hover:text-[#111827] transition-colors"
              >
                Pricing
              </Link>
            </div>

            {/* Column 2: Legal & Governance */}
            <div className="flex flex-col gap-3.5">
              <span className="text-[11px] font-semibold text-[#111827] uppercase tracking-wider">
                Legal
              </span>
              <Link 
                href="/terms" 
                className="text-[14px] text-[#4B5563] hover:text-[#111827] transition-colors"
              >
                Terms of Service
              </Link>
            </div>

            {/* Column 3: Inquiries & Support */}
            <div className="flex flex-col gap-3.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-[#111827] uppercase tracking-wider">
                Inquiries
              </span>
              <p className="text-[13px] text-[#6B7280]">
                Technical and procurement assistance:
              </p>
              <a 
                href="mailto:support@rfpground.com" 
                className="text-[14px] font-medium text-[#3157D5] hover:text-[#2544a8] transition-colors"
              >
                support@rfpground.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-[#6B7280]">
          <div>
            &copy; {new Date().getFullYear()} RFPground. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Enterprise-Grade Document Security</span>
            <span className="hidden sm:inline text-[#D1D5DB]">/</span>
            <span>Deterministic Extraction</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
