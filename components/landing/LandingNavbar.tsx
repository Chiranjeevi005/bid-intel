import Link from "next/link";
import Image from "next/image";

export default function LandingNavbar() {
  return (
    <header className="w-full h-18 border-b border-[#D9DEE5] bg-background px-6 lg:px-12 sticky top-0 z-50 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <Image 
              src="/brand-assets/navbar-logo.png" 
              alt="RFPground" 
              width={200} 
              height={48} 
              className="h-10 md:h-11 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center: Restrained Nav */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#667085]">
          <Link href="#product" className="hover:text-foreground transition-colors duration-150">
            Product
          </Link>
          <Link href="#how-it-works" className="hover:text-foreground transition-colors duration-150">
            How it works
          </Link>
        </nav>

        {/* Right: Auth & CTA */}
        <div className="flex items-center gap-6">
          <Link 
            href="/login" 
            className="hidden sm:block text-[13px] font-medium text-[#667085] hover:text-foreground transition-colors duration-150"
          >
            Sign in
          </Link>
          <Link 
            href="/login" 
            className="flex items-center justify-center rounded-sm bg-[#3157D5] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2845a9] transition-all duration-150 active:scale-[0.98] active:translate-y-px"
          >
            Analyse a tender &rarr;
          </Link>
        </div>
      </div>
    </header>
  );
}
