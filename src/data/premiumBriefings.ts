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
  sections: PremiumBriefingSection[];
  closing: string;
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
    sections: [
      {
        heading: "Capture has to stay low-friction",
        paragraphs: [
          "Every new idea starts in a capture bucket, but nothing stays there long. The goal is to move raw ideas into a decision quickly instead of building a graveyard of half-phrased notes.",
          "If an item cannot explain who it helps, what it changes, or why it matters right now, it is not ready for active work.",
        ],
        bullets: [
          "Collect ideas fast, but review them on a schedule.",
          "Reject anything that does not have an immediate user or product reason.",
          "Turn vague ideas into action language before they reach the board.",
        ],
      },
      {
        heading: "Scope before you prioritize",
        paragraphs: [
          "The board gets cleaner when the work is scoped before it is prioritized. That means identifying the visible outcome, the dependencies, and the success condition before a task reaches the active lane.",
          "This stops priority from becoming emotional. A task with no clear finish line should not outrank a task that can actually be shipped this week.",
        ],
      },
      {
        heading: "Review the system, not just the output",
        paragraphs: [
          "A weekly review is not only for measuring what shipped. It also checks whether the current workflow is making shipping harder than it needs to be.",
          "That is where the system improves: too many in-progress tasks, repeated blockers, or vague task cards become signals to tighten the process rather than work longer hours.",
        ],
      },
    ],
    closing:
      "Consistency usually comes from removing friction in the workflow, not from demanding more effort from the same system.",
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
    sections: [
      {
        heading: "Decide what stays free first",
        paragraphs: [
          "A healthy premium model starts by protecting the free experience. Users should understand what the product does and trust that the core product is real before you ask them to pay for depth.",
          "That means the free tier needs a complete story, not just a teaser version of every screen.",
        ],
      },
      {
        heading: "Entitlements need one source of truth",
        paragraphs: [
          "It is fine to mirror subscription status into the UI for speed, but the unlock logic needs a trusted source. In this stack that means webhook-synced Firestore state and server-created checkout sessions.",
          "Anything editable by the client can only be treated as preference data, never proof of access.",
        ],
        bullets: [
          "Use Stripe webhooks to write the live subscription record.",
          "Let the client read state and render around it.",
          "Keep purchase creation on the backend only.",
        ],
      },
      {
        heading: "Merchandise the premium value clearly",
        paragraphs: [
          "Premium content should be specific. Generic claims about exclusive value do not convert. Users respond better when they can see what kind of depth is reserved for paid access.",
          "That is why preview pages matter. They show the shape of the content without leaking the full artifact.",
        ],
      },
    ],
    closing:
      "Premium works best when it feels like a deeper layer of the same product, not a different product hidden behind a payment form.",
  },
];

export function getPremiumBriefingBySlug(slug: string) {
  return premiumBriefings.find((briefing) => briefing.slug === slug) ?? null;
}
