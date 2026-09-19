import LandingNavbar from "@/components/landing/LandingNavbar";
import DecisionBrief from "@/components/landing/DecisionBrief";
import LandingFooter from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F4]">
      <LandingNavbar initialUser={user} />
      <main className="flex-1">
        <DecisionBrief user={user} />
      </main>
      <LandingFooter user={user} />
    </div>
  );
}
