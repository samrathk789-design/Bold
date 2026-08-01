import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import "./Landing.css";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <div className="landing__atmosphere" aria-hidden="true">
        <div className="landing__grid" />
        <div className="landing__glow landing__glow--a" />
        <div className="landing__glow landing__glow--b" />
        <svg className="landing__chart" viewBox="0 0 1200 700" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9AFF6B" stopOpacity="0.15" />
              <stop offset="55%" stopColor="#9AFF6B" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#F4F7F2" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9AFF6B" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#9AFF6B" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="landing__chart-fill"
            d="M0,520 C120,490 180,560 280,430 C380,300 420,340 520,280 C620,220 680,310 760,240 C860,150 920,190 1040,120 L1200,80 L1200,700 L0,700 Z"
            fill="url(#fillGrad)"
          />
          <path
            className="landing__chart-line"
            d="M0,520 C120,490 180,560 280,430 C380,300 420,340 520,280 C620,220 680,310 760,240 C860,150 920,190 1040,120 L1200,80"
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3.5"
          />
        </svg>
      </div>

      <header className="landing__nav">
        <Link to="/" className="brand" aria-label="Bold home">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Bold</span>
        </Link>
        <nav className="landing__nav-actions">
          {user ? (
            <Link className="btn btn--ghost" to="/app">
              Open workspace
            </Link>
          ) : (
            <Link className="btn btn--ghost" to="/login">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main className="landing__hero">
        <p className="brand-lockup">Bold</p>
        <h1 className="landing__headline">Trade with clarity, not guesswork.</h1>
        <p className="landing__sub">
          Signals, journaling, and guided algos — built so beginners can learn while they trade.
        </p>
        <div className="landing__cta">
          <Link className="btn btn--primary" to={user ? "/app" : "/login"}>
            {user ? "Continue trading" : "Get started"}
          </Link>
          <a className="btn btn--text" href="#how">
            See how it works
          </a>
        </div>
      </main>

      <section id="how" className="landing__how">
        <h2>One path from confused to consistent.</h2>
        <p className="landing__how-sub">
          Bold keeps the noise out so you can focus on the next clear decision.
        </p>
        <ul className="landing__pillars">
          <li>
            <span className="pillar__label">Signals</span>
            <p>Plain-language setups with entry, stop, and target — plus why it matters.</p>
          </li>
          <li>
            <span className="pillar__label">Journal</span>
            <p>Log every trade, spot emotional patterns, and tighten your process.</p>
          </li>
          <li>
            <span className="pillar__label">Algos</span>
            <p>Start with guided bots when you are ready — pause anytime.</p>
          </li>
        </ul>
      </section>

      <footer className="landing__foot">
        <span className="brand__name">Bold</span>
        <span>Built for traders who are still learning.</span>
      </footer>
    </div>
  );
}
