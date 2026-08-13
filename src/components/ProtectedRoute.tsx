import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../lib/AuthContext";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (profile && !profile.is_verified) {
    return (
      <div className="flex h-screen items-center justify-center px-6">
        <div className="card max-w-md p-6 text-center">
          <h2 className="font-display font-semibold text-lg mb-2">Verification pending</h2>
          <p className="text-sm text-slate-600">
            Your account is waiting on admin verification against college records. This usually
            takes under a day — check back soon.
          </p>
        </div>
      </div>
    );
  }

  if (requireAdmin && profile?.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
