import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import DemoOne from "./pages/demo";
import { HomePage } from "./pages/Home";

function LoginGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;
  return <DemoOne />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginGate />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/demo" element={<DemoOne />} />
          <Route path="/app" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
