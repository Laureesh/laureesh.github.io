import type { MembershipPlanId } from "../types/models";

export interface PremiumBriefingSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PremiumBriefing {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  requiredPlan: Exclude<MembershipPlanId, "free">;
  teaser: string[];
  teaserBullets: string[];
}

export const premiumBriefings: PremiumBriefing[] = [
  {
    slug: "creator-ops-weekly-rhythm",
    title: "Creator Ops: The Weekly Rhythm Behind Shipping Consistently",
    excerpt:
      "A private breakdown of the weekly operating system used to turn backlog ideas into published work without stalling momentum.",
    date: "2026-03-18",
    readTime: "7 min read",
    tags: ["Creator", "Workflow", "Systems"],
    requiredPlan: "creator",
    teaser: [
      "This briefing focuses on the operating rhythm behind consistent output. The point is not productivity theater. It is reducing the drag between an idea, a scoped task, and something real landing in public.",
      "The system is intentionally small: capture, shape, ship, and review. Each stage has a constraint so the backlog does not turn into vague ambition.",
    ],
    teaserBullets: [
      "How tasks get scoped before they ever hit the Kanban board",
      "The weekly review checklist used to decide what ships next",
      "A simple rule set for separating experiments from real commitments",
    ],

  },
  {
    slug: "premium-build-notes-launch-checklist",
    title: "Launch Checklist for Premium Features Without Breaking the Core Product",
    excerpt:
      "A private launch memo covering how to introduce paid layers while keeping the free experience coherent and trustworthy.",
    date: "2026-03-10",
    readTime: "6 min read",
    tags: ["SaaS", "Launch", "Product"],
    requiredPlan: "creator",
    teaser: [
      "Paid layers fail when they feel stapled on. The free product stops making sense, premium access feels arbitrary, and users can tell the structure was designed around billing instead of value.",
      "This checklist is about sequencing the rollout so the premium layer adds depth without making the main product feel incomplete.",
    ],
    teaserBullets: [
      "What needs to stay good in the free experience before charging",
      "Where entitlement checks belong in the UI and backend",
      "How to message premium access without turning the site into a paywall wall",
    ],

  },
];

export function getPremiumBriefingBySlug(slug: string) {
  return premiumBriefings.find((briefing) => briefing.slug === slug) ?? null;
}
