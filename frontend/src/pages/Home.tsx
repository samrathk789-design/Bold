import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { CTASection } from "@/components/ui/hero-dithering-card";
import "./Home.css";

type ChatMsg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I'm new to trading — where should I start?",
  "How do I size a trade safely?",
  "Explain stop-loss like I'm a beginner.",
];

export function HomePage() {
  const { user, loading, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "I'm Bold Brain. Ask me about setups, risk, journaling, or anything confusing in the market — I'll keep it beginner-clear.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brainReady, setBrainReady] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const brainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    void api
      .brainStatus()
      .then((s) => {
        setBrainReady(s.ready);
        setModel(s.model);
      })
      .catch(() => setBrainReady(false));
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  if (loading) {
    return (
      <div className="home home--center">
        <p className="home__loading">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const identity = user.username
    ? `@${user.username}`
    : user.name || user.email || user.phone || "there";

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    const history = messages.filter((m) => m.content);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    try {
      const res = await api.brainChat(
        message,
        history.map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      setModel(res.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Brain request failed");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function focusBrain() {
    brainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => inputRef.current?.focus(), 350);
  }

  return (
    <div className="home">
      <header className="home__top">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Bold</span>
        </div>
        <div className="home__top-right">
          <span className="home__user">{identity}</span>
          <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      <div className="home__hero">
        <CTASection
          badge="Bold Brain"
          title={
            <>
              Your edge, <br />
              <span className="text-white/80">explained clearly.</span>
            </>
          }
          description="Ask Bold Brain about setups, risk, and journaling — beginner-clear coaching powered by OpenRouter."
          ctaLabel="Ask Bold Brain"
          onCtaClick={focusBrain}
        />
      </div>

      <main className="home__main" ref={brainRef} id="brain">
        <div className="home__intro">
          <p className="home__eyebrow">Bold Brain</p>
          <h1 className="home__title">Your trading coach</h1>
          <p className="home__sub">
            Ask anything about learning to trade. Powered by OpenRouter
            {model ? ` · ${model}` : ""}.
          </p>
          {brainReady === false && (
            <p className="home__warn">Brain is offline — check OPENROUTER_API_KEY on the server.</p>
          )}
        </div>

        <div className="brain" aria-live="polite">
          <div className="brain__thread">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`brain__bubble brain__bubble--${m.role}`}>
                <span className="brain__who">{m.role === "assistant" ? "Brain" : "You"}</span>
                <p>{m.content}</p>
              </div>
            ))}
            {busy && (
              <div className="brain__bubble brain__bubble--assistant brain__bubble--typing">
                <span className="brain__who">Brain</span>
                <p>Thinking…</p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="brain__starters">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="brain__chip" onClick={() => void send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form className="brain__composer" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Bold Brain…"
              disabled={busy || brainReady === false}
              maxLength={2000}
            />
            <button className="btn btn--primary" type="submit" disabled={busy || !input.trim() || brainReady === false}>
              Send
            </button>
          </form>
          {error && (
            <p className="home__error" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
