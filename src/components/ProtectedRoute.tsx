import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { canAccessRole, hasActiveStatus, type RoleRequirement } from "../utils/authGuards";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: RoleRequirement;
  unauthorizedRedirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  unauthorizedRedirectTo = "/profile",
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();
  const isAdminOnlyRoute =
    requiredRole === "admin"
    || (Array.isArray(requiredRole) && requiredRole.length === 1 && requiredRole[0] === "admin");

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasActiveStatus(userProfile)) {
    return <Navigate to="/" replace />;
  }

  if (!canAccessRole(user, userProfile, requiredRole)) {
    return <Navigate to={unauthorizedRedirectTo} replace />;
  }

  if (isAdminOnlyRoute && !user.emailVerified) {
    return (
      <section
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "60vh",
          padding: "2rem 1rem",
        }}
      >
        <div
          style={{
            width: "min(100%, 42rem)",
            border: "1px solid rgba(99, 102, 241, 0.18)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
            background: "rgba(12, 18, 32, 0.78)",
            boxShadow: "0 18px 50px rgba(2, 6, 23, 0.3)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.82rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(129, 140, 248, 0.88)" }}>
            Admin Security
          </p>
          <h1 style={{ margin: "0.45rem 0 0.75rem", fontSize: "1.9rem" }}>
            Verify Your Email Before Entering Admin Tools
          </h1>
          <p style={{ margin: 0, color: "rgba(226, 232, 240, 0.82)", lineHeight: 1.65 }}>
            This account still has the admin role, but elevated routes stay locked until the Firebase
            email-verification check passes. Finish verification in account settings, then reopen this route.
          </p>
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
            <Link to="/account-settings" className="btn btn-primary">
              Open account settings
            </Link>
            <Link to="/profile" className="btn btn-outline">
              Back to profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
