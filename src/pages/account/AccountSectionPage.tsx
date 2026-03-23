import type { LucideIcon } from "lucide-react";
import "./AccountSectionPage.css";

interface AccountSectionPageProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
}

export default function AccountSectionPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  highlights,
}: AccountSectionPageProps) {
  return (
    <section className="account-section-page">
      <div className="account-section-card">
        <div className="account-section-head">
          <span className="account-section-eyebrow">{eyebrow}</span>
          <div className="account-section-title-row">
            <span className="account-section-icon-wrap">
              <Icon size={22} />
            </span>
            <h1>{title}</h1>
          </div>
          <p>{description}</p>
        </div>

        <div className="account-section-highlights">
          {highlights.map((highlight) => (
            <div key={highlight} className="account-section-highlight">
              {highlight}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
