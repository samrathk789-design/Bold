import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import "./Home.css";

export function HomePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="home home--center">
        <p className="home__loading">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const identity = user.name || user.email || user.phone || "there";

  return (
    <div className="home">
      <header className="home__top">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Bold</span>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
          Log out
        </button>
      </header>

      <main className="home__main">
        <p className="home__eyebrow">You&apos;re signed in</p>
        <h1 className="home__title">Welcome, {identity}</h1>
        <p className="home__sub">Your session is active. You can sign out anytime.</p>
        <button type="button" className="btn btn--primary" onClick={() => void logout()}>
          Log out
        </button>
      </main>
    </div>
  );
}
