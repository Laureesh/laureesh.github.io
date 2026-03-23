import { onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "../firebase";
import type {
  BillingInterval,
  MembershipPlanId,
  SubscriptionRecord,
  SubscriptionStatus,
  UserMembership,
} from "../types/models";
import { subscriptionDocument } from "./collections";

const PREMIUM_ACTIVE_STATUSES = new Set<SubscriptionStatus>(["trialing", "active", "past_due"]);
const PLAN_RANK: Record<MembershipPlanId, number> = {
  free: 0,
  creator: 1,
  pro: 2,
};

interface StripeApiResponse {
  url: string;
  sessionId?: string;
}

export interface StripeCheckoutInput {
  planId: Exclude<MembershipPlanId, "free">;
  billingInterval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripePortalInput {
  returnUrl?: string;
}

export interface SubscriptionAccessState {
  planId: MembershipPlanId;
  planName: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodEnd: SubscriptionRecord["currentPeriodEnd"];
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  hasPremiumAccess: boolean;
  hasCreatorAccess: boolean;
  hasProAccess: boolean;
  isActive: boolean;
}

function getStripeApiBaseUrl() {
  return (import.meta.env.VITE_STRIPE_API_BASE_URL || "").trim().replace(/\/+$/, "");
}

function assertStripeApiConfigured() {
  const baseUrl = getStripeApiBaseUrl();

  if (!baseUrl) {
    throw new Error("Stripe billing is not configured yet. Add VITE_STRIPE_API_BASE_URL to the app env.");
  }

  return baseUrl;
}

async function postStripeEndpoint<TBody>(
  user: User,
  path: string,
  body: TBody,
) {
  const baseUrl = assertStripeApiConfigured();
  const idToken = await user.getIdToken();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: StripeApiResponse | { error?: string } | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      (payload && "error" in payload && payload.error) || "Stripe billing request failed.",
    );
  }

  return payload as StripeApiResponse;
}

export function isSubscriptionActiveStatus(status: SubscriptionStatus | null | undefined) {
  return Boolean(status && PREMIUM_ACTIVE_STATUSES.has(status));
}

export function hasPlanAccess(
  planId: MembershipPlanId | null | undefined,
  requiredPlan: MembershipPlanId,
) {
  if (!planId) {
    return false;
  }

  return PLAN_RANK[planId] >= PLAN_RANK[requiredPlan];
}

export function getDefaultSubscriptionAccessState(): SubscriptionAccessState {
  return {
    planId: "free",
    planName: "Free",
    status: "inactive",
    billingInterval: "monthly",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    hasPremiumAccess: false,
    hasCreatorAccess: false,
    hasProAccess: false,
    isActive: false,
  };
}

export function getSubscriptionAccessState(
  subscription: SubscriptionRecord | null | undefined,
): SubscriptionAccessState {
  if (!subscription) {
    return getDefaultSubscriptionAccessState();
  }

  const isActive = isSubscriptionActiveStatus(subscription.status);
  const hasPremiumAccess = isActive && hasPlanAccess(subscription.planId, "creator");

  return {
    planId: subscription.planId,
    planName: subscription.planName,
    status: subscription.status,
    billingInterval: subscription.billingInterval,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    hasPremiumAccess,
    hasCreatorAccess: hasPremiumAccess,
    hasProAccess: isActive && hasPlanAccess(subscription.planId, "pro"),
    isActive,
  };
}

export function getMembershipPreferenceSummary(membership: UserMembership | null | undefined) {
  if (!membership) {
    return {
      planId: "free" as MembershipPlanId,
      planName: "Free",
      billingInterval: "monthly" as BillingInterval,
      autoRenew: false,
    };
  }

  return {
    planId: membership.planId,
    planName: membership.planName,
    billingInterval: membership.billingInterval,
    autoRenew: membership.autoRenew,
  };
}

export function subscribeToUserSubscription(
  uid: string,
  onSubscription: (subscription: SubscriptionRecord | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    onSubscription(null);
    return () => undefined;
  }

  return onSnapshot(
    subscriptionDocument(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onSubscription(null);
        return;
      }

      onSubscription({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function createStripeCheckoutSession(user: User, input: StripeCheckoutInput) {
  return postStripeEndpoint(user, "/checkout-session", input);
}

export async function createStripePortalSession(user: User, input: StripePortalInput = {}) {
  return postStripeEndpoint(user, "/billing-portal", input);
}

export function isStripeBillingConfigured() {
  return Boolean(getStripeApiBaseUrl());
}
