import { useEffect, useState } from "react";
import "./AuthConnectingPopup.css";

export type OAuthProvider = "google" | "apple" | "github";
export type AuthPopupPhase = "connecting" | "success" | "error";

const LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

type Props = {
  open: boolean;
  provider: OAuthProvider;
  phase: AuthPopupPhase;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function AuthConnectingPopup({
  open,
  provider,
  phase,
  error,
  onRetry,
  onDismiss,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const id = window.setTimeout(() => setEntered(true), 20);
      return () => window.clearTimeout(id);
    }
    setEntered(false);
    const id = window.setTimeout(() => setVisible(false), 280);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className={`auth-popup ${entered ? "is-in" : "is-out"}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${LABELS[provider]} sign-in`}
      onClick={(e) => {
        if (e.target === e.currentTarget && phase === "error") onDismiss?.();
      }}
    >
      <div className={`auth-popup__card auth-popup__card--${phase}`}>
        <div className={`auth-popup__orb auth-popup__orb--${provider}`}>
          <ProviderGlyph provider={provider} />
          {phase === "connecting" && <span className="auth-popup__ring" aria-hidden="true" />}
          {phase === "success" && <span className="auth-popup__burst" aria-hidden="true" />}
        </div>

        {phase === "connecting" && (
          <p className="auth-popup__msg">Connecting to {LABELS[provider]}…</p>
        )}
        {phase === "success" && (
          <>
            <div className="auth-popup__check" aria-hidden="true">
              ✓
            </div>
            <p className="auth-popup__msg">You&apos;re in</p>
          </>
        )}
        {phase === "error" && (
          <>
            <p className="auth-popup__msg auth-popup__msg--error">
              {error || "That didn't go through — want to try again?"}
            </p>
            <div className="auth-popup__actions">
              <button type="button" className="auth-popup__btn auth-popup__btn--primary" onClick={onRetry}>
                Try again
              </button>
              <button type="button" className="auth-popup__btn" onClick={onDismiss}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProviderGlyph({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }
  if (provider === "github") {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.88.75 3.65 1.89-3.08 1.75-2.58 5.61.35 6.75-1.01 2.37-2.39 4.39-4.29 4.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.72-4.25.36 2.38-1.92 4.34-3.72 4.25z" />
    </svg>
  );
}
