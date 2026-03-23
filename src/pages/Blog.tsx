import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Calendar,
  Clock,
  Crown,
  ExternalLink,
  FolderKanban,
  LockKeyhole,
  PlusCircle,
  Radio,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import SectionNav from "../components/SectionNav";
import BlogNewsletterSignup from "../components/BlogNewsletterSignup";
import { useAuth } from "../contexts/AuthContext";
import { BLOG_RSS_PATH } from "../data/blogPosts";
import { premiumBriefings } from "../data/premiumBriefings";
import { usePublicBlogPosts } from "../hooks/useContentCatalog";
import {
  formatResolvedBlogDate,
  getResolvedArchiveGroups,
  getResolvedBlogPostPath,
  getResolvedPopularBlogPosts,
  getResolvedSeriesGroups,
  type ResolvedBlogPost,
} from "../services/cmsContent";
import { hasPlanAccess } from "../services/subscriptions";
import "./Blog.css";

const blogSections = [
  { id: "blog-browse", label: "Browse" },
  { id: "blog-popular", label: "Popular" },
  { id: "blog-premium", label: "Premium" },
  { id: "blog-collections", label: "Collections" },
  { id: "blog-newsletter", label: "Newsletter" },
  { id: "blog-archive", label: "Archive" },
];

function BlogPostCard({ post }: { post: ResolvedBlogPost }) {
  return (
    <article className="card blog-card">
      <div className="blog-meta">
        <span>
          <Calendar size={14} /> {formatResolvedBlogDate(post.date)}
        </span>
        <span>
          <Clock size={14} /> {post.readTime}
        </span>
      </div>
      <div className="blog-card-topline">
        {post.series && <span className="blog-card-series">{post.series.title}</span>}
        <span className="blog-card-popularity">{post.popularity} popularity</span>
      </div>
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
      <div className="blog-tags">
        {post.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      {post.externalUrl ? (
        <a href={post.externalUrl} target="_blank" rel="noreferrer" className="blog-read-more">
          Read on GitBook <ExternalLink size={16} />
        </a>
      ) : (
        <Link to={getResolvedBlogPostPath(post.slug)} className="blog-read-more">
          Read Post <ArrowRight size={16} />
        </Link>
      )}
    </article>
  );
}

export default function Blog() {
  const { posts, loading } = usePublicBlogPosts();
  const { isAdmin, subscriptionState } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(
    () => [...new Set(posts.flatMap((post) => post.tags))],
    [posts],
  );

  const popularPosts = useMemo(() => getResolvedPopularBlogPosts(posts, 3), [posts]);
  const seriesGroups = useMemo(() => getResolvedSeriesGroups(posts), [posts]);
  const archiveGroups = useMemo(() => getResolvedArchiveGroups(posts), [posts]);
  const archivePreview = useMemo(
    () =>
      archiveGroups.flatMap((year) =>
        year.months.map((month) => ({
          year: year.year,
          month,
        })),
      ),
    [archiveGroups],
  );

  const filtered = useMemo(() => {
    let result = posts;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          post.series?.title.toLowerCase().includes(query),
      );
    }

    if (activeTag !== "All") {
      result = result.filter((post) => post.tags.includes(activeTag));
    }

    return result;
  }, [activeTag, posts, search]);

  return (
    <section className="blog section">
      <div className="container">
        <div className="blog-hero">
          <div>
            <p className="section-label">Thoughts & Tutorials</p>
            <h2 className="section-title">Blog</h2>
            <p className="blog-intro">
              A mix of project notes, student-level technical write-ups, and a
              few posts about how I am growing into software development.
            </p>
          </div>
          <div className="blog-hero-actions">
            {isAdmin ? (
              <Link to="/admin-dashboard/content?section=blogs&mode=create" className="btn btn-primary">
                <PlusCircle size={16} />
                Add Post
              </Link>
            ) : null}
            <Link to="/blog/archive" className="btn btn-outline">
              <Archive size={16} />
              Archive
            </Link>
            <a href={BLOG_RSS_PATH} className="btn btn-outline" target="_blank" rel="noreferrer">
              <Radio size={16} />
              RSS Feed
            </a>
          </div>
        </div>

        <SectionNav sections={blogSections} stickyOffset={124} />

        <section id="blog-browse" className="blog-surface section-anchor">
          <div className="blog-surface-header">
            <div>
              <p className="blog-surface-label">
                <Sparkles size={14} />
                Browse Posts
              </p>
              <h3>Search, filter, and scan the full list.</h3>
            </div>
          </div>

          <div className="blog-search">
            <Search size={16} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search posts, tags, or series..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="blog-search-clear"
                aria-label="Clear blog search"
                onClick={() => {
                  setSearch("");
                  inputRef.current?.focus();
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="blog-tag-filters">
            <button
              type="button"
              className={`filter-btn ${activeTag === "All" ? "active" : ""}`}
              onClick={() => setActiveTag("All")}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`filter-btn ${activeTag === tag ? "active" : ""}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <p className="blog-results-count">
            Showing {filtered.length} {filtered.length === 1 ? "post" : "posts"}
          </p>

          {loading ? (
            <div className="blog-note">Loading the latest blog content...</div>
          ) : (
            <div className="blog-grid">
              {filtered.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </section>

        <section id="blog-popular" className="blog-surface section-anchor">
          <div className="blog-surface-header">
            <div>
              <p className="blog-surface-label">
                <Star size={14} />
                Most Popular
              </p>
              <h3>Posts readers would probably click first.</h3>
            </div>
            <Link to="/blog/archive" className="blog-inline-link">
              See full archive <ArrowRight size={16} />
            </Link>
          </div>
          <div className="blog-popular-grid">
            {popularPosts.map((post, index) => (
              <article className="card blog-popular-card" key={post.slug}>
                <span className="blog-popular-rank">0{index + 1}</span>
                <div className="blog-meta">
                  <span>
                    <Calendar size={14} /> {formatResolvedBlogDate(post.date)}
                  </span>
                  <span>
                    <Clock size={14} /> {post.readTime}
                  </span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="blog-tags">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                {post.externalUrl ? (
                  <a
                    href={post.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="blog-read-more"
                  >
                    Read on GitBook <ExternalLink size={16} />
                  </a>
                ) : (
                  <Link to={getResolvedBlogPostPath(post.slug)} className="blog-read-more">
                    Read Post <ArrowRight size={16} />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <section id="blog-premium" className="blog-surface section-anchor">
          <div className="blog-surface-header">
            <div>
              <p className="blog-surface-label">
                <Crown size={14} />
                Creator Briefings
              </p>
              <h3>Private build notes and premium operating write-ups.</h3>
            </div>
            <Link to="/blog/premium" className="blog-inline-link">
              Open premium hub <ArrowRight size={16} />
            </Link>
          </div>
          <div className="blog-grid">
            {premiumBriefings.map((briefing) => {
              const canRead = subscriptionState.isActive
                && hasPlanAccess(subscriptionState.planId, briefing.requiredPlan);

              return (
                <article className="card blog-card blog-premium-card" key={briefing.slug}>
                  <div className="blog-meta">
                    <span>
                      <Calendar size={14} /> {formatResolvedBlogDate(briefing.date)}
                    </span>
                    <span>
                      <Clock size={14} /> {briefing.readTime}
                    </span>
                  </div>
                  <div className="blog-card-topline">
                    <span className="blog-premium-pill">
                      {canRead ? <Crown size={13} /> : <LockKeyhole size={13} />}
                      {canRead ? "Unlocked" : "Creator+"}
                    </span>
                    <span className="blog-card-popularity">Members only</span>
                  </div>
                  <h3>{briefing.title}</h3>
                  <p>{briefing.excerpt}</p>
                  <div className="blog-tags">
                    {briefing.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link to={`/blog/premium/${briefing.slug}`} className="blog-read-more">
                    {canRead ? "Read briefing" : "Preview and unlock"} <ArrowRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section id="blog-collections" className="blog-surface section-anchor">
          <div className="blog-surface-header">
            <div>
              <p className="blog-surface-label">
                <FolderKanban size={14} />
                Collections
              </p>
              <h3>Series and grouped write-ups.</h3>
            </div>
          </div>
          <div className="blog-series-grid">
            {seriesGroups.map((group) => (
              <section className="card blog-series-card" key={group.series.slug}>
                <div className="blog-series-topline">
                  <div>
                    <h4>{group.series.title}</h4>
                    <p>{group.series.description}</p>
                  </div>
                  <span className="tag">{group.posts.length} posts</span>
                </div>
                <div className="blog-series-links">
                  {group.posts.map((post) =>
                    post.externalUrl ? (
                      <a
                        key={post.slug}
                        href={post.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="blog-series-link"
                      >
                        <span>{post.title}</span>
                        <ExternalLink size={15} />
                      </a>
                    ) : (
                      <Link
                        key={post.slug}
                        to={getResolvedBlogPostPath(post.slug)}
                        className="blog-series-link"
                      >
                        <span>{post.title}</span>
                        <ArrowRight size={15} />
                      </Link>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>

        <div id="blog-newsletter" className="section-anchor">
          <BlogNewsletterSignup />
        </div>

        <section id="blog-archive" className="blog-surface section-anchor">
          <div className="blog-surface-header">
            <div>
              <p className="blog-surface-label">
                <Archive size={14} />
                Archive
              </p>
              <h3>Browse by month and year.</h3>
            </div>
            <Link to="/blog/archive" className="blog-inline-link">
              Open archive page <ArrowRight size={16} />
            </Link>
          </div>
          <div className="blog-archive-preview">
            {archivePreview.slice(0, 4).map(({ year, month }) => (
              <article className="card blog-archive-preview-card" key={month.key}>
                <p className="blog-archive-preview-year">{year}</p>
                <h4>{month.label}</h4>
                <p>{month.posts.length} posts</p>
                <div className="blog-archive-preview-links">
                  {month.posts.slice(0, 2).map((post) => (
                    <span key={post.slug}>{post.title}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="blog-note">
          {isAdmin
            ? "Firestore-backed posts can now sit beside the existing local write-ups without breaking the public blog."
            : "Sample posts are live now, and more course write-ups and project breakdowns will keep landing here over time."}
        </p>
      </div>
    </section>
  );
}
