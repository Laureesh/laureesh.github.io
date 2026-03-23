import { useEffect, useState } from "react";
import { ArrowRight, Crown, LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { premiumBriefings } from "../data/premiumBriefings";
import { hasPlanAccess } from "../services/subscriptions";
import { formatResolvedBlogDate } from "../services/cmsContent";
import { getDefaultFeatureToggleState, subscribeFeatureToggleValue } from "../services/featureToggles";
import "./Blog.css";

export default function PremiumBlog() {
  const { subscriptionState, user } = useAuth();
  const [briefingsEnabled, setBriefingsEnabled] = useState(
    getDefaultFeatureToggleState("premium_briefings"),
  );

  useEffect(() => {
    const unsubscribe = subscribeFeatureToggleValue(
      "premium_briefings",
      (enabled) => setBriefingsEnabled(enabled),
      () => setBriefingsEnabled(getDefaultFeatureToggleState("premium_briefings")),
    );

    return unsubscribe;
  }, []);

  if (!briefingsEnabled) {
    return (
      <section className="blog section">
        <div className="container">
          <div className="blog-note">
            Premium briefings are currently paused. The preview routes stay wired, but the admin
            toggle is holding this feature offline until launch.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="blog section">
      <div className="container">
        <div className="blog-hero blog-premium-hero">
          <div>
            <p className="section-label">Premium Blog</p>
            <h2 className="section-title">Creator Briefings</h2>
            <p className="blog-intro">
              Private build notes, launch memos, and operating write-ups reserved for active
              Creator and Pro members.
            </p>
          </div>

          <div className="blog-premium-status card">
            <p className="blog-surface-label">
              <Crown size={14} />
              Access
            </p>
            <h3>
              {subscriptionState.hasCreatorAccess
                ? `${subscriptionState.planName} unlocked`
                : user
                  ? "Upgrade to Creator"
                  : "Sign in to unlock"}
            </h3>
            <p>
              {subscriptionState.hasCreatorAccess
                ? "Your subscription is active. Open any briefing below."
                : "Premium briefings use Stripe-backed subscription checks before full content is shown."}
            </p>
            <div className="blog-premium-status-actions">
              <Link to={subscriptionState.hasCreatorAccess ? "/memberships" : user ? "/memberships" : "/login"} className="btn btn-primary">
                {subscriptionState.hasCreatorAccess ? "Manage membership" : user ? "View plans" : "Sign in"}
              </Link>
              <Link to="/blog" className="btn btn-outline">
                Back to blog
              </Link>
            </div>
          </div>
        </div>

        <section className="blog-surface">
          <div className="blog-surface-header">
            <div>
              <p className="blog-surface-label">
                <Sparkles size={14} />
                Subscriber-only briefings
              </p>
              <h3>Private notes built around systems, launches, and product workflow.</h3>
            </div>
          </div>

          <div className="blog-grid">
            {premiumBriefings.map((briefing) => {
              const canRead = subscriptionState.isActive
                && hasPlanAccess(subscriptionState.planId, briefing.requiredPlan);

              return (
                <article className="card blog-card blog-premium-card" key={briefing.slug}>
                  <div className="blog-meta">
                    <span>{formatResolvedBlogDate(briefing.date)}</span>
                    <span>{briefing.readTime}</span>
                  </div>
                  <div className="blog-card-topline">
                    <span className="blog-premium-pill">
                      {canRead ? <Crown size={13} /> : <LockKeyhole size={13} />}
                      {canRead ? "Unlocked" : "Creator+"}
                    </span>
                    <span className="blog-card-popularity">Premium</span>
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
                    {canRead ? "Open briefing" : "Preview and unlock"} <ArrowRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
