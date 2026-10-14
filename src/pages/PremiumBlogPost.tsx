import { useEffect, useState } from "react";
import { ArrowLeft, Crown, LockKeyhole, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getPremiumBriefingBySlug } from "../data/premiumBriefings";
import { formatResolvedBlogDate } from "../services/cmsContent";
import { getDefaultFeatureToggleState, subscribeFeatureToggleValue } from "../services/featureToggles";
import { hasPlanAccess } from "../services/subscriptions";
import NotFound from "./NotFound";
import "./Blog.css";

export default function PremiumBlogPost() {
  const { slug } = useParams();
  const { loading, subscriptionLoading, subscriptionState, user } = useAuth();
  const [briefingsEnabled, setBriefingsEnabled] = useState(
    getDefaultFeatureToggleState("premium_briefings"),
  );
  const briefing = slug ? getPremiumBriefingBySlug(slug) : null;

  useEffect(() => {
    const unsubscribe = subscribeFeatureToggleValue(
      "premium_briefings",
      (enabled) => setBriefingsEnabled(enabled),
      () => setBriefingsEnabled(getDefaultFeatureToggleState("premium_briefings")),
    );

    return unsubscribe;
  }, []);

  if (!briefing) {
    return <NotFound />;
  }

  if (!briefingsEnabled) {
    return (
      <section className="blog section">
        <div className="container">
          <div className="blog-note">
            Premium briefings are currently paused from the admin dashboard. Re-enable the feature
            toggle before sharing this route.
          </div>
        </div>
      </section>
    );
  }

  if (loading || (user && subscriptionLoading)) {
    return (
      <section className="blog section">
        <div className="container">
          <div className="blog-note">Checking premium access...</div>
        </div>
      </section>
    );
  }

  const canRead = subscriptionState.isActive && hasPlanAccess(subscriptionState.planId, briefing.requiredPlan);

  return (
    <article className="blog-post section">
      <div className="container blog-post-shell">
        <Link to="/blog/premium" className="blog-post-back">
          <ArrowLeft size={16} />
          Back to creator briefings
        </Link>

        <header className="blog-post-hero blog-premium-post-hero">
          <div className="blog-card-topline">
            <span className="blog-premium-pill">
              {canRead ? <Crown size={13} /> : <LockKeyhole size={13} />}
              {canRead ? `${subscriptionState.planName} access` : "Premium preview"}
            </span>
          </div>
          <div className="blog-meta blog-post-meta">
            <span>{formatResolvedBlogDate(briefing.date)}</span>
            <span>{briefing.readTime}</span>
          </div>
          <h1 className="blog-post-title">{briefing.title}</h1>
          <p className="blog-post-excerpt">{briefing.excerpt}</p>
          <div className="blog-tags">
            {briefing.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="blog-post-layout">
          <aside className="blog-post-sidebar">
            <section className="card blog-paywall-card">
              <p className="blog-surface-label">
                <Sparkles size={14} />
                Access status
              </p>
              <h3>{canRead ? "This briefing is unlocked" : "Unlock this briefing"}</h3>
              <p>
                {canRead
                  ? "Your Stripe-synced subscription can access Creator briefings right now."
                  : "Upgrade to Creator or Pro to read the full private briefing and future premium posts."}
              </p>
              <div className="blog-premium-status-actions">
                <Link to={user ? "/memberships" : "/login"} className="btn btn-primary">
                  {canRead ? "Manage membership" : user ? "Upgrade in memberships" : "Sign in"}
                </Link>
                <Link to="/blog/premium" className="btn btn-outline">
                  All briefings
                </Link>
              </div>
            </section>
          </aside>

          <div className="blog-post-main">
            <section className="card blog-post-section">
              {briefing.teaser.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            {!canRead ? (
              <section className="card blog-post-section blog-paywall-preview">
                <h2>Inside the full briefing</h2>
                <ul className="blog-post-list">
                  {briefing.teaserBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <p>
                  Full access is only rendered for active Creator or Pro subscriptions synced from
                  Firestore.
                </p>
              </section>
            ) : (
              <>
                {briefing.sections.map((section) => (
                  <section className="card blog-post-section" key={section.heading}>
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
                  </section>
                ))}

                <section className="card blog-post-section blog-post-closing">
                  <h2>Wrap up</h2>
                  <p>{briefing.closing}</p>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
