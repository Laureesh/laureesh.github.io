import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { AdminDashboardSectionKey } from "../../data/adminDashboard";
import { adminDashboardSections } from "../../data/adminDashboard";

interface AdminSectionPlaceholderProps {
  sectionKey: Exclude<AdminDashboardSectionKey, "overview">;
}

export default function AdminSectionPlaceholder({
  sectionKey,
}: AdminSectionPlaceholderProps) {
  const section = adminDashboardSections.find((item) => item.key === sectionKey);

  if (!section) {
    return null;
  }

  const Icon = section.icon;

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel">
        <div className="admin-panel__header">
          <p className="admin-panel__eyebrow">{section.eyebrow}</p>
          <div className="admin-panel__title-row">
            <Icon size={18} />
            <h2>{section.label}</h2>
          </div>
          <p>{section.description}</p>
        </div>

        <div className="admin-note-box">
          This section is intentionally a real route now, but still a placeholder for the next phase of
          implementation. The shell is ready so future admin tools can attach here without changing the
          protected dashboard structure.
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h3>Planned capabilities</h3>
          <p>These are the first responsibilities already reserved for this module.</p>
        </div>

        <div className="admin-check-grid">
          {section.highlights.map((highlight) => (
            <div key={highlight} className="admin-check-card">
              {highlight}
            </div>
          ))}
        </div>

        <Link to="/admin-dashboard" className="admin-module-card__link admin-module-card__link--inline">
          <ArrowLeft size={14} />
          Back to overview
        </Link>
      </section>
    </div>
  );
}
