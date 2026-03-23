import {
  useEffect,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  ExternalLink,
  Gamepad2,
  Github,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  type ProjectShowcaseItem,
  type ProjectSortMode,
  type ProjectViewMode,
} from "../data/projectShowcase";
import { useTheme } from "../components/themeContext";
import { usePublicSiteProjects } from "../hooks/useContentCatalog";
import "./Projects.css";

type GalleryIndexMap = Record<string, number>;
type ProjectDetailTab = "source" | "learned" | "gallery" | "architecture";

function getProjectInitials(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "P";
  const second = words[1]?.[0] ?? words[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

function getProjectDetailButtons(project: ProjectShowcaseItem) {
  return [
    {
      id: "source" as const,
      label: "View source code",
      meta: project.sourcePreview.language,
    },
    {
      id: "learned" as const,
      label: "What I learned",
      meta: `${project.learned.length} takeaways`,
    },
    {
      id: "gallery" as const,
      label: "Screenshot gallery",
      meta: `${project.gallery.length} slides`,
    },
    {
      id: "architecture" as const,
      label: "Architecture diagram",
      meta: "Expand",
    },
  ];
}

function renderProjectDetailPanel(
  project: ProjectShowcaseItem,
  activeDetailTab: ProjectDetailTab | null,
  galleryIndex: number,
  onGalleryChange: (projectId: string, nextIndex: number) => void,
) {
  if (activeDetailTab === "source") {
    return (
      <div className="project-panel-body">
        <p className="project-panel-copy">{project.sourcePreview.title}</p>
        <pre className="project-source-preview">
          <code>{project.sourcePreview.snippet}</code>
        </pre>
      </div>
    );
  }

  if (activeDetailTab === "learned") {
    return (
      <div className="project-panel-body">
        <ul className="project-learned-list">
          {project.learned.map((lesson) => (
            <li key={lesson}>{lesson}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (activeDetailTab === "gallery") {
    return (
      <div className="project-panel-body">
        <ProjectGallery
          project={project}
          slideIndex={galleryIndex}
          onChange={onGalleryChange}
        />
      </div>
    );
  }

  if (activeDetailTab === "architecture") {
    return (
      <div className="project-panel-body">
        <ArchitectureDiagram project={project} />
      </div>
    );
  }

  return null;
}

function toMonthNumber(value: string) {
  const [year, month] = value.split("-").map(Number);
  return year * 12 + (month - 1);
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}-01T12:00:00`));
}

function getProjectActionLabel(project: ProjectShowcaseItem) {
  if (!project.liveUrl) {
    return null;
  }

  if (project.liveUrl === "/") {
    return "Open Site";
  }

  if (project.liveUrl.startsWith("/game") || project.liveUrl.startsWith("/solo-game")) {
    return "Play Demo";
  }

  return "View Demo";
}

function StatusBadge({ status }: { status: ProjectShowcaseItem["status"] }) {
  return <span className={`project-status-badge ${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span>;
}

function ComplexityRating({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  return (
    <div className={`project-complexity ${compact ? "compact" : ""}`} aria-label={`Complexity ${value} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`project-complexity-bar ${index < value ? "filled" : ""}`}
        />
      ))}
    </div>
  );
}

function ExpandableTags({
  tags,
  className,
  visibleCount = 3,
}: {
  tags: string[];
  className: string;
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hiddenTagCount = Math.max(0, tags.length - visibleCount);
  const tagsToShow = expanded ? tags : tags.slice(0, visibleCount);

  return (
    <div className={className}>
      {tagsToShow.map((tag) => (
        <span className="tag" key={tag}>
          {tag}
        </span>
      ))}
      {hiddenTagCount > 0 && (
        <button
          type="button"
          className="tag tag-expand"
          aria-pressed={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : `+${hiddenTagCount} more`}
        </button>
      )}
    </div>
  );
}

function ContributionInline({
  contributions,
}: {
  contributions: ProjectShowcaseItem["contributions"];
}) {
  return (
    <span className="project-contribution-inline">
      <span>FRONT {contributions.frontend}%</span>
      <span className="project-contribution-separator" aria-hidden="true">/</span>
      <span>BACK {contributions.backend}%</span>
      <span className="project-contribution-separator" aria-hidden="true">/</span>
      <span>DESIGN {contributions.design}%</span>
    </span>
  );
}

function ContributionBreakdown({
  contributions,
  variant = "full",
  label = "Contribution mix",
  note,
}: {
  contributions: ProjectShowcaseItem["contributions"];
  variant?: "full" | "compact" | "card";
  label?: string;
  note?: string;
}) {
  if (variant === "compact") {
    return <ContributionInline contributions={contributions} />;
  }

  if (variant === "card") {
    return (
      <div className="project-contribution-compact">
        <div className="project-contribution-compact-head">
          <span className="project-metric-label">{label}</span>
          {note && <span className="project-contribution-note">{note}</span>}
        </div>
        <div className="project-contribution-stack" aria-label="Contribution breakdown">
          <span className="frontend" style={{ width: `${contributions.frontend}%` }} />
          <span className="backend" style={{ width: `${contributions.backend}%` }} />
          <span className="design" style={{ width: `${contributions.design}%` }} />
        </div>
        <ContributionInline contributions={contributions} />
      </div>
    );
  }

  return (
    <div className="project-contribution-breakdown">
      {[
        ["Frontend", contributions.frontend],
        ["Backend", contributions.backend],
        ["Design", contributions.design],
      ].map(([label, value]) => (
        <div className="project-contribution-row" key={label}>
          <span>{label}</span>
          <div className="project-contribution-bar">
            <span style={{ width: `${value}%` }} />
          </div>
          <strong>{value}%</strong>
        </div>
      ))}
    </div>
  );
}

function ProjectPrimaryAction({ project }: { project: ProjectShowcaseItem }) {
  if (!project.liveUrl) {
    return null;
  }

  const label = getProjectActionLabel(project);

  if (project.liveUrl.startsWith("/game") || project.liveUrl.startsWith("/solo-game")) {
    return (
      <Link to={project.liveUrl} className="btn btn-primary btn-sm">
        <Gamepad2 size={16} /> {label}
      </Link>
    );
  }

  if (project.liveUrl.startsWith("/")) {
    return (
      <Link to={project.liveUrl} className="btn btn-primary btn-sm">
        <ExternalLink size={16} /> {label}
      </Link>
    );
  }

  return (
    <a href={project.liveUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
      <ExternalLink size={16} /> {label}
    </a>
  );
}

function ProjectGallery({
  project,
  slideIndex,
  onChange,
}: {
  project: ProjectShowcaseItem;
  slideIndex: number;
  onChange: (projectId: string, nextIndex: number) => void;
}) {
  const slide = project.gallery[slideIndex];

  return (
    <div className="project-gallery-shell">
      <div className={`project-gallery-card theme-${slide.theme}`}>
        {slide.image ? (
          <img src={slide.image} alt={`${project.title} preview`} className="project-gallery-image" />
        ) : (
          <div className="project-gallery-preview">
            <span className="project-gallery-window" />
            <div className="project-gallery-copy">
              <h4>{slide.title}</h4>
              <p>{slide.caption}</p>
              <ul className="project-gallery-bullets">
                {slide.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      <div className="project-gallery-controls">
        <button
          type="button"
          onClick={() =>
            onChange(
              project.id,
              (slideIndex - 1 + project.gallery.length) % project.gallery.length,
            )
          }
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <span>
          {slideIndex + 1} / {project.gallery.length}
        </span>
        <button
          type="button"
          onClick={() => onChange(project.id, (slideIndex + 1) % project.gallery.length)}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ArchitectureDiagram({ project }: { project: ProjectShowcaseItem }) {
  return (
    <div className="project-architecture-shell">
      <p className="project-panel-copy">{project.architecture.summary}</p>
      <div className="project-architecture-diagram">
        {project.architecture.lanes.map((lane, index) => (
          <div className="project-architecture-lane" key={lane.label}>
            <span className="project-architecture-label">{lane.label}</span>
            <div className="project-architecture-nodes">
              {lane.nodes.map((node) => (
                <span className="project-architecture-node" key={node}>
                  {node}
                </span>
              ))}
            </div>
            {index < project.architecture.lanes.length - 1 && (
              <div className="project-architecture-connector" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isFlipped,
  onFlip,
  galleryIndex,
  onGalleryChange,
}: {
  project: ProjectShowcaseItem;
  isFlipped: boolean;
  onFlip: (projectId: string) => void;
  galleryIndex: number;
  onGalleryChange: (projectId: string, nextIndex: number) => void;
}) {
  const [activeDetailTab, setActiveDetailTab] = useState<ProjectDetailTab | null>(null);
  const detailButtons = getProjectDetailButtons(project);
  const detailPanel = renderProjectDetailPanel(
    project,
    activeDetailTab,
    galleryIndex,
    onGalleryChange,
  );

  return (
    <article id={`project-card-${project.id}`} className="project-card-shell">
      {isFlipped && (
        <button
          type="button"
          className="project-flip-return"
          onClick={() => onFlip(project.id)}
        >
          Back to summary
        </button>
      )}
      <div className={`project-flip-card ${isFlipped ? "is-flipped" : ""}`}>
        <div className="project-flip-inner">
          <div className="card project-face project-face-front">
            <div className="project-card-topline">
              <StatusBadge status={project.status} />
              <span className={`project-type-badge ${project.type.toLowerCase()}`}>
                {project.type}
              </span>
            </div>
            <div className="project-card-header">
              <div>
                <h3>{project.title}</h3>
                <p className="project-tagline">{project.tagline}</p>
              </div>
              <span className="project-date">{project.date}</span>
            </div>
            <p className="project-desc">{project.desc}</p>
            <div className="project-card-meta-strip">
              <div className="project-meta-chip">
                <span className="project-meta-chip-label">Complexity</span>
                <ComplexityRating value={project.complexity} compact />
              </div>
              <div className="project-meta-chip">
                <Clock3 size={14} />
                <span>{project.estimatedTime}</span>
              </div>
            </div>
            <ContributionBreakdown
              contributions={project.contributions}
              variant="card"
              label={project.effortLabel}
              note={project.effortNote}
            />
            <ExpandableTags tags={project.tags} className="project-tags" />
            <div className="project-card-actions">
              <button
                type="button"
                className="project-flip-toggle"
                aria-pressed={isFlipped}
                aria-controls={`project-stack-${project.id}`}
                onClick={() => onFlip(project.id)}
              >
                See tech stack
              </button>
              <ProjectPrimaryAction project={project} />
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  <Github size={16} /> Code
                </a>
              )}
            </div>
            <div className="project-detail-panels" role="group" aria-label={`${project.title} project details`}>
              {detailButtons.map((button) => {
                const isActive = activeDetailTab === button.id;

                return (
                  <button
                    key={button.id}
                    type="button"
                    className={`project-detail-tab ${isActive ? "active" : ""}`}
                    aria-pressed={isActive}
                    aria-controls={`project-detail-panel-${project.id}-${button.id}`}
                    onClick={() =>
                      setActiveDetailTab((currentTab) =>
                        currentTab === button.id ? null : button.id,
                      )
                    }
                  >
                    <span className="project-detail-tab-label">{button.label}</span>
                    <span className="project-detail-tab-meta">{button.meta}</span>
                  </button>
                );
              })}
            </div>
            {activeDetailTab && (
              <div
                id={`project-detail-panel-${project.id}-${activeDetailTab}`}
                className="project-detail-panel"
                role="region"
                aria-label={`${project.title} ${activeDetailTab} details`}
              >
                {detailPanel}
              </div>
            )}
          </div>

          <div id={`project-stack-${project.id}`} className="card project-face project-face-back">
            <div className="project-card-topline">
              <span className="project-back-label">
                <Code2 size={14} /> Tech stack
              </span>
            </div>
            <div className="project-stack-groups">
              {project.stackGroups.map((group) => (
                <div className="project-stack-group" key={group.label}>
                  <p>{group.label}</p>
                  <div className="project-stack-items">
                    {group.items.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="project-back-metrics">
              <div>
                <span className="project-metric-label">Complexity</span>
                <ComplexityRating value={project.complexity} />
              </div>
              <div>
                <span className="project-metric-label">Delivery window</span>
                <p className="project-comparison-summary">{project.comparisonSummary}</p>
              </div>
            </div>
            <div className="project-card-actions">
              <ProjectPrimaryAction project={project} />
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  <Github size={16} /> Code
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DiscordProjectCard({
  project,
  isStackOpen,
  onFlip,
  galleryIndex,
  onGalleryChange,
}: {
  project: ProjectShowcaseItem;
  isStackOpen: boolean;
  onFlip: (projectId: string) => void;
  galleryIndex: number;
  onGalleryChange: (projectId: string, nextIndex: number) => void;
}) {
  const [activeDetailTab, setActiveDetailTab] = useState<ProjectDetailTab | null>(null);
  const detailButtons = getProjectDetailButtons(project);
  const detailPanel = renderProjectDetailPanel(
    project,
    activeDetailTab,
    galleryIndex,
    onGalleryChange,
  );

  return (
    <article id={`project-discord-${project.id}`} className="discord-project-post">
      <div className={`discord-project-avatar ${project.type.toLowerCase()}`}>
        {getProjectInitials(project.title)}
      </div>
      <div className="discord-project-body">
        <div className="discord-project-header">
          <div className="discord-project-heading">
            <strong>{project.title}</strong>
            <span className="discord-project-handle">{project.type}</span>
            <span className="discord-project-time">{project.date}</span>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <p className="discord-project-tagline">{project.tagline}</p>
        <p className="discord-project-copy">{project.desc}</p>

        <div className="discord-project-metrics">
          <span className="discord-project-metric">
            <Clock3 size={14} />
            {project.estimatedTime}
          </span>
          <span className="discord-project-metric">
            <span>Complexity</span>
            <ComplexityRating value={project.complexity} compact />
          </span>
          <span className="discord-project-metric discord-project-metric-wide">
            <ContributionInline contributions={project.contributions} />
          </span>
        </div>

        <ExpandableTags
          key={project.id}
          tags={project.tags}
          className="discord-project-tags"
          visibleCount={4}
        />

        <div className="discord-project-actions">
          <button
            type="button"
            className={`discord-action-btn ${isStackOpen ? "active" : ""}`}
            onClick={() => onFlip(project.id)}
          >
            <Code2 size={16} />
            {isStackOpen ? "Hide tech stack" : "Open tech stack"}
          </button>
          <ProjectPrimaryAction project={project} />
          {project.repoUrl && (
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              <Github size={16} /> Code
            </a>
          )}
        </div>

        {isStackOpen && (
          <div className="discord-project-attachment">
            <div className="discord-project-attachment-head">
              <span className="discord-project-attachment-label">
                <Code2 size={14} />
                Tech stack
              </span>
              <span className="discord-project-attachment-summary">{project.comparisonSummary}</span>
            </div>
            <div className="discord-project-stack-groups">
              {project.stackGroups.map((group) => (
                <div className="project-stack-group" key={group.label}>
                  <p>{group.label}</p>
                  <div className="project-stack-items">
                    {group.items.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="discord-project-detail-tabs" role="group" aria-label={`${project.title} project details`}>
          {detailButtons.map((button) => {
            const isActive = activeDetailTab === button.id;

            return (
              <button
                key={button.id}
                type="button"
                className={`project-detail-tab ${isActive ? "active" : ""}`}
                aria-pressed={isActive}
                aria-controls={`project-discord-detail-panel-${project.id}-${button.id}`}
                onClick={() =>
                  setActiveDetailTab((currentTab) => (currentTab === button.id ? null : button.id))
                }
              >
                <span className="project-detail-tab-label">{button.label}</span>
                <span className="project-detail-tab-meta">{button.meta}</span>
              </button>
            );
          })}
        </div>

        {activeDetailTab && (
          <div
            id={`project-discord-detail-panel-${project.id}-${activeDetailTab}`}
            className="project-detail-panel discord-project-detail-panel"
            role="region"
            aria-label={`${project.title} ${activeDetailTab} details`}
          >
            {detailPanel}
          </div>
        )}
      </div>
    </article>
  );
}

function ComparisonTable({ projects }: { projects: ProjectShowcaseItem[] }) {
  return (
    <div className="project-table-shell">
      <table className="project-comparison-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Complexity</th>
            <th>Build Time</th>
            <th>Contribution</th>
            <th>Summary</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <div className="project-table-title">
                  <strong>{project.title}</strong>
                  <span>{project.date}</span>
                </div>
              </td>
              <td><StatusBadge status={project.status} /></td>
              <td><ComplexityRating value={project.complexity} compact /></td>
              <td>{project.estimatedTime}</td>
              <td><ContributionBreakdown contributions={project.contributions} variant="compact" /></td>
              <td>{project.comparisonSummary}</td>
              <td>
                <div className="project-table-actions">
                  <ProjectPrimaryAction project={project} />
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      <Github size={16} /> Code
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectTimeline({ projects }: { projects: ProjectShowcaseItem[] }) {
  const timelineMonths = useMemo(() => {
    if (projects.length === 0) {
      return [];
    }

    const minMonth = Math.min(...projects.map((project) => toMonthNumber(project.startMonth)));
    const maxMonth = Math.max(...projects.map((project) => toMonthNumber(project.endMonth)));
    const months: string[] = [];

    for (let month = minMonth; month <= maxMonth; month += 1) {
      const year = Math.floor(month / 12);
      const monthNumber = (month % 12) + 1;
      months.push(`${year}-${String(monthNumber).padStart(2, "0")}`);
    }

    return months;
  }, [projects]);

  return (
    <div className="project-timeline-shell">
      <div className="project-timeline-scroll">
        <div className="project-timeline-grid">
          <div className="project-timeline-header">
            <div className="project-timeline-label-cell">Project timeline</div>
            <div
              className="project-timeline-months"
              style={{ gridTemplateColumns: `repeat(${timelineMonths.length}, minmax(92px, 1fr))` }}
            >
              {timelineMonths.map((month) => (
                <span key={month}>{formatMonth(month)}</span>
              ))}
            </div>
          </div>

          {projects.map((project) => {
            const startIndex = timelineMonths.indexOf(project.startMonth);
            const endIndex = timelineMonths.indexOf(project.endMonth);
            const width = endIndex - startIndex + 1;

            return (
              <div className="project-timeline-row" key={project.id}>
                <div className="project-timeline-meta">
                  <div>
                    <strong>{project.title}</strong>
                    <span>{project.estimatedTime}</span>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <div
                  className="project-timeline-track"
                  style={{ gridTemplateColumns: `repeat(${timelineMonths.length}, minmax(92px, 1fr))` }}
                >
                  {timelineMonths.map((month) => (
                    <span key={`${project.id}-${month}`} className="project-timeline-cell" />
                  ))}
                  <div
                    className={`project-timeline-bar status-${project.status.toLowerCase().replace(/\s+/g, "-")}`}
                    style={{ gridColumn: `${startIndex + 1} / span ${width}` } as CSSProperties}
                  >
                    <span>{project.tagline}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { projects, loading } = usePublicSiteProjects();
  const { projectsLayout } = useTheme();
  const [activeFilter, setActiveFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<ProjectSortMode>("newest");
  const [viewMode, setViewMode] = useState<ProjectViewMode>("cards");
  const [flippedProjectId, setFlippedProjectId] = useState<string | null>(null);
  const [galleryIndexes, setGalleryIndexes] = useState<GalleryIndexMap>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(search);
  const discordMode = projectsLayout === "discord";
  const projectCategories = useMemo(
    () => ["All", ...new Set(projects.map((project) => project.category))],
    [projects],
  );
  const projectTypeFilters = useMemo(
    () => ["All Types", ...new Set(projects.map((project) => project.type))],
    [projects],
  );
  const projectDateFilters = useMemo(
    () => [
      "All Dates",
      ...new Set(
        projects
          .map((project) => Math.floor(project.sortDate / 100).toString())
          .sort((left, right) => Number(right) - Number(left)),
      ),
    ],
    [projects],
  );

  useEffect(() => {
    if (!projectCategories.includes(activeFilter)) {
      setActiveFilter("All");
    }

    if (!projectTypeFilters.includes(typeFilter)) {
      setTypeFilter("All Types");
    }

    if (!projectDateFilters.includes(dateFilter)) {
      setDateFilter("All Dates");
    }
  }, [activeFilter, dateFilter, projectCategories, projectDateFilters, projectTypeFilters, typeFilter]);

  const filteredProjects = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    let result = projects.filter((project) => {
      if (!query) {
        return true;
      }

      return [
        project.title,
        project.tagline,
        project.desc,
        project.comparisonSummary,
        project.tags.join(" "),
        project.learned.join(" "),
        project.stackGroups.flatMap((group) => group.items).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    if (activeFilter !== "All") {
      result = result.filter((project) => project.category === activeFilter);
    }

    if (typeFilter !== "All Types") {
      result = result.filter((project) => project.type === typeFilter);
    }

    if (dateFilter !== "All Dates") {
      result = result.filter(
        (project) =>
          project.date.includes(dateFilter) ||
          Math.floor(project.sortDate / 100).toString() === dateFilter,
      );
    }

    const sorted = [...result];

    switch (sortMode) {
      case "alphabetical":
        sorted.sort((left, right) => left.title.localeCompare(right.title));
        break;
      case "complexity":
        sorted.sort(
          (left, right) =>
            right.complexity - left.complexity || right.sortDate - left.sortDate,
        );
        break;
      case "newest":
      default:
        sorted.sort((left, right) => right.sortDate - left.sortDate);
        break;
    }

      return sorted;
  }, [activeFilter, dateFilter, deferredSearch, projects, sortMode, typeFilter]);

  const hasMatches = filteredProjects.length > 0;
  const spotlightProject =
    (hasMatches
      ? filteredProjects.find((project) => project.featured) ?? filteredProjects[0]
      : projects.find((project) => project.featured) ?? projects[0]) ?? null;
  const visibleFlippedProjectId =
    viewMode === "cards" &&
    filteredProjects.some((project) => project.id === flippedProjectId)
      ? flippedProjectId
      : null;
  const summaryCounts = {
    shown: filteredProjects.length,
    completed: filteredProjects.filter((project) => project.status === "Completed").length,
    active: filteredProjects.filter((project) => project.status === "In Progress").length,
  };
  const activeChannelLabel =
    viewMode === "cards"
      ? "project-feed"
      : viewMode === "table"
        ? "compare-view"
        : "timeline-view";

  const updateGalleryIndex = (projectId: string, nextIndex: number) => {
    setGalleryIndexes((currentIndexes) => ({
      ...currentIndexes,
      [projectId]: nextIndex,
    }));
  };

  const clearSearch = () => {
    setSearch("");
    setFlippedProjectId(null);
    inputRef.current?.focus();
  };

  const resetFilters = () => {
    setSearch("");
    setActiveFilter("All");
    setTypeFilter("All Types");
    setDateFilter("All Dates");
    setSortMode("newest");
    setViewMode("cards");
    setFlippedProjectId(null);
      inputRef.current?.focus();
    };

    const hasProjects = projects.length > 0;

    return (
      <section className={`projects section ${discordMode ? "discord-mode" : ""}`}>
        <div className="container">
        <div className="projects-header">
          <div className="projects-title-copy">
            <p className="section-label">Browse My Work</p>
            <h2 className="section-title">Projects</h2>
            <p className="projects-subtitle">
              Browse the standard showcase, or use the theme customizer to switch this
              page into a Discord-style project hub with a server rail, channels, and a
                feed-based layout.
              </p>
            </div>
          </div>

          {loading && !hasProjects ? (
            <div className="project-empty card">
              <p className="project-empty-label">Loading projects</p>
              <h3>Pulling the latest CMS-backed project list.</h3>
              <p>The page will fall back safely if Firestore content is unavailable.</p>
            </div>
          ) : null}

          {hasProjects && spotlightProject && discordMode ? (
            <div className="projects-discord-shell">
            <aside className="projects-discord-rail" aria-label="Project categories">
              {projectCategories.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`projects-discord-server ${activeFilter === filter ? "active" : ""}`}
                  title={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setFlippedProjectId(null);
                  }}
                >
                  {filter === "All" ? "ALL" : filter === "JavaScript" ? "JS" : filter.charAt(0)}
                </button>
              ))}
            </aside>

            <aside className="projects-discord-sidebar">
              <div className="projects-discord-sidebar-head">
                <strong>Project Hub</strong>
                <span>@laureesh</span>
              </div>

              <div className="projects-discord-sidebar-group">
                <p>Channels</p>
                {[
                  ["cards", "project-feed"],
                  ["table", "compare-view"],
                  ["timeline", "timeline-view"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`projects-discord-channel ${viewMode === value ? "active" : ""}`}
                    onClick={() => {
                      setViewMode(value as ProjectViewMode);
                      setFlippedProjectId(null);
                    }}
                  >
                    #{label}
                  </button>
                ))}
              </div>

              <div className="projects-discord-sidebar-group">
                <p>Type</p>
                <div className="projects-discord-filter-list">
                  {projectTypeFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`projects-discord-filter ${typeFilter === filter ? "active" : ""}`}
                      onClick={() => {
                        setTypeFilter(filter);
                        setFlippedProjectId(null);
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="projects-discord-sidebar-group">
                <p>Date</p>
                <div className="projects-discord-filter-list">
                  {projectDateFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`projects-discord-filter ${dateFilter === filter ? "active" : ""}`}
                      onClick={() => {
                        setDateFilter(filter);
                        setFlippedProjectId(null);
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="projects-discord-sidebar-group">
                <p>Sort</p>
                <div className="projects-discord-filter-list">
                  {[
                    ["newest", "Newest"],
                    ["alphabetical", "A-Z"],
                    ["complexity", "Complex"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`projects-discord-filter ${sortMode === value ? "active" : ""}`}
                      onClick={() => setSortMode(value as ProjectSortMode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="projects-discord-sidebar-footer">
                <div className="projects-discord-presence">
                  <span className="projects-discord-presence-dot" />
                  {summaryCounts.active} active project{summaryCounts.active === 1 ? "" : "s"}
                </div>
                <button type="button" className="projects-discord-reset" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            </aside>

            <div className="projects-discord-main">
              <div className="projects-discord-topbar">
                <div className="projects-discord-channel-title">
                  <strong>#{activeChannelLabel}</strong>
                  <span>{activeFilter}</span>
                </div>
                <div className="projects-discord-topbar-meta">
                  <span>{summaryCounts.shown} shown</span>
                  <span>{summaryCounts.completed} completed</span>
                </div>
              </div>

              <div className="projects-discord-searchrow">
                <div className="project-search">
                  <Search size={16} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search projects..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setFlippedProjectId(null);
                    }}
                  />
                  {search && (
                    <button
                      type="button"
                      className="project-search-clear"
                      aria-label="Clear project search"
                      onClick={clearSearch}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="projects-discord-active-filters">
                  {activeFilter !== "All" && <span>{activeFilter}</span>}
                  {typeFilter !== "All Types" && <span>{typeFilter}</span>}
                  {dateFilter !== "All Dates" && <span>{dateFilter}</span>}
                  {search && <span>Search: {search}</span>}
                </div>
              </div>

              <section className="discord-spotlight-post">
                <div className="discord-project-avatar spotlight">
                  <Sparkles size={18} />
                </div>
                <div className="discord-project-body">
                  <div className="discord-project-header">
                    <div className="discord-project-heading">
                      <strong># featured-project</strong>
                      <span className="discord-project-handle">{spotlightProject.title}</span>
                      <span className="discord-project-time">{spotlightProject.date}</span>
                    </div>
                    <StatusBadge status={spotlightProject.status} />
                  </div>

                  <h3 className="discord-spotlight-title">{spotlightProject.title}</h3>
                  <p className="discord-project-copy">{spotlightProject.desc}</p>

                  <div className="discord-project-metrics">
                    <span className="discord-project-metric">
                      <Clock3 size={14} />
                      {spotlightProject.estimatedTime}
                    </span>
                    <span className="discord-project-metric">
                      <span>Complexity</span>
                      <ComplexityRating value={spotlightProject.complexity} compact />
                    </span>
                    <span className="discord-project-metric discord-project-metric-wide">
                      <ContributionInline contributions={spotlightProject.contributions} />
                    </span>
                  </div>

                  <ExpandableTags
                    key={spotlightProject.id}
                    tags={spotlightProject.tags}
                    className="discord-project-tags"
                    visibleCount={5}
                  />

                  <div className="discord-project-actions">
                    <ProjectPrimaryAction project={spotlightProject} />
                    {spotlightProject.repoUrl && (
                      <a
                        href={spotlightProject.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                      >
                        <Github size={16} /> Repository
                      </a>
                    )}
                  </div>
                </div>
              </section>

              <div className="project-summary-strip projects-discord-summary">
                <span>{summaryCounts.shown} projects shown</span>
                <span>{summaryCounts.completed} completed</span>
                <span>{summaryCounts.active} active</span>
              </div>

              {hasMatches && viewMode === "cards" && (
                <div className="projects-discord-feed">
                  {filteredProjects.map((project) => (
                    <DiscordProjectCard
                      key={project.id}
                      project={project}
                      isStackOpen={visibleFlippedProjectId === project.id}
                      onFlip={(projectId) =>
                        setFlippedProjectId((currentId) => (currentId === projectId ? null : projectId))
                      }
                      galleryIndex={galleryIndexes[project.id] ?? 0}
                      onGalleryChange={updateGalleryIndex}
                    />
                  ))}
                </div>
              )}

              {hasMatches && viewMode === "table" && (
                <div className="projects-discord-panel">
                  <ComparisonTable projects={filteredProjects} />
                </div>
              )}

              {hasMatches && viewMode === "timeline" && (
                <div className="projects-discord-panel">
                  <ProjectTimeline projects={filteredProjects} />
                </div>
              )}

              {!hasMatches && (
                <div className="project-empty card projects-discord-empty">
                  <p className="project-empty-label">No matching projects</p>
                  <h3>Nothing fits the current search and filters.</h3>
                  <p>Try a broader search or reset the filters to get back to the full project list.</p>
                  <button type="button" className="btn btn-outline" onClick={resetFilters}>
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
          ) : hasProjects && spotlightProject ? (
          <>
            <section className="project-spotlight card">
              <div className="project-spotlight-copy">
                <span className="project-spotlight-label">
                  <Sparkles size={16} /> Featured project
                </span>
                <h3>{spotlightProject.title}</h3>
                <p>{spotlightProject.desc}</p>
                <div className="project-spotlight-stats">
                  <div>
                    <span>Complexity</span>
                    <ComplexityRating value={spotlightProject.complexity} compact />
                  </div>
                  <div>
                    <span>Build time</span>
                    <strong>{spotlightProject.estimatedTime}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <StatusBadge status={spotlightProject.status} />
                  </div>
                </div>
                <ExpandableTags
                  key={spotlightProject.id}
                  tags={spotlightProject.tags}
                  className="project-spotlight-tags"
                />
                <div className="project-spotlight-actions">
                  <ProjectPrimaryAction project={spotlightProject} />
                  {spotlightProject.repoUrl && (
                    <a
                      href={spotlightProject.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      <Github size={18} /> View Repository
                    </a>
                  )}
                </div>
              </div>
              <div className="project-spotlight-panel">
                <div className="project-spotlight-panel-head">
                  <span>{spotlightProject.effortLabel ?? "Contribution breakdown"}</span>
                  <strong>{spotlightProject.type}</strong>
                </div>
                <ContributionBreakdown
                  contributions={spotlightProject.contributions}
                  variant="card"
                  label={spotlightProject.effortNote ? "Effort split" : spotlightProject.effortLabel}
                />
                <div className="project-spotlight-note">
                  <strong>Why this one:</strong> {spotlightProject.comparisonSummary}
                </div>
              </div>
            </section>

            <div className="project-toolbar">
              <div className="project-search">
                <Search size={16} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setFlippedProjectId(null);
                  }}
                />
                {search && (
                  <button
                    type="button"
                    className="project-search-clear"
                    aria-label="Clear project search"
                    onClick={clearSearch}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="project-toolbar-group">
                <div className="project-control-group">
                  <span><ArrowUpDown size={14} /> Sort</span>
                  <div className="project-toggle-row">
                    {[
                      ["newest", "Newest"],
                      ["alphabetical", "A-Z"],
                      ["complexity", "Most Complex"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`project-toggle-btn ${sortMode === value ? "active" : ""}`}
                        onClick={() => setSortMode(value as ProjectSortMode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="project-control-group">
                  <span>View</span>
                  <div className="project-toggle-row">
                    {[
                      ["cards", "Cards"],
                      ["table", "Compare"],
                      ["timeline", "Timeline"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`project-toggle-btn ${viewMode === value ? "active" : ""}`}
                        onClick={() => {
                          setViewMode(value as ProjectViewMode);
                          setFlippedProjectId(null);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="project-filters">
              <div className="filter-group">
                {projectCategories.map((filter) => (
                  <button
                    key={filter}
                    className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                    onClick={() => {
                      setActiveFilter(filter);
                      setFlippedProjectId(null);
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="filter-group">
                {projectTypeFilters.map((filter) => (
                  <button
                    key={filter}
                    className={`filter-btn ${typeFilter === filter ? "active" : ""}`}
                    onClick={() => {
                      setTypeFilter(filter);
                      setFlippedProjectId(null);
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="filter-group">
                {projectDateFilters.map((filter) => (
                  <button
                    key={filter}
                    className={`filter-btn ${dateFilter === filter ? "active" : ""}`}
                    onClick={() => {
                      setDateFilter(filter);
                      setFlippedProjectId(null);
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="project-summary-strip">
              <span>{summaryCounts.shown} projects shown</span>
              <span>{summaryCounts.completed} completed</span>
              <span>{summaryCounts.active} active</span>
            </div>

            {hasMatches && viewMode === "cards" && (
              <div className="projects-grid">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isFlipped={visibleFlippedProjectId === project.id}
                    onFlip={(projectId) =>
                      setFlippedProjectId((currentId) => (currentId === projectId ? null : projectId))
                    }
                    galleryIndex={galleryIndexes[project.id] ?? 0}
                    onGalleryChange={updateGalleryIndex}
                  />
                ))}
              </div>
            )}

            {hasMatches && viewMode === "table" && <ComparisonTable projects={filteredProjects} />}

            {hasMatches && viewMode === "timeline" && <ProjectTimeline projects={filteredProjects} />}

            {!hasMatches && (
              <div className="project-empty card">
                <p className="project-empty-label">No matching projects</p>
                <h3>Nothing fits the current search and filters.</h3>
                <p>Try a broader search or reset the filters to get back to the full project list.</p>
                <button type="button" className="btn btn-outline" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            )}
          </>
          ) : (
            <div className="project-empty card">
              <p className="project-empty-label">No projects available</p>
              <h3>The project showcase is empty right now.</h3>
              <p>Add or import site projects from the admin content module to populate this page.</p>
            </div>
          )}
        </div>
      </section>
    );
}
