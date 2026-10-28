import { useEffect, useRef, useState, type ReactNode } from "react";

interface NavigationProject { id: string; title: string; category: string; status: string }

export default function ProjectCardNavigation({ projects, idPrefix, children }: {
  projects: NavigationProject[];
  idPrefix: string;
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentId = projects.some((project) => project.id === activeId) ? activeId : projects[0]?.id;

  useEffect(() => {
    let frame = 0;
    function updateCurrent() {
      frame = 0;
      const offset = (document.querySelector(".navbar")?.getBoundingClientRect().bottom ?? 76) + 16;
      const positions = projects.flatMap((project) => {
        const card = document.getElementById(`${idPrefix}${project.id}`);
        return card ? [{ id: project.id, distance: Math.abs(card.getBoundingClientRect().top - offset) }] : [];
      });
      const nearest = Math.min(...positions.map((position) => position.distance));
      setActiveId((previous) => {
        // Cards can share a row; preserve the clicked card when their tops align.
        const candidates = positions.filter((position) => position.distance <= nearest + 2);
        return candidates.find((position) => position.id === previous)?.id ?? candidates[0]?.id ?? null;
      });
    }
    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(updateCurrent);
    }
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    const observer = new ResizeObserver(scheduleUpdate);
    if (contentRef.current) observer.observe(contentRef.current);
    scheduleUpdate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [projects, idPrefix]);

  const categories = [...new Set(projects.map((project) => project.category))];
  function jumpToProject(project: NavigationProject) {
    const card = document.getElementById(`${idPrefix}${project.id}`);
    if (!card) return;
    setActiveId(project.id);
    card.focus({ preventScroll: true });
    const offset = (document.querySelector(".navbar")?.getBoundingClientRect().bottom ?? 76) + 16;
    window.scrollBy({ top: card.getBoundingClientRect().top - offset, behavior: "instant" });
  }

  return (
    <div className="project-navigation-layout">
      <aside className="project-navigation-panel" aria-label="Project navigation">
        <details open>
          <summary>Project navigation</summary>
          <p>{projects.length} {projects.length === 1 ? "project" : "projects"}</p>
          <nav className="project-navigation-links" aria-label="Jump to project">
            {categories.map((category) => {
              const group = projects.filter((project) => project.category === category);
              return (
                <div className="project-navigation-category-row" key={category}>
                  <details className="project-navigation-category">
                    <summary>{category} <small>{group.length}</small></summary>
                    <div>
                      {group.map((project) => (
                        <button type="button" key={project.id} title={project.title}
                          className="project-navigation-link"
                          data-category={category}
                          aria-label={`Go to ${project.title}`}
                          aria-current={currentId === project.id ? "location" : undefined}
                          aria-controls={`${idPrefix}${project.id}`}
                          onClick={() => jumpToProject(project)}>
                          <span>{project.title}</span><small>{project.status}</small>
                        </button>
                      ))}
                    </div>
                  </details>
                  <button type="button" className="project-navigation-category-jump"
                    aria-label={`Go to first ${category} project`} title={`Go to ${category}`}
                    onClick={() => jumpToProject(group[0])}>↧</button>
                </div>
              );
            })}
          </nav>
        </details>
      </aside>
      <div className="project-navigation-content" ref={contentRef}>{children}</div>
    </div>
  );
}
