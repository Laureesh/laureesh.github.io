import { Link } from "react-router-dom";
import { Github, Linkedin, Mail, Youtube, type LucideIcon } from "lucide-react";
import { usePublicSiteLinks } from "../hooks/useContentCatalog";
import { primaryNavigation } from "../data/siteNavigation";
import { useDisplayLanguage } from "../contexts/DisplayLanguageContext";
import "./Footer.css";

const footerSocialFallback = [
  { id: "github", href: "https://github.com/laureesh", icon: Github, label: "GitHub" },
  { id: "linkedin", href: "https://linkedin.com/in/laureesh", icon: Linkedin, label: "LinkedIn" },
  { id: "email", href: "mailto:laureesh1@gmail.com", icon: Mail, label: "Email" },
];

function getFooterSocialIcon(icon: string | null) {
  switch (icon) {
    case "github":
      return Github;
    case "linkedin":
      return Linkedin;
    case "youtube":
      return Youtube;
    case "mail":
      return Mail;
    default:
      return null;
  }
}

export default function Footer() {
  const { links } = usePublicSiteLinks("social");
  const { t, translateRouteLabel } = useDisplayLanguage();
  const socialLinks = links.length
    ? links
        .map((link) => {
          const icon = getFooterSocialIcon(link.icon);

          if (!icon) {
            return null;
          }

          return {
            id: link.id,
            href: link.url,
            icon,
            label: link.label,
          };
        })
        .filter((link): link is { id: string; href: string; icon: LucideIcon; label: string } => Boolean(link))
    : footerSocialFallback;

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">LV<span className="logo-dot">.</span></Link>
            <p>{t("footerTagline")}</p>
          </div>
          <nav className="footer-nav">
            {primaryNavigation
              .filter((link) => !["/", "/resume"].includes(link.path))
              .map((link) => (
              <Link to={link.path} key={link.path}>{translateRouteLabel(link.label)}</Link>
              ))}
          </nav>
          <div className="footer-socials">
            {socialLinks.map((link) => {
              const Icon = link.icon;
              const external = !link.href.startsWith("mailto:");

              return (
                <a
                  key={link.id}
                  href={link.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  aria-label={link.label}
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copy">&copy; {new Date().getFullYear()} Laureesh Volmar. {t("allRightsReserved")}</p>
        </div>
      </div>
    </footer>
  );
}
