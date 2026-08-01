import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import "./Login.css";

type Channel = "phone" | "email";
type Step = "identify" | "otp";

const RESEND_SECONDS = 30;

export function LoginPage() {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel>("phone");
  const [step, setStep] = useState<Step>("identify");
  const [destination, setDestination] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedTo, setMaskedTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devGoogleEmail, setDevGoogleEmail] = useState("trader@gmail.com");
  const [googleHint, setGoogleHint] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    void api.authConfig().then((c) => setGoogleHint(c.devGoogleHint));
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  if (user) return <Navigate to="/app" replace />;

  async function sendOtp(dest: string, ch: Channel) {
    const res = await api.startOtp(ch, dest);
    setChallengeId(res.challengeId);
    setMaskedTo(res.destination);
    setStep("otp");
    setCode("");
    setResendIn(RESEND_SECONDS);
  }

  async function startOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendOtp(destination.trim(), channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (resendIn > 0 || busy) return;
    setError(null);
    setBusy(true);
    try {
      await sendOtp(destination.trim(), channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.verifyOtp(challengeId, code.trim());
      setSession(res.token, res.user);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogleDev() {
    setError(null);
    setBusy(true);
    try {
      const email = devGoogleEmail.trim().toLowerCase();
      if (!email.includes("@")) throw new Error("Enter a Gmail address for Google sign-in");
      const res = await api.google(`dev:${email}`);
      setSession(res.token, res.user);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="brand login__brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Bold</span>
        </div>

        <h1 className="login__title">Sign in</h1>
        <p className="login__sub">
          {step === "identify"
            ? "Enter your phone or email, or continue with Gmail."
            : `Paste the code we sent to ${maskedTo}.`}
        </p>

        {step === "identify" && (
          <>
            <div className="login__tabs" role="tablist" aria-label="Sign-in method">
              <button
                type="button"
                role="tab"
                aria-selected={channel === "phone"}
                className={channel === "phone" ? "is-active" : undefined}
                onClick={() => {
                  setChannel("phone");
                  setError(null);
                }}
              >
                Phone
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={channel === "email"}
                className={channel === "email" ? "is-active" : undefined}
                onClick={() => {
                  setChannel("email");
                  setError(null);
                }}
              >
                Email
              </button>
            </div>

            <form className="login__form" onSubmit={startOtp}>
              <label className="field">
                <span>{channel === "phone" ? "Phone number" : "Email address"}</span>
                <input
                  type={channel === "phone" ? "tel" : "email"}
                  autoComplete={channel === "phone" ? "tel" : "email"}
                  placeholder={channel === "phone" ? "+91 98765 43210" : "you@gmail.com"}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              </label>
              <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send OTP"}
              </button>
            </form>

            <div className="login__divider">
              <span>or</span>
            </div>

            <div className="login__google">
              <label className="field">
                <span>Gmail</span>
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  value={devGoogleEmail}
                  onChange={(e) => setDevGoogleEmail(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn--google btn--block"
                onClick={() => void continueWithGoogleDev()}
                disabled={busy}
              >
                <GoogleIcon />
                Continue with Google
              </button>
              {googleHint && <p className="login__hint">{googleHint}</p>}
            </div>
          </>
        )}

        {step === "otp" && (
          <form className="login__form" onSubmit={verifyOtp}>
            <label className="field">
              <span>One-time code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Paste code from SMS or email"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                autoFocus
                required
              />
            </label>
            <button className="btn btn--primary btn--block" type="submit" disabled={busy || code.length < 4}>
              {busy ? "Verifying…" : "Verify & continue"}
            </button>
            <div className="login__otp-actions">
              <button
                type="button"
                className="btn btn--text"
                disabled={busy || resendIn > 0}
                onClick={() => void resendOtp()}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                className="btn btn--text"
                onClick={() => {
                  setStep("identify");
                  setCode("");
                  setChallengeId("");
                  setError(null);
                  setResendIn(0);
                }}
              >
                Change phone or email
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}
      </div>

      <aside className="login__aside" aria-hidden="true">
        <p className="login__aside-brand">Bold</p>
        <p className="login__aside-copy">Secure sign-in with a one-time code. No passwords to remember.</p>
      </aside>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 14 24 14c3.1 0 5.8 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.5l.1.1 6.3 5.3C39.2 37 44 32 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}
