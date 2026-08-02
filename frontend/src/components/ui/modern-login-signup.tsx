"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AuthConfig, type AuthSession, type OAuthProvider, type User } from "@/api";
import { useAuth } from "@/auth";
import {
  AuthConnectingPopup,
  type AuthPopupPhase,
} from "@/components/ui/AuthConnectingPopup";
import { initFirebase, isPopupCancelled, signInWithProvider } from "@/lib/firebase";
import "./modern-login-signup.css";

type Step = "identify" | "otp";

function routeAfterAuth(user: User) {
  return user.needsUsername || !user.username ? "/username" : "/app";
}

type LoginProps = {
  /** Panel-only mode for embedding over a parent background (e.g. dithering waves) */
  embedded?: boolean;
};

export default function Component({ embedded = false }: LoginProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<Step>("identify");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedTo, setMaskedTo] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider>("google");
  const [oauthPhase, setOauthPhase] = useState<AuthPopupPhase>("connecting");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const oauthInFlight = useRef(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void api
      .authConfig()
      .then((cfg) => {
        setConfig(cfg);
        if (cfg.firebaseReady && cfg.firebase) {
          try {
            initFirebase(cfg.firebase);
          } catch {
            /* ignore init errors until button tap */
          }
        }
      })
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (embedded) return;
    let active = true;
    let renderer: any;
    let geometry: any;
    let material: any;
    let animationId = 0;
    let removeResize: (() => void) | undefined;

    const initThree = (THREE: any) => {
      if (!canvasRef.current || !active) return;
      const canvas = canvasRef.current;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(window.innerWidth * 2, window.innerHeight * 2),
        },
        u_opacities: { value: [0.25, 0.3, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.9, 1.0] },
        u_colors: {
          value: [
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(0.95, 1, 0.9),
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(0.92, 0.98, 0.86),
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(1, 1, 1),
          ],
        },
        u_total_size: { value: 20.0 },
        u_dot_size: { value: 5.5 },
        u_reverse: { value: 0 },
      };

      material = new THREE.ShaderMaterial({
        vertexShader: `
          precision mediump float;
          uniform vec2 u_resolution;
          out vec2 fragCoord;
          void main() {
            gl_Position = vec4(position, 1.0);
            fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
            fragCoord.y = u_resolution.y - fragCoord.y;
          }
        `,
        fragmentShader: `
          precision mediump float;
          in vec2 fragCoord;
          uniform float u_time;
          uniform float u_opacities[10];
          uniform vec3 u_colors[6];
          uniform float u_total_size;
          uniform float u_dot_size;
          uniform vec2 u_resolution;
          uniform int u_reverse;
          out vec4 fragColor;
          float PHI = 1.61803398874989484820459;
          float random(vec2 xy) {
              return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
          }
          void main() {
              // Slow ambient drift so the field feels alive
              float driftX = sin(u_time * 0.12) * 18.0 + cos(u_time * 0.07) * 8.0;
              float driftY = cos(u_time * 0.1) * 14.0 + sin(u_time * 0.085) * 7.0;

              vec2 st = fragCoord.xy + vec2(driftX, driftY);
              st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
              st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));
              float opacity = step(0.0, st.x) * step(0.0, st.y);
              vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
              float frequency = 5.0;
              float show_offset = random(st2);
              float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
              opacity *= u_opacities[int(rand * 10.0)];

              // Soft per-cell vertical bob
              float bob = sin(u_time * 0.55 + show_offset * 6.2831) * 1.15;
              float cellY = fract((st.y + bob) / u_total_size);
              float cellX = fract(st.x / u_total_size);
              opacity *= 1.0 - step(u_dot_size / u_total_size, cellX);
              opacity *= 1.0 - step(u_dot_size / u_total_size, cellY);

              vec3 color = u_colors[int(show_offset * 6.0)];
              float animation_speed_factor = 2.6;
              vec2 center_grid = u_resolution / 2.0 / u_total_size;
              float dist_from_center = distance(center_grid, st2);
              float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
              opacity *= step(timing_offset_intro, u_time * animation_speed_factor);
              opacity *= clamp((1.0 - step(timing_offset_intro + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);

              // Breathing brightness after intro
              float breath = 0.88 + 0.12 * sin(u_time * 0.35 + show_offset * 4.0);
              opacity *= breath;

              fragColor = vec4(color, opacity);
              fragColor.rgb *= fragColor.a;
          }
        `,
        uniforms,
        glslVersion: THREE.GLSL3,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        transparent: true,
      });

      geometry = new THREE.PlaneGeometry(2, 2);
      scene.add(new THREE.Mesh(geometry, material));

      const startTime = performance.now();
      const animate = () => {
        if (!active) return;
        animationId = requestAnimationFrame(animate);
        uniforms.u_time.value = (performance.now() - startTime) / 1000.0;
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_resolution.value.set(window.innerWidth * 2, window.innerHeight * 2);
      };
      window.addEventListener("resize", handleResize);
      removeResize = () => window.removeEventListener("resize", handleResize);
    };

    void import("three").then((THREE) => {
      if (!active) return;
      initThree(THREE);
    });

    return () => {
      active = false;
      removeResize?.();
      if (animationId) cancelAnimationFrame(animationId);
      renderer?.dispose();
      geometry?.dispose();
      material?.dispose();
    };
  }, [embedded]);

  async function continueWithEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const dest = email.trim().toLowerCase();
      if (!dest.includes("@")) throw new Error("Enter a valid email (Gmail works great)");
      const res = await api.startOtp("email", dest);
      setChallengeId(res.challengeId);
      setMaskedTo(res.destination);
      setPreviewUrl(res.deliveryPreviewUrl ?? null);
      setStep("otp");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
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
      finishAuth(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  function finishAuth(res: AuthSession) {
    setSession(res.token, res.user);
    navigate(routeAfterAuth(res.user));
  }

  function dismissOauthPopup() {
    setOauthOpen(false);
    setOauthPhase("connecting");
    setOauthError(null);
    oauthInFlight.current = false;
    setBusy(false);
  }

  function resolveDevEmail(provider: OAuthProvider) {
    const typed = email.trim().toLowerCase();
    if (typed.includes("@")) return typed;
    return `dev.${provider}@bold.local`;
  }

  async function completeProviderSignIn(provider: OAuthProvider) {
    if (oauthInFlight.current) return;
    oauthInFlight.current = true;
    setError(null);
    setOauthProvider(provider);
    setOauthPhase("connecting");
    setOauthError(null);
    setOauthOpen(true);
    setBusy(true);

    try {
      let res: AuthSession;

      if (config?.firebaseReady && config.firebase) {
        initFirebase(config.firebase);
        const credential = await signInWithProvider(provider);
        const idToken = await credential.user.getIdToken();
        res = await api.firebase(idToken, provider);
      } else if (config?.allowDevOAuth) {
        await new Promise((r) => setTimeout(r, 1400));
        res = await api.oauthDev(
          provider,
          resolveDevEmail(provider),
          fullName.trim() || undefined
        );
      } else {
        throw new Error(
          "Provider sign-in is not configured. Add Firebase credentials in backend/.env."
        );
      }

      setOauthPhase("success");
      await new Promise((r) => setTimeout(r, 1100));
      setOauthOpen(false);
      await new Promise((r) => setTimeout(r, 280));
      finishAuth(res);
    } catch (err) {
      if (isPopupCancelled(err)) {
        dismissOauthPopup();
        return;
      }
      setOauthPhase("error");
      setOauthError(
        err instanceof Error ? err.message : "That didn't go through — want to try again?"
      );
      setBusy(false);
      oauthInFlight.current = false;
    }
  }

  const providersReady = Boolean(config?.providers?.google || config?.allowDevOAuth);

  const GoogleIcon = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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

  const AppleIcon = (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.88.75 3.65 1.89-3.08 1.75-2.58 5.61.35 6.75-1.01 2.37-2.39 4.39-4.29 4.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.72-4.25.36 2.38-1.92 4.34-3.72 4.25z" />
    </svg>
  );

  const GitHubIcon = (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );

  return (
    <div className={`bold-login${embedded ? " bold-login--embedded" : ""}`}>
      {!embedded && (
        <>
          <canvas ref={canvasRef} className="bold-login__canvas" />
          <div className="bold-login__veil" aria-hidden="true" />
        </>
      )}

      <div className="bold-login__panel">
        <div className="bold-login__brand">
          <div className="bold-login__mark" aria-hidden="true">
            B
          </div>
          <p className="bold-login__wordmark">BOLD</p>
        </div>

        <h1 className="bold-login__headline">
          {step === "otp" ? "Check your inbox" : isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="bold-login__sub">
          {step === "otp"
            ? `Paste the OTP sent to ${maskedTo}`
            : "Trade with clarity. Continue with a provider or email."}
        </p>

        {step === "identify" && (
          <>
            <div className="bold-login__social">
              <button
                type="button"
                className="bold-login__social-btn"
                onClick={() => void completeProviderSignIn("google")}
                disabled={busy || !(config?.providers.google ?? config?.allowDevOAuth)}
              >
                {GoogleIcon}
                Continue with Google
              </button>
              <button
                type="button"
                className="bold-login__social-btn"
                onClick={() => void completeProviderSignIn("apple")}
                disabled={busy || !(config?.providers.apple ?? config?.allowDevOAuth)}
              >
                {AppleIcon}
                Continue with Apple
              </button>
              <button
                type="button"
                className="bold-login__social-btn"
                onClick={() => void completeProviderSignIn("github")}
                disabled={busy || !(config?.providers.github ?? config?.allowDevOAuth)}
              >
                {GitHubIcon}
                Continue with GitHub
              </button>
            </div>

            <div className="bold-login__divider">or email</div>

            <form className="bold-login__form" onSubmit={continueWithEmail}>
              {!isLogin && (
                <input
                  className="bold-login__input"
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              )}
              <input
                className="bold-login__input"
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button type="submit" className="bold-login__primary" disabled={busy}>
                {busy ? "Sending…" : isLogin ? "Continue with email OTP" : "Sign up with email OTP"}
              </button>
            </form>

            {config?.devGoogleHint && <p className="bold-login__hint">{config.devGoogleHint}</p>}
            {!providersReady && config?.firebaseSetupHint && (
              <p className="bold-login__hint">{config.firebaseSetupHint}</p>
            )}

            <div className="bold-login__switch">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" className="bold-login__link" onClick={() => setIsLogin(false)}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" className="bold-login__link" onClick={() => setIsLogin(true)}>
                    Sign in
                  </button>
                </>
              )}
            </div>

            <div className="bold-login__footer">
              By proceeding, you agree to Bold&apos;s{" "}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </div>
          </>
        )}

        {step === "otp" && (
          <form className="bold-login__form" onSubmit={verifyOtp}>
            <input
              className="bold-login__input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Paste OTP from email"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              required
            />
            {previewUrl && (
              <a className="bold-login__preview" href={previewUrl} target="_blank" rel="noreferrer">
                Open email preview to copy OTP
              </a>
            )}
            <button type="submit" className="bold-login__primary" disabled={busy || code.length < 4}>
              {busy ? "Verifying…" : "Verify & enter"}
            </button>
            <button
              type="button"
              className="bold-login__social-btn"
              onClick={() => {
                setStep("identify");
                setCode("");
                setPreviewUrl(null);
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {error && (
          <p className="bold-login__error" role="alert">
            {error}
          </p>
        )}
      </div>

      <AuthConnectingPopup
        open={oauthOpen}
        provider={oauthProvider}
        phase={oauthPhase}
        error={oauthError}
        onRetry={() => void completeProviderSignIn(oauthProvider)}
        onDismiss={dismissOauthPopup}
      />
    </div>
  );
}
