import LoginScreen from "@/components/ui/modern-login-signup";
import { CTASection, ORANGE_SOFT } from "@/components/ui/hero-dithering-card";
import "./Landing.css";

/**
 * Main app entry: dithering hero card + original Bold login, together.
 */
export default function LandingPage() {
  return (
    <div className="bold-landing">
      <CTASection
        className="bold-landing__hero"
        minHeightClassName="min-h-[min(920px,100dvh)] md:min-h-[min(860px,100dvh)]"
      >
        <div className="bold-landing__grid">
          <div className="bold-landing__copy">
            <div
              className="bold-landing__badge"
              style={{
                borderColor: "rgba(196, 106, 58, 0.22)",
                background: "rgba(196, 106, 58, 0.08)",
                color: ORANGE_SOFT,
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: ORANGE_SOFT }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: ORANGE_SOFT }}
                />
              </span>
              AI-Powered Trading
            </div>
            <h1 className="bold-landing__title font-serif">
              Trade with
              <br />
              <span className="text-white/80">clarity, not noise.</span>
            </h1>
            <p className="bold-landing__desc">
              Bold helps beginners read the market, journal cleaner, and learn risk — with a coach
              that stays calm when charts get loud.
            </p>
          </div>

          <div className="bold-landing__login" id="login">
            <LoginScreen embedded />
          </div>
        </div>
      </CTASection>
    </div>
  );
}
