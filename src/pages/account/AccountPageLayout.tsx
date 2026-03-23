import type { ReactNode } from "react";
import "./AccountPages.css";

interface AccountPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  sidebar?: ReactNode;
  children: ReactNode;
}

export default function AccountPageLayout({
  eyebrow,
  title,
  description,
  sidebar,
  children,
}: AccountPageLayoutProps) {
  return (
    <section className="account-workspace">
      <div className="account-workspace-header">
        <span className="account-workspace-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className={`account-workspace-grid ${sidebar ? "has-sidebar" : ""}`}>
        <div className="account-workspace-main">{children}</div>
        {sidebar ? <aside className="account-workspace-sidebar">{sidebar}</aside> : null}
      </div>
    </section>
  );
}
