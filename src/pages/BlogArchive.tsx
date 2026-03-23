import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, Clock, ExternalLink } from "lucide-react";
import { usePublicBlogPosts } from "../hooks/useContentCatalog";
import {
  formatResolvedBlogDate,
  getResolvedArchiveGroups,
  getResolvedBlogPostPath,
} from "../services/cmsContent";
import "./Blog.css";

export default function BlogArchive() {
  const { posts, loading } = usePublicBlogPosts();
  const archiveGroups = getResolvedArchiveGroups(posts);

  return (
    <section className="blog section">
      <div className="container">
        <Link to="/blog" className="blog-post-back">
          <ArrowLeft size={16} />
          Back to blog
        </Link>

        <div className="blog-archive-hero">
          <p className="section-label">Archive</p>
          <h2 className="section-title">Blog Archive</h2>
          <p className="blog-intro">
            Every post grouped by month and year so older write-ups are still easy to find.
          </p>
        </div>

        {loading ? (
          <div className="blog-note">Loading archive...</div>
        ) : (
          <div className="blog-archive-years">
            {archiveGroups.map((yearGroup) => (
              <section className="blog-archive-year-block" key={yearGroup.year}>
                <div className="blog-archive-year-heading">
                  <h3>{yearGroup.year}</h3>
                </div>
                <div className="blog-archive-months">
                  {yearGroup.months.map((month) => (
                    <section className="card blog-archive-month-card" key={month.key}>
                      <div className="blog-archive-month-topline">
                        <h4>{month.label}</h4>
                        <span className="tag">{month.posts.length} posts</span>
                      </div>
                      <div className="blog-archive-post-list">
                        {month.posts.map((post) => (
                          <article className="blog-archive-post-row" key={post.slug}>
                            <div>
                              <div className="blog-meta">
                                <span>
                                  <Calendar size={14} /> {formatResolvedBlogDate(post.date)}
                                </span>
                                <span>
                                  <Clock size={14} /> {post.readTime}
                                </span>
                              </div>
                              <h5>{post.title}</h5>
                              <p>{post.excerpt}</p>
                              <div className="blog-archive-post-tags">
                                {post.series ? <span className="tag">{post.series.title}</span> : null}
                                {post.tags.slice(0, 3).map((tag) => (
                                  <span className="tag" key={tag}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {post.externalUrl ? (
                              <a
                                href={post.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="blog-read-more"
                              >
                                Read <ExternalLink size={16} />
                              </a>
                            ) : (
                              <Link to={getResolvedBlogPostPath(post.slug)} className="blog-read-more">
                                Read <ArrowRight size={16} />
                              </Link>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
