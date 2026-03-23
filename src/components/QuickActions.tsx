import { Link, useLocation } from "react-router-dom";
import { FileText, Github, Mail } from "lucide-react";
import "./QuickActions.css";

const hiddenRoutes = new Set(["/game", "/solo-game", "/movie-app", "/yt-tags", "/login", "/register"]);

const actions = [
  {
    id: "resume",
    label: "View Resume",
    path: "/resume",
    icon: FileText,
    external: false,
  },
  {
    id: "contact",
    label: "Contact",
    path: "/contact",
    icon: Mail,
    external: false,
  },
  {
    id: "github",
    label: "GitHub",
    path: "https://github.com/laureesh",
    icon: Github,
    external: true,
  },
];

export default function QuickActions() {
  const location = useLocation();

  if (hiddenRoutes.has(location.pathname)) {
    return null;
  }

  return (
    <div className="quick-actions" aria-label="Quick actions">
      {actions.map((action) => {
        const Icon = action.icon;
        const isActive = !action.external && location.pathname === action.path;
        const className = `quick-action ${isActive ? "active" : ""}`;

        if (action.external) {
          return (
            <a
              key={action.id}
              href={action.path}
              target="_blank"
              rel="noreferrer"
              className={className}
              aria-label={action.label}
            >
              <Icon size={17} />
              <span>{action.label}</span>
            </a>
          );
        }

        return (
          <Link
            key={action.id}
            to={action.path}
            className={className}
            aria-label={action.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={17} />
            <span>{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
