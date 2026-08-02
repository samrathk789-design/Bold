import { useRef } from "react";
import LoginScreen from "@/components/ui/modern-login-signup";
import { CTASection, DitheringWaves } from "@/components/ui/hero-dithering-card";
import "./Landing.css";

export default function LandingPage() {
  const loginRef = useRef<HTMLDivElement>(null);

  function scrollToLogin() {
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="bold-landing">
      <section className="bold-landing__auth" ref={loginRef} id="login">
        <DitheringWaves />
        <div className="bold-landing__auth-inner">
          <LoginScreen embedded />
        </div>
      </section>

      <section className="bold-landing__cta" aria-label="Bold highlight">
        <CTASection
          badge="AI-Powered Trading"
          title={
            <>
              Trade with <br />
              <span className="text-white/80">clarity, not noise.</span>
            </>
          }
          description="Bold helps beginners read the market, journal cleaner, and learn risk — with a coach that stays calm when charts get loud."
          ctaLabel="Sign in to Bold"
          onCtaClick={scrollToLogin}
        />
      </section>
    </div>
  );
}
