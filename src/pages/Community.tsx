import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, ExternalLink, Search, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getPortfolioRecord,
  listPortfolioProjects,
  listPublicPortfolioProjects,
  listPublicPortfolioRecords,
} from "../services/portfolios";
import type { PortfolioRecord, ProjectRecord, SkillArea } from "../types/models";
import "./Community.css";

const SKILL_AREA_OPTIONS: Array<{ value: "all" | SkillArea; label: string }> = [
  { value: "all", label: "All Areas" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Fullstack" },
  { value: "cloud", label: "Cloud" },
  { value: "data", label: "Data" },
  { value: "design", label: "Design" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest Users" },
] as const;

function getPortfolioSummary(portfolio: PortfolioRecord) {
  const about = portfolio.about.trim();
  const headline = portfolio.headline.trim();

  return about || headline || "This portfolio is still being filled out.";
}

function buildTopProjectMap(portfolios: PortfolioRecord[], projects: ProjectRecord[]) {
  const map = new Map<string, ProjectRecord>();
  const projectsByOwner = new Map<string, ProjectRecord[]>();

  for (const project of projects) {
    if (!project.ownerId) {
      continue;
    }

    projectsByOwner.set(project.ownerId, [...(projectsByOwner.get(project.ownerId) ?? []), project]);
  }

  for (const portfolio of portfolios) {
    const ownerProjects = projectsByOwner.get(portfolio.userId) ?? [];

    if (!ownerProjects.length) {
      continue;
    }

    const featured = ownerProjects.find((project) => project.id === portfolio.featuredProjectId);
    map.set(portfolio.userId, featured ?? ownerProjects[0]);
  }

  return map;
}

export default function Community() {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<PortfolioRecord[]>([]);
  const [topProjects, setTopProjects] = useState<Map<string, ProjectRecord>>(new Map());
  const [search, setSearch] = useState("");
  const [skillArea, setSkillArea] = useState<"all" | SkillArea>("all");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>("popular");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectsWarning, setProjectsWarning] = useState<string | null>(null);
  const [hubWarning, setHubWarning] = useState<string | null>(null);

  useEffect(() => {
    const loadCommunity = async () => {
      setLoading(true);
      setError(null);
      setHubWarning(null);

      try {
        const [portfolioResult, projectsResult] = await Promise.allSettled([
          listPublicPortfolioRecords(),
          listPublicPortfolioProjects(),
        ]);

        let portfolioRecords: PortfolioRecord[] = [];

        if (portfolioResult.status === "fulfilled") {
          portfolioRecords = portfolioResult.value;
        } else if (user) {
          const ownPortfolio = await getPortfolioRecord(user.uid);

          if (ownPortfolio?.isPublic) {
            portfolioRecords = [ownPortfolio];
            setHubWarning("Public portfolio browsing is still blocked by live Firestore rules, so only your own public portfolio is showing right now.");
          } else {
            throw new Error("Unable to load public portfolios right now.");
          }
        } else {
          throw new Error("Unable to load public portfolios right now.");
        }

        let projectRecords: ProjectRecord[] = [];

        if (projectsResult.status === "fulfilled") {
          projectRecords = projectsResult.value;
        } else if (user) {
          const ownProjects = await listPortfolioProjects(user.uid);
          projectRecords = ownProjects.filter((project) => project.visibility === "public");
        }

        setPortfolios(portfolioRecords);
        setTopProjects(buildTopProjectMap(portfolioRecords, projectRecords));

        if (projectsResult.status !== "fulfilled") {
          setProjectsWarning("Public project previews could not be loaded yet. Publish the latest Firestore indexes and try again.");
        } else {
          setProjectsWarning(null);
        }
      } catch {
        setError("Unable to load the shared portfolio hub right now.");
      } finally {
        setLoading(false);
      }
    };

    void loadCommunity();
  }, [user]);

  const filteredPortfolios = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const nextPortfolios = portfolios.filter((portfolio) => {
      if (!portfolio.isPublic) {
        return false;
      }

      if (skillArea !== "all" && !portfolio.skillAreas.includes(skillArea)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const topProject = topProjects.get(portfolio.userId);
      const haystack = [
        portfolio.displayName,
        portfolio.username,
        portfolio.headline,
        portfolio.about,
        portfolio.skills.join(" "),
        topProject?.title,
        topProject?.description,
        topProject?.techStack.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return [...nextPortfolios].sort((a, b) => {
      if (sortBy === "newest") {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }

      return b.communityScore - a.communityScore;
    });
  }, [portfolios, search, skillArea, sortBy, topProjects]);

  return (
    <section className="community-page">
      <div className="community-hero">
        <div>
          <span className="community-eyebrow">Members Only</span>
          <h1>Shared Portfolio Hub</h1>
          <p>Browse public member portfolios, search by stack, and jump straight into the projects people are showing off.</p>
        </div>
        <div className="community-hero-card">
          <Compass size={18} />
          <strong>{portfolios.length}</strong>
          <span>public portfolios synced</span>
        </div>
      </div>

      <div className="community-controls">
        <label className="community-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, username, tech, or project"
          />
        </label>

        <div className="community-control-group">
          {SKILL_AREA_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`community-filter-pill ${skillArea === option.value ? "is-active" : ""}`}
              onClick={() => setSkillArea(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="community-sort">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as (typeof SORT_OPTIONS)[number]["value"])}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="community-empty">Loading portfolios...</div>
      ) : error && portfolios.length === 0 ? (
        <div className="community-empty">{error}</div>
      ) : filteredPortfolios.length === 0 ? (
        <div className="community-empty">
          No public portfolios matched this search yet.
          {hubWarning ? <p className="community-warning-text">{hubWarning}</p> : null}
          {projectsWarning ? <p className="community-warning-text">{projectsWarning}</p> : null}
        </div>
      ) : (
        <>
          {hubWarning ? <p className="community-warning-text">{hubWarning}</p> : null}
          {projectsWarning ? <p className="community-warning-text">{projectsWarning}</p> : null}
          <div className="community-grid">
            {filteredPortfolios.map((portfolio) => {
              const topProject = topProjects.get(portfolio.userId) ?? null;

              return (
                <article key={portfolio.userId} className="community-card">
                  <div className="community-card-head">
                    {portfolio.photoURL ? (
                      <img
                        src={portfolio.photoURL}
                        alt=""
                        className="community-avatar"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="community-avatar community-avatar--initial">
                        {portfolio.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="community-card-copy">
                      <h2>{portfolio.displayName}</h2>
                      <p>{portfolio.username ? `@${portfolio.username}` : "Portfolio member"}</p>
                    </div>
                  </div>

                  <p className="community-summary">{getPortfolioSummary(portfolio)}</p>

                  <div className="community-meta-row">
                    {portfolio.skillAreas.map((area) => (
                      <span key={area} className="community-pill">{area}</span>
                    ))}
                    <span className="community-pill">{portfolio.projectCount} project{portfolio.projectCount === 1 ? "" : "s"}</span>
                  </div>

                  <div className="community-meta-row">
                    {portfolio.skills.slice(0, 5).map((skill) => (
                      <span key={skill} className="community-chip">{skill}</span>
                    ))}
                  </div>

                  {topProject ? (
                    <div className="community-top-project">
                      <div className="community-top-project-label">
                        <Sparkles size={14} />
                        <span>Top project</span>
                      </div>
                      <strong>{topProject.title}</strong>
                      <p>{topProject.description}</p>
                      <div className="community-meta-row">
                        {topProject.techStack.slice(0, 4).map((tech) => (
                          <span key={tech} className="community-chip community-chip--muted">{tech}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="community-card-actions">
                    <Link to={`/user/${portfolio.userId}`} className="community-link-button">
                      View Portfolio
                    </Link>
                    {topProject?.liveUrl ? (
                      <a href={topProject.liveUrl} target="_blank" rel="noreferrer" className="community-inline-link">
                        <ExternalLink size={14} />
                        Demo
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
