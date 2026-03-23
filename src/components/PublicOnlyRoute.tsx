import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { shouldRedirectAuthenticated } from "../utils/authGuards";

interface PublicOnlyRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function PublicOnlyRoute({
  children,
  redirectTo = "/",
}: PublicOnlyRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  if (shouldRedirectAuthenticated(user)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
