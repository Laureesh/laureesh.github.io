import { Clock3, ShieldCheck } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { adminDashboardSections, getAdminDashboardSection } from "../../data/adminDashboard";
import { useAuth } from "../../contexts/AuthContext";
import "./AdminDashboard.css";

function formatRemainingTime(value: number | null) {
  if (value == null) {
    return "Inactive";
  }

  const totalSeconds = Math.max(Math.ceil(value / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function AdminDashboardLayout() {
  const location = useLocation();
  const { userProfile, adminSessionTimeRemainingMs } = useAuth();
  const currentSection = getAdminDashboardSection(location.pathname);
  const sessionCountdown = formatRemainingTime(adminSessionTimeRemainingMs);

  return (
    <section className="admin-shell">
      <div className="admin-shell__header">
        <span className="admin-shell__eyebrow">Admin Only</span>
        <div className="admin-shell__title-row">
          <h1>Admin Dashboard</h1>
          <span className="admin-shell__badge">
            <ShieldCheck size={14} />
            {userProfile?.role === "admin" ? "Admin Access" : "Protected"}
          </span>
          {userProfile?.role === "admin" ? (
            <span className="admin-shell__badge admin-shell__badge--timer">
              <Clock3 size={14} />
              Session {sessionCountdown}
            </span>
          ) : null}
        </div>
        <p>
          The protected dashboard shell is live now, with a dedicated sidebar and scalable module routes
          for the CMS, users, tasks, and private pages.
        </p>
      </div>

      <div className="admin-shell__grid">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__section">
            <p className="admin-sidebar__label">Navigation</p>
            <nav className="admin-sidebar__nav" aria-label="Admin dashboard">
              {adminDashboardSections.map((section) => {
                const Icon = section.icon;

                return (
                  <NavLink
                    key={section.key}
                    to={section.path}
                    end={section.key === "overview"}
                    className={({ isActive }) =>
                      `admin-sidebar__link ${isActive ? "is-active" : ""}`
                    }
                  >
                    <span className="admin-sidebar__link-icon">
                      <Icon size={16} />
                    </span>
                    <span className="admin-sidebar__link-copy">
                      <strong>{section.label}</strong>
                      <span>{section.eyebrow}</span>
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="admin-sidebar__card">
            <p className="admin-sidebar__label">Current Section</p>
            <h2>{currentSection.label}</h2>
            <p>{currentSection.description}</p>
          </div>

          {userProfile?.role === "admin" ? (
            <div className="admin-sidebar__card admin-sidebar__card--timer">
              <p className="admin-sidebar__label">Session Timeout</p>
              <div className="admin-sidebar__timer-row">
                <Clock3 size={16} />
                <strong>{sessionCountdown}</strong>
              </div>
              <p>
                Any keyboard, pointer, touch, scroll, or focus activity resets the admin idle timer.
              </p>
            </div>
          ) : null}

          <div className="admin-sidebar__card">
            <p className="admin-sidebar__label">Why this shell exists</p>
            <ul className="admin-sidebar__list">
              <li>Admin routes stay fully hidden from members.</li>
              <li>The module layout is ready for deeper Firestore-backed tools.</li>
              <li>Sidebar navigation can grow without another routing rewrite.</li>
            </ul>
          </div>
        </aside>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
