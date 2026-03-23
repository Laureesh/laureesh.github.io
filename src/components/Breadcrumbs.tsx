import { Link, useLocation } from "react-router-dom";
import { ChevronRight, House } from "lucide-react";
import { getBreadcrumbsForPath } from "../data/siteNavigation";
import { useDisplayLanguage } from "../contexts/DisplayLanguageContext";
import "./Breadcrumbs.css";

export default function Breadcrumbs() {
  const location = useLocation();
  const { translateRouteLabel } = useDisplayLanguage();

  if (location.pathname === "/") {
    return null;
  }

  const crumbs = getBreadcrumbsForPath(location.pathname);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <div className="container">
        <ol className="breadcrumbs-list">
          {crumbs.map((crumb, index) => {
            const isCurrent = index === crumbs.length - 1;

            return (
              <li key={`${crumb.label}-${index}`} className="breadcrumbs-item">
                {index === 0 && <House size={14} className="breadcrumbs-home-icon" />}
                {crumb.path && !isCurrent ? (
                  <Link to={crumb.path} className="breadcrumbs-link">
                    {translateRouteLabel(crumb.label)}
                  </Link>
                ) : (
                  <span className={`breadcrumbs-label ${isCurrent ? "current" : ""}`}>
                    {translateRouteLabel(crumb.label)}
                  </span>
                )}
                {!isCurrent && <ChevronRight size={14} className="breadcrumbs-separator" />}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
