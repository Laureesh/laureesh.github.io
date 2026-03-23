import type { BillingInterval, MembershipPlanId, SupportedLanguage } from "../types/models";

export const LANGUAGE_OPTIONS: Array<{ value: SupportedLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
];

export const LANGUAGE_LABELS = Object.fromEntries(
  LANGUAGE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<SupportedLanguage, string>;

export const MEMBERSHIP_PLANS: Array<{
  id: MembershipPlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  perks: string[];
}> = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Basic account access with profile management and community browsing.",
    perks: [
      "Profile and account settings",
      "Community access once enabled",
      "Core portfolio tools",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    monthlyPrice: 9,
    yearlyPrice: 90,
    description: "A future paid tier for premium tools, private content, and faster support.",
    perks: [
      "Everything in Free",
      "Premium blog and tool access",
      "Priority feature rollout",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 19,
    yearlyPrice: 190,
    description: "A future advanced tier for SaaS features, analytics, and business workflows.",
    perks: [
      "Everything in Creator",
      "Advanced dashboard features",
      "Business-focused support",
    ],
  },
];

export const BILLING_INTERVAL_OPTIONS: Array<{ value: BillingInterval; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];
