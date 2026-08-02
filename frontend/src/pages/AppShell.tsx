import { NavLink, Navigate, Outlet } from "react-router-dom";
import { Brain, Home } from "lucide-react";
import { useAuth } from "@/auth";
import "./Home.css";

/**
 * Authenticated app shell. Bold Brain is a dedicated tab — never on the public landing.
 */
export function AppShell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="home home--center">
        <p className="home__loading">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.needsUsername || !user.username) return <Navigate to="/username" replace />;

  const identity = user.username
    ? `@${user.username}`
    : user.name || user.email || user.phone || "there";

  return (
    <div className="home">
      <header className="home__top">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Bold</span>
        </div>
        <nav className="home__tabs" aria-label="App">
          <NavLink to="/app" end className={({ isActive }) => `home__tab${isActive ? " is-active" : ""}`}>
            <Home className="home__tab-icon" aria-hidden="true" />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/app/brain"
            className={({ isActive }) => `home__tab${isActive ? " is-active" : ""}`}
          >
            <Brain className="home__tab-icon" aria-hidden="true" />
            <span>Bold Brain</span>
          </NavLink>
        </nav>
        <div className="home__top-right">
          <span className="home__user">{identity}</span>
          <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function AppHome() {
  return (
    <main className="home__main">
      <div className="home__intro">
        <p className="home__eyebrow">Welcome</p>
        <h1 className="home__title">Your trading workspace</h1>
        <p className="home__sub">
          Use the Bold Brain tab for coaching on setups, risk, and journaling. More tools land here as
          you grow.
        </p>
      </div>
      <NavLink to="/app/brain" className="home__brain-card">
        <Brain className="home__brain-card-icon" aria-hidden="true" />
        <div>
          <strong>Open Bold Brain</strong>
          <p>Ask your trading coach anything beginner-clear.</p>
        </div>
      </NavLink>
    </main>
  );
}
