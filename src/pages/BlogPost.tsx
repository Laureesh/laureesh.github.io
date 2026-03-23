import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, Clock, ExternalLink, Layers3 } from "lucide-react";
import BlogCodeBlock from "../components/BlogCodeBlock";
import BlogNewsletterSignup from "../components/BlogNewsletterSignup";
import BlogReactions from "../components/BlogReactions";
import BlogShareButtons from "../components/BlogShareButtons";
import { usePublicBlogPosts } from "../hooks/useContentCatalog";
import NotFound from "./NotFound";
import {
  formatResolvedBlogDate,
  getResolvedBlogPostPath,
  getResolvedBlogPostUrl,
  getResolvedRelatedBlogPosts,
} from "../services/cmsContent";
import toSectionId from "../utils/toSectionId";
import "./Blog.css";

export default function BlogPost() {
  const { slug } = useParams();
  const { posts, loading } = usePublicBlogPosts();
  const resolvedPost = posts.find((entry) => entry.slug === slug) ?? null;
  const post =
    resolvedPost && (resolvedPost.sections?.length || resolvedPost.intro?.length || resolvedPost.closing)
      ? resolvedPost
      : null;
  const seriesPosts = useMemo(() => {
    if (!post?.series?.slug) {
      return [];
    }

    return posts
      .filter((entry) => entry.series?.slug === post.series?.slug)
      .sort((a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0));
  }, [post, posts]);
  const relatedPosts = post ? getResolvedRelatedBlogPosts(post, posts, 3) : [];
  const articleSections = [
    { id: "post-overview", label: "Overview" },
    ...((post?.sections ?? []).map((section) => ({
      id: toSectionId(section.heading),
      label: section.heading,
    }))),
    ...(post?.closing ? [{ id: "post-wrap-up", label: "Wrap up" }] : []),
  ];
  const [activeSectionId, setActiveSectionId] = useState(articleSections[0]?.id ?? "");
  const currentSeriesIndex = post
    ? seriesPosts.findIndex((entry) => entry.slug === post.slug)
    : -1;
  const previousInSeries = currentSeriesIndex > 0 ? seriesPosts[currentSeriesIndex - 1] : null;
  const nextInSeries =
    currentSeriesIndex >= 0 && currentSeriesIndex < seriesPosts.length - 1
      ? seriesPosts[currentSeriesIndex + 1]
      : null;

  useEffect(() => {
    const sections = [
      { id: "post-overview", label: "Overview" },
      ...((post?.sections ?? []).map((section) => ({
        id: toSectionId(section.heading),
        label: section.heading,
      }))),
      ...(post?.closing ? [{ id: "post-wrap-up", label: "Wrap up" }] : []),
    ];

    const updateActiveSection = () => {
      let nextActive = sections[0]?.id ?? "";

      for (const section of sections) {
        const element = document.getElementById(section.id);

        if (!element) {
          continue;
        }

        if (element.getBoundingClientRect().top <= 170) {
          nextActive = section.id;
        }
      }

      setActiveSectionId(nextActive);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [post]);

  if (loading && !resolvedPost) {
    return (
      <section className="blog section">
        <div className="container">
          <div className="blog-note">Loading post...</div>
        </div>
      </section>
    );
  }

  if (!post) {
    return <NotFound />;
  }

  return (
    <article className="blog-post section">
      <div className="container blog-post-shell">
        <Link to="/blog" className="blog-post-back">
          <ArrowLeft size={16} />
          Back to blog
        </Link>

        <header id="post-overview" className="blog-post-hero section-anchor">
          {post.series ? (
            <div className="blog-post-series-banner">
              <div>
                <p className="blog-surface-label">
                  <Layers3 size={14} />
                  Series
                </p>
                <strong>{post.series.title}</strong>
                <span>
                  Part {currentSeriesIndex + 1} of {seriesPosts.length}
                </span>
              </div>
              <p>{post.series.description}</p>
            </div>
          ) : null}
          <div className="blog-meta blog-post-meta">
            <span>
              <Calendar size={14} /> {formatResolvedBlogDate(post.date)}
            </span>
            <span>
              <Clock size={14} /> {post.readTime}
            </span>
            <span>{post.popularity} popularity</span>
          </div>
          <h1 className="blog-post-title">{post.title}</h1>
          <p className="blog-post-excerpt">{post.excerpt}</p>
          <div className="blog-tags">
            {post.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="blog-post-layout">
          <aside className="blog-post-sidebar">
            <nav className="card blog-post-toc" aria-label="Table of contents">
              <div>
                <p className="blog-surface-label">Table of contents</p>
                <h3>Jump through the post.</h3>
              </div>
              <div className="blog-post-toc-links">
                {articleSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`blog-post-toc-link ${
                      activeSectionId === section.id ? "active" : ""
                    }`}
                  >
                    {section.label}
                  </a>
                ))}
              </div>
            </nav>

            <BlogShareButtons title={post.title} url={getResolvedBlogPostUrl(post)} />
            <BlogNewsletterSignup compact />
          </aside>

          <div className="blog-post-main">
            <div className="blog-post-body">
              {post.intro?.length ? (
                <section className="card blog-post-section">
                  {post.intro.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ) : null}

              {(post.sections ?? []).map((section) => (
                <section
                  id={toSectionId(section.heading)}
                  className="card blog-post-section section-anchor"
                  key={section.heading}
                >
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets?.length ? (
                    <ul className="blog-post-list">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.codeBlocks?.map((block) => (
                    <BlogCodeBlock key={`${section.heading}-${block.label}`} block={block} />
                  ))}
                </section>
              ))}

              {post.closing ? (
                <section
                  id="post-wrap-up"
                  className="card blog-post-section blog-post-closing section-anchor"
                >
                  <h2>Wrap up</h2>
                  <p>{post.closing}</p>
                </section>
              ) : null}
            </div>

            {post.series && seriesPosts.length > 1 ? (
              <section className="card blog-series-nav">
                <div className="blog-surface-label">
                  <Layers3 size={14} />
                  Series navigation
                </div>
                <h2>{post.series.title}</h2>
                <p>{post.series.description}</p>
                <div className="blog-series-nav-links">
                  {previousInSeries ? (
                    <Link to={getResolvedBlogPostPath(previousInSeries.slug)} className="blog-series-nav-link">
                      <span>Previous</span>
                      <strong>{previousInSeries.title}</strong>
                    </Link>
                  ) : (
                    <div className="blog-series-nav-link muted">
                      <span>Previous</span>
                      <strong>Start of series</strong>
                    </div>
                  )}
                  {nextInSeries ? (
                    <Link to={getResolvedBlogPostPath(nextInSeries.slug)} className="blog-series-nav-link">
                      <span>Next</span>
                      <strong>{nextInSeries.title}</strong>
                    </Link>
                  ) : (
                    <div className="blog-series-nav-link muted">
                      <span>Next</span>
                      <strong>End of series</strong>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <BlogReactions slug={post.slug} seeds={post.reactionSeeds} />

            <section className="card blog-post-cta">
              <div>
                <p className="blog-post-cta-label">Related posts</p>
                <h2>Keep reading</h2>
              </div>
              <div className="blog-post-cta-links">
                {relatedPosts.map((candidate) =>
                  candidate.externalUrl ? (
                    <a
                      key={candidate.slug}
                      href={candidate.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="blog-post-inline-link"
                    >
                      <div>
                        <span>{candidate.title}</span>
                        <small>{candidate.readTime}</small>
                      </div>
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <Link
                      key={candidate.slug}
                      to={getResolvedBlogPostPath(candidate.slug)}
                      className="blog-post-inline-link"
                    >
                      <div>
                        <span>{candidate.title}</span>
                        <small>{candidate.readTime}</small>
                      </div>
                      <ArrowRight size={16} />
                    </Link>
                  ),
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
