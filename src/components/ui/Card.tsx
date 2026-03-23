import type { ReactNode } from "react";
import "./Card.css";

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  padding?: "sm" | "md" | "lg";
  className?: string;
}

export function Card({
  children,
  title,
  subtitle,
  padding = "md",
  className = "",
}: CardProps) {
  return (
    <div className={`ui-card ui-card--padding-${padding} ${className}`.trim()}>
      {(title || subtitle) && (
        <div className="ui-card__header">
          {title && <h3 className="ui-card__title">{title}</h3>}
          {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
