import { Navigate } from "react-router-dom";
import LoginScreen from "@/components/ui/modern-login-signup";
import { useAuth } from "@/auth";
import { CTASection } from "@/components/ui/hero-dithering-card";
import "./Landing.css";

/**
 * Dedicated login screen. Sign up link lives inside the existing login panel.
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
        <div className="bold-landing__grid bold-landing__grid--login-only">
          <div className="bold-landing__copy">
            <h1 className="bold-landing__title font-serif">
              Welcome
              <br />
              <span className="text-white/85">back to Bold.</span>
            </h1>
            <p className="bold-landing__desc">
              Continue with a provider or email OTP. New here? Use Sign up in the panel.
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
