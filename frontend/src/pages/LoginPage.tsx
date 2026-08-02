import { Navigate } from "react-router-dom";
import LoginScreen from "@/components/ui/modern-login-signup";
import { useAuth } from "@/auth";

/**
 * Login screen — original Bold panel on the black moving-dots background.
 */
export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }

  if (user) {
    const next = user.needsUsername || !user.username ? "/username" : "/app";
    return <Navigate to={next} replace />;
  }

  return <LoginScreen />;
}
