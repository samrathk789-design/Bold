"use client";

import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AuthConfig, type AuthSession, type OAuthProvider, type User } from "@/api";
import { useAuth } from "@/auth";
import {
  AuthConnectingPopup,
  type AuthPopupPhase,
} from "@/components/ui/AuthConnectingPopup";
import { initFirebase, isPopupCancelled, signInWithProvider } from "@/lib/firebase";

type Step = "identify" | "otp";

function routeAfterAuth(user: User) {
  return user.needsUsername || !user.username ? "/username" : "/app";
}

export default function Component() {
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
    let active = true;
    let renderer: any;
    let geometry: any;
    let material: any;
    let animationId = 0;

    const initThree = (THREE: any) => {
      if (!canvasRef.current || !active) return;
      const canvas = canvasRef.current;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(window.innerWidth * 2, window.innerHeight * 2),
        },
        u_opacities: { value: [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0] },
        u_colors: {
          value: [
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(1, 1, 1),
          ],
        },
        u_total_size: { value: 20.0 },
        u_dot_size: { value: 6.0 },
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
              vec2 st = fragCoord.xy;
              st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
              st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));
              float opacity = step(0.0, st.x) * step(0.0, st.y);
              vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
              float frequency = 5.0;
              float show_offset = random(st2);
              float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
              opacity *= u_opacities[int(rand * 10.0)];
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
              vec3 color = u_colors[int(show_offset * 6.0)];
              float animation_speed_factor = 3.0;
              vec2 center_grid = u_resolution / 2.0 / u_total_size;
              float dist_from_center = distance(center_grid, st2);
              float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
              float current_timing_offset = timing_offset_intro;
              opacity *= step(current_timing_offset, u_time * animation_speed_factor);
              opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
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
      return () => window.removeEventListener("resize", handleResize);
    };

    void import("three").then((THREE) => {
      if (!active) return;
      initThree(THREE);
    });

    return () => {
      active = false;
      if (animationId) cancelAnimationFrame(animationId);
      renderer?.dispose();
      geometry?.dispose();
      material?.dispose();
    };
  }, []);

  const socialBtn: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem",
    borderRadius: 6,
    border: "1px solid #333",
    background: "transparent",
    color: "#fff",
    fontWeight: 500,
    fontSize: "0.875rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    marginBottom: "0.4rem",
  };
  const input: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.85rem",
    borderRadius: 6,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    fontSize: "0.875rem",
    outline: "none",
  };
  const primaryBtn: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem",
    borderRadius: 6,
    border: "none",
    background: "#ededed",
    color: "#000",
    fontWeight: 500,
    fontSize: "0.875rem",
    cursor: "pointer",
  };

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
        // Simulate provider round-trip so the connecting popup is visible
        await new Promise((r) => setTimeout(r, 700));
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
      await new Promise((r) => setTimeout(r, 900));
      setOauthOpen(false);
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

  const GoogleIcon = (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, flexShrink: 0 }}>
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
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, flexShrink: 0 }} fill="#fff">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.88.75 3.65 1.89-3.08 1.75-2.58 5.61.35 6.75-1.01 2.37-2.39 4.39-4.29 4.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.72-4.25.36 2.38-1.92 4.34-3.72 4.25z" />
    </svg>
  );

  const GitHubIcon = (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, flexShrink: 0 }} fill="#fff">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );

  const Logo = (
    <div
      style={{
        background: "#111",
        width: 44,
        height: 44,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "1.15rem",
        marginBottom: "0.75rem",
        border: "1px solid #333",
      }}
    >
      B
    </div>
  );

  const Footer = (
    <div
      style={{
        marginTop: "0.85rem",
        fontSize: "0.75rem",
        color: "#666",
        lineHeight: 1.5,
        textAlign: "center",
      }}
    >
      By proceeding, you agree to Bold&apos;s{" "}
      <a href="#" style={{ color: "#888" }}>
        Terms of Service
      </a>{" "}
      and{" "}
      <a href="#" style={{ color: "#888" }}>
        Privacy Policy
      </a>
      .
    </div>
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000",
        color: "#fff",
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(circle at center,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          background: "#121212",
          borderRadius: 12,
          padding: "2rem",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "1px solid #222",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {Logo}
          <h1
            style={{
              fontSize: "1.35rem",
              fontWeight: 600,
              marginBottom: "0.25rem",
              letterSpacing: "-0.025em",
            }}
          >
            {step === "otp"
              ? "Check your Gmail"
              : isLogin
                ? "Sign in to Bold"
                : "Sign up for Bold"}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.85rem", lineHeight: 1.5 }}>
            {step === "otp"
              ? `Paste the OTP sent to ${maskedTo}`
              : "Continue with Google, Apple, GitHub, or email OTP."}
          </p>

          {step === "identify" && (
            <>
              <form
                onSubmit={continueWithEmail}
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.65rem" }}
              >
                {!isLogin && (
                  <input
                    style={input}
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                )}
                <input
                  style={input}
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <button type="submit" style={primaryBtn} disabled={busy}>
                  {busy ? "Sending…" : isLogin ? "Continue with Email OTP" : "Sign Up with Email OTP"}
                </button>
              </form>

              <div style={{ height: 1, background: "#222", width: "100%", margin: "0.85rem 0" }} />

              <button
                type="button"
                style={socialBtn}
                onClick={() => void completeProviderSignIn("google")}
                disabled={busy || !(config?.providers.google ?? config?.allowDevOAuth)}
              >
                {GoogleIcon}
                Continue with Google
              </button>
              <button
                type="button"
                style={socialBtn}
                onClick={() => void completeProviderSignIn("apple")}
                disabled={busy || !(config?.providers.apple ?? config?.allowDevOAuth)}
              >
                {AppleIcon}
                Continue with Apple
              </button>
              <button
                type="button"
                style={{ ...socialBtn, marginBottom: 0 }}
                onClick={() => void completeProviderSignIn("github")}
                disabled={busy || !(config?.providers.github ?? config?.allowDevOAuth)}
              >
                {GitHubIcon}
                Continue with GitHub
              </button>

              {config?.devGoogleHint && (
                <p style={{ marginTop: "0.65rem", fontSize: "0.75rem", color: "#666", lineHeight: 1.4 }}>
                  {config.devGoogleHint}
                </p>
              )}
              {config?.firebaseSetupHint && !config.firebaseReady && (
                <p style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#555", lineHeight: 1.4 }}>
                  {config.firebaseSetupHint}
                </p>
              )}

              <div style={{ marginTop: "1.25rem", fontSize: "0.875rem", color: "#888" }}>
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      style={{
                        color: "#fff",
                        fontWeight: 500,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "inherit",
                      }}
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      style={{
                        color: "#fff",
                        fontWeight: 500,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "inherit",
                      }}
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
              {Footer}
            </>
          )}

          {step === "otp" && (
            <form
              onSubmit={verifyOtp}
              style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.65rem" }}
            >
              <input
                style={input}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Paste OTP from Gmail"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                required
              />
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: "#ededed", fontSize: "0.85rem" }}>
                  Open email preview to copy OTP
                </a>
              )}
              <button type="submit" style={primaryBtn} disabled={busy || code.length < 4}>
                {busy ? "Verifying…" : "Verify & enter"}
              </button>
              <button
                type="button"
                style={{ ...socialBtn, marginBottom: 0 }}
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
            <p style={{ marginTop: "0.85rem", color: "#ff7a6e", fontSize: "0.85rem" }} role="alert">
              {error}
            </p>
          )}
        </div>
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
