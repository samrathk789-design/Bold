import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import { AppHome, AppShell } from "./pages/AppShell";
import { BoldBrainChat } from "./components/BoldBrainChat";
import { UsernamePage } from "./pages/Username";

function postAuthPath(user: { needsUsername?: boolean; username?: string | null }) {
  if (user.needsUsername || !user.username) return "/username";
  return "/app";
}

function PublicLanding() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }
  if (user) return <Navigate to={postAuthPath(user)} replace />;
  return <LandingPage />;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireUsernameDone({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsUsername || !user.username) return <Navigate to="/username" replace />;
  return <>{children}</>;
}

/** Block unauthenticated access to any /app/* including deep links to brain */
function AuthedApp() {
  return (
    <RequireUsernameDone>
      <AppShell />
    </RequireUsernameDone>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLanding />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/demo" element={<PublicLanding />} />
          <Route
            path="/username"
            element={
              <RequireAuth>
                <UsernamePage />
              </RequireAuth>
            }
          />
          <Route path="/app" element={<AuthedApp />}>
            <Route index element={<AppHome />} />
            <Route path="brain" element={<BoldBrainChat />} />
          </Route>
          {/* Old brain URLs — never public */}
          <Route path="/brain" element={<Navigate to="/app/brain" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
