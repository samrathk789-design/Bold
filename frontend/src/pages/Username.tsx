import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/auth";
import "./Username.css";

export function UsernamePage() {
  const { user, loading, setSession, refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="username-page username-page--center">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!user.needsUsername && user.username) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { user: next } = await api.setUsername(username.trim());
      const token = localStorage.getItem("bold_token");
      if (token) setSession(token, next);
      else await refresh();
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save username");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="username-page">
      <div className="username-page__card">
        <div className="username-page__mark" aria-hidden="true">
          B
        </div>
        <h1>Pick a username</h1>
        <p>This is how you&apos;ll show up in Bold. You can keep it simple.</p>
        <form onSubmit={onSubmit}>
          <label className="username-page__label" htmlFor="username">
            Username
          </label>
          <div className="username-page__field">
            <span className="username-page__at">@</span>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="boldtrader"
              autoComplete="username"
              autoFocus
              minLength={3}
              maxLength={24}
              required
            />
          </div>
          <p className="username-page__hint">3–24 characters · letters, numbers, underscore</p>
          {error && (
            <p className="username-page__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || username.length < 3}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
