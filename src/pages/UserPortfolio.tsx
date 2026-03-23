import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, Github, Globe2, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getPortfolioRecord,
  listPortfolioProjects,
  listPublicPortfolioProjects,
} from "../services/portfolios";
import type { PortfolioRecord, ProjectRecord } from "../types/models";
import "./Community.css";

function socialLinkEntries(portfolio: PortfolioRecord) {
  return [
    { label: "Website", url: portfolio.socialLinks.website, icon: Globe2 },
    { label: "GitHub", url: portfolio.socialLinks.github, icon: Github },
    { label: "LinkedIn", url: portfolio.socialLinks.linkedin, icon: ExternalLink },
    { label: "X", url: portfolio.socialLinks.twitter, icon: ExternalLink },
    { label: "YouTube", url: portfolio.socialLinks.youtube, icon: ExternalLink },
  ].filter((item) => item.url);
}

export default function UserPortfolio() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioRecord | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectsWarning, setProjectsWarning] = useState<string | null>(null);
  const isOwnPortfolio = Boolean(user && id && user.uid === id);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("That member portfolio could not be found.");
      return;
    }

    const loadPortfolio = async () => {
      setLoading(true);
      setError(null);

      try {
        const record = await getPortfolioRecord(id);

        if (!record) {
          throw new Error("That member portfolio could not be found.");
        }

        if (!record.isPublic && !isOwnPortfolio) {
          throw new Error("This portfolio is private.");
        }

        let projectRecords: ProjectRecord[] = [];

        try {
          projectRecords = isOwnPortfolio
            ? await listPortfolioProjects(id)
            : (await listPublicPortfolioProjects()).filter((project) => project.ownerId === id);
          setProjectsWarning(null);
        } catch {
          setProjectsWarning("Projects could not be loaded yet. Publish the latest Firestore indexes and try again.");
        }

        setPortfolio(record);
        setProjects(projectRecords);
      } catch (nextError) {
        setPortfolio(null);
        setProjects([]);
        setError(nextError instanceof Error ? nextError.message : "Unable to load this portfolio right now.");
      } finally {
        setLoading(false);
      }
    };

    void loadPortfolio();
  }, [id, isOwnPortfolio]);

  const socialLinks = useMemo(() => (portfolio ? socialLinkEntries(portfolio) : []), [portfolio]);

  if (loading) {
    return <section className="community-page"><div className="community-empty">Loading portfolio...</div></section>;
  }

  if (!portfolio || error) {
    return (
      <section className="community-page">
        <div className="community-empty">
          {error ?? "That member portfolio could not be found."}
          <div className="community-card-actions">
            <Link to="/community" className="community-link-button">Back to Community</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="community-page community-profile-page">
      <div className="community-profile-hero">
        <div className="community-profile-main">
          {portfolio.photoURL ? (
            <img src={portfolio.photoURL} alt="" className="community-profile-avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="community-profile-avatar community-avatar--initial">
              {portfolio.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="community-profile-copy">
            <span className="community-eyebrow">{isOwnPortfolio ? "Your Portfolio" : "Member Portfolio"}</span>
            <h1>{portfolio.displayName}</h1>
            <p className="community-profile-handle">{portfolio.username ? `@${portfolio.username}` : "Portfolio member"}</p>
            <p className="community-profile-headline">{portfolio.headline}</p>
            {portfolio.about ? <p className="community-profile-about">{portfolio.about}</p> : null}

            <div className="community-meta-row">
              {portfolio.skillAreas.map((area) => (
                <span key={area} className="community-pill">{area}</span>
              ))}
              {!portfolio.isPublic && isOwnPortfolio ? (
                <span className="community-pill">
                  <Lock size={12} />
                  Private to others
                </span>
              ) : null}
            </div>

            <div className="community-meta-row">
              {portfolio.skills.map((skill) => (
                <span key={skill} className="community-chip">{skill}</span>
              ))}
            </div>

            {socialLinks.length ? (
              <div className="community-card-actions">
                {socialLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a key={item.label} href={item.url ?? "#"} target="_blank" rel="noreferrer" className="community-inline-link">
                      <Icon size={14} />
                      {item.label}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
        <div className="community-hero-card">
          <strong>{projects.length}</strong>
          <span>portfolio projects</span>
        </div>
      </div>

      <div className="community-section-head">
        <h2>Projects</h2>
        <p>{isOwnPortfolio ? "These are the projects attached to your portfolio record." : "Public projects attached to this member portfolio."}</p>
      </div>

      {projectsWarning ? <p className="community-warning-text">{projectsWarning}</p> : null}

      {projects.length === 0 ? (
        <div className="community-empty">No public projects are attached to this portfolio yet.</div>
      ) : (
        <div className="community-grid community-grid--projects">
          {projects.map((project) => (
            <article key={project.id} className="community-card community-card--project">
              <div className="community-card-head community-card-head--stacked">
                <div className="community-card-copy">
                  <h2>{project.title}</h2>
                  <p>{project.tagline}</p>
                </div>
              </div>
              <p className="community-summary">{project.description}</p>
              <div className="community-meta-row">
                {project.techStack.map((tech) => (
                  <span key={tech} className="community-chip">{tech}</span>
                ))}
              </div>
              {project.assets.length ? (
                <div className="community-project-images">
                  {project.assets.slice(0, 3).map((asset, index) => (
                    <div key={`${asset.path}-${index}`} className="community-project-image-card">
                      <img
                        src={asset.url ?? asset.path}
                        alt={asset.alt ?? `${project.title} screenshot ${index + 1}`}
                        referrerPolicy="no-referrer"
                        className="community-project-image"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="community-card-actions">
                {project.repoUrl ? (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer" className="community-inline-link">
                    <Github size={14} />
                    GitHub
                  </a>
                ) : null}
                {project.liveUrl ? (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" className="community-inline-link">
                    <ExternalLink size={14} />
                    Live demo
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
