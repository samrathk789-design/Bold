import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import LandingPage from "./pages/Landing";
import DemoOne from "./pages/demo";
import { HomePage } from "./pages/Home";
import { UsernamePage } from "./pages/Username";

function postAuthPath(user: { needsUsername?: boolean; username?: string | null }) {
  if (user.needsUsername || !user.username) return "/username";
  return "/app";
}

function LoginGate() {
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
  if (!user) return <Navigate to="/" replace />;
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
  if (!user) return <Navigate to="/" replace />;
  if (user.needsUsername || !user.username) return <Navigate to="/username" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginGate />} />
          <Route path="/login" element={<LoginGate />} />
          <Route path="/demo" element={<DemoOne />} />
          <Route
            path="/username"
            element={
              <RequireAuth>
                <UsernamePage />
              </RequireAuth>
            }
          />
          <Route
            path="/app"
            element={
              <RequireUsernameDone>
                <HomePage />
              </RequireUsernameDone>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
