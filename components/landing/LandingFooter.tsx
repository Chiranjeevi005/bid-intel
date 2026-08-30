import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="w-full bg-[#F5F6F4] border-t border-[#D9DEE5] pt-16 pb-8 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-16">
        
        {/* Left: Brand & Positioning */}
        <div className="md:col-span-4 lg:col-span-5 flex flex-col items-start">
          <div className="text-[15px] text-[#111827] tracking-tight mb-4 flex items-center gap-2">
            <span className="font-semibold">RFP</span>
            <span className="font-regular">ground</span>
          </div>
          <p className="text-[14px] text-[#667085] leading-relaxed max-w-xs font-medium">
            Pre-bid intelligence for teams making serious bid decisions.
          </p>
        </div>

        {/* Right: Navigation Matrix */}
        <div className="md:col-span-8 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          
          <div className="flex flex-col gap-4">
            <div className="text-[11px] font-semibold text-[#111827] uppercase tracking-widest mb-1">
              Product
            </div>
            <Link href="/login" className="text-[13px] text-[#667085] hover:text-[#111827] transition-colors font-medium">Analyse a tender</Link>
            <Link href="#how-it-works" className="text-[13px] text-[#667085] hover:text-[#111827] transition-colors font-medium">How it works</Link>
          </div>

          <div className="flex flex-col gap-4">
            <div className="text-[11px] font-semibold text-[#111827] uppercase tracking-widest mb-1">
              Company
            </div>
            <Link href="#" className="text-[13px] text-[#667085] hover:text-[#111827] transition-colors font-medium">About</Link>
            <Link href="#" className="text-[13px] text-[#667085] hover:text-[#111827] transition-colors font-medium">Contact</Link>
          </div>

          <div className="flex flex-col gap-4">
            <div className="text-[11px] font-semibold text-[#111827] uppercase tracking-widest mb-1">
              Legal
            </div>
            <Link href="#" className="text-[13px] text-[#667085] hover:text-[#111827] transition-colors font-medium">Privacy</Link>
            <Link href="#" className="text-[13px] text-[#667085] hover:text-[#111827] transition-colors font-medium">Terms</Link>
          </div>

        </div>
      </div>

      {/* Bottom: Copyright */}
      <div className="max-w-6xl mx-auto border-t border-[#D9DEE5] pt-8 flex items-center justify-between">
        <div className="text-[12px] text-[#98A2B3] font-medium">
          &copy; 2026 RFPground
        </div>
      </div>
    </footer>
  );
}
