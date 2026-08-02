import { Navigate } from "react-router-dom";
import LoginScreen from "@/components/ui/modern-login-signup";
import { useAuth } from "@/auth";
import { CTASection, ORANGE_SOFT } from "@/components/ui/hero-dithering-card";
import "./Landing.css";

/**
 * Login screen — copper dithering card + Bold auth panel.
 */
export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }

  if (user) {
    const next = user.needsUsername || !user.username ? "/username" : "/app";
    return <Navigate to={next} replace />;
  }

  return (
    <div className="bold-landing">
      <CTASection
        className="bold-landing__hero"
        minHeightClassName="min-h-[min(900px,100dvh)] md:min-h-[min(820px,94dvh)]"
      >
        <div className="bold-landing__grid">
          <div className="bold-landing__copy">
            <div
              className="bold-landing__badge"
              style={{
                borderColor: "rgba(196, 106, 58, 0.28)",
                background: "rgba(0, 0, 0, 0.35)",
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
              <span className="text-white/85">clarity, not noise.</span>
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
