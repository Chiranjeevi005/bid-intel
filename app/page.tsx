import { redirect } from "next/navigation";
import LandingNavbar from "@/components/landing/LandingNavbar";
import DecisionBrief from "@/components/landing/DecisionBrief";
import LandingFooter from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RFPGround — RFP & Tender Decision Intelligence",
  description: "Pre-bid intelligence for teams making serious bid decisions. Uncover uncapped liability, missing SLAs, and qualification blockers before committing proposal resources.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home(props: {
  searchParams?: Promise<{ code?: string; next?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  if (searchParams?.code) {
    const rawNext = searchParams.next;
    let next = '/dashboard';
    if (
      rawNext &&
      rawNext !== '/' &&
      rawNext !== '/login' &&
      !rawNext.startsWith('/login?') &&
      !rawNext.startsWith('/auth') &&
      rawNext.startsWith('/') &&
      !rawNext.startsWith('//') &&
      !rawNext.startsWith('/\\') &&
      !rawNext.includes('\\') &&
      !rawNext.includes(':')
    ) {
      next = rawNext;
    }
    redirect(`/auth/callback?code=${encodeURIComponent(searchParams.code)}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F4]">
      <LandingNavbar initialUser={user} />
      <main className="flex-1">
        <DecisionBrief user={user} />
      </main>
      <LandingFooter />
    </div>
  );
}
