import { ArrowRight, FilePenLine, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { adminPrivateResources } from "../../data/adminPrivatePages";

export default function AdminPrivatePagesPage() {
  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <p className="admin-panel__eyebrow">Protected Content</p>
        <div className="admin-panel__title-row">
          <h2>Private Pages</h2>
        </div>
        <p>
          These pages are internal-only. They live under the admin dashboard, stay hidden from members and public visitors, and can be either structured Firestore-backed pages or standalone HTML tools.
        </p>
        <div className="admin-note-box">
          Only active admin accounts can reach these routes. Structured pages read private content from Firestore, while standalone tools open on protected direct routes.
        </div>
      </section>

      <section className="admin-private-grid">
        {adminPrivateResources.map((page) => (
          <article key={page.key} className="admin-panel admin-private-card">
            <div className="admin-panel__header">
              <p className="admin-panel__eyebrow">Admin Only</p>
              <div className="admin-panel__title-row">
                <LockKeyhole size={18} />
                <h2>{page.label}</h2>
              </div>
              <p>{page.description}</p>
            </div>

            <div className="admin-chip-row">
              <span className="admin-shell__badge">
                <ShieldCheck size={14} />
                Hidden from members
              </span>
              <span className="admin-shell__badge">
                <FilePenLine size={14} />
                {page.kind === "structured-page" ? "Editable in Pages CMS" : "Standalone HTML tool"}
              </span>
            </div>

            <div className="admin-private-card__actions">
              <Link to={page.route} className="admin-module-card__link">
                Open page
                <ArrowRight size={14} />
              </Link>
              {page.kind === "structured-page" ? (
                <Link to="/admin-dashboard/pages" className="admin-module-card__link">
                  Edit copy
                  <FilePenLine size={14} />
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
