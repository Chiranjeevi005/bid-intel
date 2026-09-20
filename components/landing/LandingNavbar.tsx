'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight } from 'lucide-react';

interface LandingNavbarProps {
  initialUser?: any | null;
}

export default function LandingNavbar({ initialUser = null }: LandingNavbarProps) {
  const [user, setUser] = useState<any | null>(initialUser);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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
          <Link href="/subscription" className="hover:text-foreground transition-colors duration-150">
            Pricing
          </Link>
        </nav>

        {/* Right: Auth & CTA */}
        <div className="flex items-center gap-6">
          {!user && (
            <Link 
              href="/login" 
              className="hidden sm:block text-[13px] font-medium text-[#667085] hover:text-foreground transition-colors duration-150"
            >
              Sign in
            </Link>
          )}
          <Link 
            href={user ? "/dashboard" : "/login"} 
            className="flex items-center justify-center rounded-sm bg-[#3157D5] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2845a9] transition-all duration-150 active:scale-[0.98] active:translate-y-px"
          >
            <span>Analyse a tender</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </header>
  );
}
