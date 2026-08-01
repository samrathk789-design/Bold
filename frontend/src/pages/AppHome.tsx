import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import "./AppHome.css";

type Signal = {
  id: string;
  symbol: string;
  side: string;
  timeframe: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  rationale: string;
};

export function AppHomePage() {
  const { user, loading, logout } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [entries, setEntries] = useState<
    Array<{ id: string; symbol: string; side: string; entryPrice: number; notes: string | null }>
  >([]);
  const [bots, setBots] = useState<Array<{ id: string; name: string; strategy: string; status: string }>>(
    []
  );
  const [symbol, setSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const [s, j, a] = await Promise.all([api.signals(), api.journal(), api.algos()]);
        setSignals(s.signals);
        setEntries(j.entries);
        setBots(a.bots);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load workspace");
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="app-shell app-shell--center">
        <p>Loading Bold…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  async function addJournal(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createJournal({
        symbol: symbol.trim().toUpperCase(),
        side: "BUY",
        entryPrice: 100,
        notes: notes.trim() || undefined,
      });
      const j = await api.journal();
      setEntries(j.entries);
      setSymbol("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setBusy(false);
    }
  }

  async function createDemoBot() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/algos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("bold_token")}`,
        },
        body: JSON.stringify({
          name: "Beginner VWAP Pulse",
          strategy: "vwap-reclaim",
          config: { riskPercent: 0.5 },
        }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed");
      });
      const a = await api.algos();
      setBots(a.bots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create bot");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-top">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Bold</span>
        </Link>
        <div className="app-top__right">
          <span className="app-user">{user.name || user.email || user.phone}</span>
          <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="app-intro">
          <h1>Your trading workspace</h1>
          <p>Base version — signals, journal, and algos are live against the Bold API.</p>
        </section>

        {error && (
          <p className="app-error" role="alert">
            {error}
          </p>
        )}

        <section className="app-block">
          <h2>Live signals</h2>
          <div className="signal-list">
            {signals.map((s) => (
              <article key={s.id} className="signal-row">
                <div className="signal-row__meta">
                  <strong>{s.symbol}</strong>
                  <span className={`side side--${s.side.toLowerCase()}`}>{s.side}</span>
                  <span>{s.timeframe}</span>
                  <span>{s.confidence}% confidence</span>
                </div>
                <p>{s.rationale}</p>
                <p className="signal-row__levels">
                  Entry {s.entry} · SL {s.stopLoss} · TP {s.takeProfit}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="app-block">
          <h2>Trade journal</h2>
          <form className="journal-form" onSubmit={addJournal}>
            <input
              placeholder="Symbol (e.g. NIFTY)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
            <input
              placeholder="Quick note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button className="btn btn--primary" type="submit" disabled={busy}>
              Add entry
            </button>
          </form>
          <ul className="journal-list">
            {entries.length === 0 && <li className="muted">No journal entries yet.</li>}
            {entries.map((e) => (
              <li key={e.id}>
                <strong>{e.symbol}</strong> {e.side} @ {e.entryPrice}
                {e.notes ? ` — ${e.notes}` : ""}
              </li>
            ))}
          </ul>
        </section>

        <section className="app-block">
          <h2>Algo trading</h2>
          <button type="button" className="btn btn--primary" onClick={() => void createDemoBot()} disabled={busy}>
            Create starter bot
          </button>
          <ul className="journal-list">
            {bots.length === 0 && <li className="muted">No bots yet — create a starter when ready.</li>}
            {bots.map((b) => (
              <li key={b.id}>
                <strong>{b.name}</strong> · {b.strategy} · {b.status}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
