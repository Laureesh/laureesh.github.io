import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./SectionNav.css";

export interface SectionNavItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionNavItem[];
  stickyOffset?: number;
}

export default function SectionNav({
  sections,
  stickyOffset = 120,
}: SectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sections.length === 0) {
      return undefined;
    }

    const updateActiveSection = () => {
      const offset = stickyOffset + 48;
      let nextActiveId = sections[0]?.id ?? "";

      for (const section of sections) {
        const element = document.getElementById(section.id);

        if (!element) {
          continue;
        }

        if (element.getBoundingClientRect().top <= offset) {
          nextActiveId = section.id;
        }
      }

      setActiveId(nextActiveId);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sections, stickyOffset]);

  useEffect(() => {
    if (!activeId || !navRef.current || !trackRef.current) {
      return;
    }

    const activeLink = navRef.current.querySelector<HTMLAnchorElement>(
      `[href="#${activeId}"]`,
    );

    if (!activeLink) {
      return;
    }

    const track = trackRef.current;
    const nextScrollLeft =
      activeLink.offsetLeft - track.clientWidth / 2 + activeLink.clientWidth / 2;

    track.scrollTo({
      left: Math.max(0, nextScrollLeft),
      behavior: "smooth",
    });
  }, [activeId]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      className="section-nav"
      aria-label="Section navigation"
      data-no-swipe="true"
      style={{ "--section-nav-top": `${stickyOffset}px` } as CSSProperties}
    >
      <div ref={trackRef} className="section-nav-track">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`section-nav-link ${activeId === section.id ? "active" : ""}`}
            aria-current={activeId === section.id ? "true" : undefined}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
