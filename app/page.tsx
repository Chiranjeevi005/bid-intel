import LandingNavbar from "@/components/landing/LandingNavbar";
import DecisionBrief from "@/components/landing/DecisionBrief";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F4]">
      <LandingNavbar />
      <main className="flex-1">
        <DecisionBrief />
      </main>
      <LandingFooter />
    </div>
  );
}
