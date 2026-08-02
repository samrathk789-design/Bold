import { useNavigate } from "react-router-dom";
import { CTASection } from "@/components/ui/hero-dithering-card";
import "./Landing.css";

/**
 * Public landing — marketing + Log In only. No Bold Brain chat.
 */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bold-landing">
      <CTASection
        className="bold-landing__hero"
        minHeightClassName="min-h-[min(900px,100dvh)] md:min-h-[min(820px,94dvh)]"
        badge="AI-Powered Trading"
        title={
          <>
            Trade with
            <br />
            <span className="text-white/85">clarity, not noise.</span>
          </>
        }
        description="Bold helps beginners read the market, journal cleaner, and learn risk — with a coach that stays calm when charts get loud."
        ctaLabel="Log In"
        onCtaClick={() => navigate("/login")}
      />
    </div>
  );
}
