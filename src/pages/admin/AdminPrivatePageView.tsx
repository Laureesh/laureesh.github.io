import { ArrowLeft, FilePenLine, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageContent } from "../../hooks/useContentCatalog";
import {
  editablePages,
  getPageSection,
  getPageSectionLines,
  type EditablePageKey,
} from "../../services/pageContent";

interface AdminPrivatePageViewProps {
  pageKey: Extract<EditablePageKey, "food-routine" | "face-routine">;
}

export default function AdminPrivatePageView({ pageKey }: AdminPrivatePageViewProps) {
  const { content, loading } = usePageContent(pageKey);
  const page = editablePages.find((item) => item.key === pageKey) ?? editablePages[0];
  const headerSection = getPageSection(content, "header");
  const bodySections = content.sections.filter((section) => section.id !== "header");

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <div className="admin-private-page-header">
          <div>
            <p className="admin-panel__eyebrow">{headerSection?.eyebrow ?? "Admin Routine"}</p>
            <div className="admin-panel__title-row">
              <LockKeyhole size={18} />
              <h2>{headerSection?.title ?? page.label}</h2>
            </div>
            <p>
              {headerSection?.body ?? page.description}
            </p>
          </div>

          <div className="admin-private-page-header__actions">
            <Link to="/admin-dashboard/private-pages" className="admin-module-card__link admin-module-card__link--inline">
              <ArrowLeft size={14} />
              Back to private pages
            </Link>
            <Link to="/admin-dashboard/pages" className="admin-module-card__link admin-module-card__link--inline">
              <FilePenLine size={14} />
              Edit in page editor
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="admin-note-box">Loading the latest Firestore-backed private page content...</div>
        ) : (
          <div className="admin-note-box">
            This route is admin-only and reads the published private page record from Firestore. If nothing has been saved yet, the app now shows a safe placeholder instead of shipping real private notes in the client bundle.
          </div>
        )}
      </section>

      <section className="admin-private-page-grid">
        {bodySections.map((section) => {
          const lines = getPageSectionLines(section);

          return (
            <article key={section.id} className="admin-panel admin-private-section">
              {section.eyebrow ? <p className="admin-panel__eyebrow">{section.eyebrow}</p> : null}
              {section.title ? <h3>{section.title}</h3> : null}
              {section.body ? <p>{section.body}</p> : null}
              {lines.length ? (
                <ul className="admin-module-card__list">
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
