import { useEffect, useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import StripePricingTable from "../../components/StripePricingTable";
import { premiumBriefings } from "../../data/premiumBriefings";
import { useAuth } from "../../contexts/AuthContext";
import { subscribeFeatureToggleValue } from "../../services/featureToggles";
import AccountPageLayout from "./AccountPageLayout";

function formatSubscriptionDate(value: ReturnType<typeof useAuth>["subscriptionState"]["currentPeriodEnd"]) {
  if (!value) {
    return "Not set";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(value.toDate());
  } catch {
    return "Not set";
  }
}

export default function MembershipsPage() {
  const location = useLocation();
  const { user, subscriptionLoading, subscriptionState } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const envPurchasesEnabled = import.meta.env.VITE_STRIPE_PURCHASES_ENABLED === "true";
  const [purchasesEnabled, setPurchasesEnabled] = useState(envPurchasesEnabled);

  useEffect(() => {
    const unsubscribe = subscribeFeatureToggleValue(
      "stripe_purchases",
      (enabled) => setPurchasesEnabled(enabled),
      () => setPurchasesEnabled(envPurchasesEnabled),
    );

    return unsubscribe;
  }, [envPurchasesEnabled]);

  useEffect(() => {
    if (!purchasesEnabled) {
      setStatus(null);
      setStatusType(null);
      return;
    }

    const checkoutState = new URLSearchParams(location.search).get("checkout");

    if (checkoutState === "success") {
      setStatus("Stripe checkout returned successfully. Premium access still needs webhook sync or a manual admin update before the app unlocks paid content.");
      setStatusType("success");
      return;
    }

    if (checkoutState === "cancelled") {
      setStatus("Stripe checkout was cancelled before the subscription completed.");
      setStatusType("error");
      return;
    }

    setStatus(null);
    setStatusType(null);
  }, [location.search, purchasesEnabled]);

  if (!user) {
    return null;
  }

  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const stripePricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID?.trim() ?? "";
  const pricingTableConfigured = Boolean(purchasesEnabled && stripePublishableKey && stripePricingTableId);
  const currentPeriodEnd = formatSubscriptionDate(subscriptionState.currentPeriodEnd);

  return (
    <AccountPageLayout
      eyebrow="Billing"
      title="Purchases and Memberships"
      description="Purchases are currently disabled. This page shows current access, what paid members will unlock later, and where Stripe checkout will appear once you activate it."
      sidebar={(
        <>
          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Live subscription</h3>
              <p>Firestore-backed status only changes when you sync it manually or through a webhook-capable backend.</p>
            </div>
            <ul className="account-summary-list">
              <li className="account-summary-row">
                <strong>Access</strong>
                <span>{subscriptionState.hasPremiumAccess ? "Premium unlocked" : "Free only"}</span>
              </li>
              <li className="account-summary-row">
                <strong>Plan</strong>
                <span>{subscriptionState.planName}</span>
              </li>
              <li className="account-summary-row">
                <strong>Status</strong>
                <span>{subscriptionLoading ? "Syncing..." : subscriptionState.status}</span>
              </li>
              <li className="account-summary-row">
                <strong>Billing</strong>
                <span>{subscriptionState.billingInterval}</span>
              </li>
              <li className="account-summary-row">
                <strong>Renewal</strong>
                <span>
                  {subscriptionState.isActive
                    ? subscriptionState.cancelAtPeriodEnd
                      ? "Ends at period end"
                      : "Auto renews"
                    : "Not active"}
                </span>
              </li>
              <li className="account-summary-row">
                <strong>Current period</strong>
                <span>{currentPeriodEnd}</span>
              </li>
            </ul>
          </div>

          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Premium feature</h3>
              <p>Creator Briefings are the first paid layer on the platform.</p>
            </div>
            <ul className="account-checklist">
              <li><strong>1.</strong><span>Plan selection now happens inside Stripe.</span></li>
              <li><strong>2.</strong><span>Purchases are intentionally disabled until you flip the admin feature toggle back on.</span></li>
              <li><strong>3.</strong><span>The pricing table works on Firebase&apos;s free plan without deploying Functions.</span></li>
              <li><strong>4.</strong><span>Automatic premium unlock still needs webhook sync or manual admin updates.</span></li>
            </ul>
          </div>

          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Included right now</h3>
              <p>These previews stay visible to everyone. Full content remains gated.</p>
            </div>
            <div className="account-billing-preview-list">
              {premiumBriefings.map((briefing) => (
                <Link key={briefing.slug} to={`/blog/premium/${briefing.slug}`} className="account-billing-preview">
                  <div>
                    <strong>{briefing.title}</strong>
                    <span>{briefing.readTime}</span>
                  </div>
                  <ExternalLink size={15} />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    >
      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Stripe Checkout</h2>
            <span className="account-chip">
              <ShieldCheck size={14} />
              {purchasesEnabled ? (pricingTableConfigured ? "Embed ready" : "Pricing table env missing") : "Purchases disabled"}
            </span>
          </div>
          <p>Use the Stripe pricing table as the only purchase path once you&apos;re ready to activate it.</p>
        </div>

        <div className="account-note-box">
          Purchases are off right now, so no one can buy anything from this page. When you want to go live later, enable the <code>Stripe purchases</code> feature toggle in the admin dashboard. The env flag still acts as a fallback when Firestore is unavailable.
        </div>

        {status ? (
          <div className="account-actions">
            <span className={`account-status-text ${statusType === "error" ? "is-error" : statusType === "success" ? "is-success" : ""}`}>
              {status}
            </span>
          </div>
        ) : null}
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Stripe Pricing Table</h2>
          </div>
          <p>Pick `Creator` or `Pro` directly inside the Stripe embed once you decide to activate checkout.</p>
        </div>

        {pricingTableConfigured ? (
          <div className="account-stripe-embed">
            <StripePricingTable
              pricingTableId={stripePricingTableId}
              publishableKey={stripePublishableKey}
              clientReferenceId={user.uid}
              customerEmail={user.email}
              className="account-stripe-embed__table"
            />
          </div>
        ) : purchasesEnabled ? (
          <div className="account-note-box">
            Add <code>VITE_STRIPE_PRICING_TABLE_ID</code> to your root <code>.env</code> file, then paste the value from
            the Stripe pricing table embed code. It should look like <code>prctbl_...</code>.
          </div>
        ) : (
          <div className="account-note-box">
            The Stripe pricing table is currently hidden on purpose. When you&apos;re ready to accept purchases, enable the <code>Stripe purchases</code> feature toggle in the admin dashboard.
          </div>
        )}
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Premium Content Access</h2>
          </div>
          <p>These premium briefings are the current paid feature that the Stripe layer is built around.</p>
        </div>

        <div className="account-billing-preview-grid">
          {premiumBriefings.map((briefing) => (
            <article className="account-billing-card" key={briefing.slug}>
              <div className="account-panel-header">
                <div className="account-panel-title-row">
                  <h3>{briefing.title}</h3>
                </div>
                <p>{briefing.excerpt}</p>
              </div>
              <ul className="account-plan-perks">
                {briefing.teaserBullets.map((bullet) => (
                  <li key={bullet}><span>{bullet}</span></li>
                ))}
              </ul>
              <div className="account-actions">
                <Link to={`/blog/premium/${briefing.slug}`} className="btn btn-outline">
                  Preview briefing
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AccountPageLayout>
  );
}
