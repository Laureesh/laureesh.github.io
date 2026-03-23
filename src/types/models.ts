import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "member";
export type UserStatus = "active" | "suspended" | "banned";
export type VisibilitySetting = "public" | "private";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ProjectScope = "site" | "portfolio";
export type ProjectType = "personal" | "academic" | "community";
export type ProjectLifecycleStatus = "planned" | "in_progress" | "completed";
export type TaskColumn = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type BillingInterval = "monthly" | "yearly";
export type SupportedLanguage = "en" | "es" | "fr" | "de" | "pt-BR";
export type MembershipPlanId = "free" | "creator" | "pro";
export type SkillArea = "frontend" | "backend" | "fullstack" | "cloud" | "data" | "design";
export type FeatureToggleKey = "stripe_purchases" | "premium_briefings" | "content_exports";
export type AdminActivityEntityType =
  | "blog"
  | "project"
  | "link"
  | "page"
  | "task"
  | "user"
  | "feature_toggle"
  | "export";
export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface TimestampFields {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SocialLinks {
  github?: string | null;
  linkedin?: string | null;
  website?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  email?: string | null;
}

export interface NotificationPreferences {
  accountActivity: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  marketingEmails: boolean;
}

export interface SecurityPreferences {
  loginAlerts: boolean;
  trustedDevicesOnly: boolean;
}

export interface UserPreferences {
  language: SupportedLanguage;
  notifications: NotificationPreferences;
  security: SecurityPreferences;
}

export interface UserMembership {
  planId: MembershipPlanId;
  planName: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  autoRenew: boolean;
}

export interface MediaAsset {
  path: string;
  url?: string | null;
  alt?: string | null;
  caption?: string | null;
}

export interface UserProfile extends TimestampFields {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  photoURL: string | null;
  avatarStoragePath: string | null;
  role: UserRole;
  status: UserStatus;
  bio: string;
  headline: string;
  username: string | null;
  location: string | null;
  skills: string[];
  isPublic: boolean;
  socialLinks: SocialLinks;
  preferences: UserPreferences;
  membership: UserMembership;
}

export interface AdminBootstrapRecord {
  uid: string;
  role: "admin";
  enabled: boolean;
  note?: string | null;
}

export interface BlogSeriesReference {
  slug: string;
  order: number;
}

export interface BlogContentBlock {
  id: string;
  type: "paragraph" | "heading" | "list" | "code" | "quote";
  content?: string;
  items?: string[];
  language?: string | null;
  title?: string | null;
}

export interface BlogCodeBlockRecord {
  label: string;
  language: string;
  snippet: string;
}

export interface BlogSectionRecord {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  codeBlocks?: BlogCodeBlockRecord[];
}

export interface BlogReactionSeedsRecord {
  heart: number;
  insightful: number;
  useful: number;
}

export interface BlogPostRecord extends TimestampFields {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  authorId: string;
  status: ContentStatus;
  visibility: VisibilitySetting;
  tags: string[];
  series: BlogSeriesReference | null;
  readTimeMinutes: number;
  publishedAt: Timestamp | null;
  scheduledAt: Timestamp | null;
  externalUrl: string | null;
  contentBlocks: BlogContentBlock[];
  date: string | null;
  popularity: number;
  reactionSeeds: BlogReactionSeedsRecord;
  intro: string[];
  sections: BlogSectionRecord[];
  closing: string | null;
  seriesTitle: string | null;
  seriesDescription: string | null;
}

export interface ProjectContributionMix {
  frontend: number;
  backend: number;
  design: number;
}

export interface ProjectStackGroupRecord {
  label: string;
  items: string[];
}

export interface ProjectSourcePreviewRecord {
  title: string;
  language: string;
  snippet: string;
}

export interface ProjectGallerySlideRecord {
  title: string;
  caption: string;
  bullets: string[];
  image?: string;
  theme: "violet" | "cyan" | "rose" | "amber" | "emerald";
}

export interface ProjectArchitectureLaneRecord {
  label: string;
  nodes: string[];
}

export interface ProjectRecord extends TimestampFields {
  id?: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  ownerId: string | null;
  scope: ProjectScope;
  type: ProjectType;
  status: ProjectLifecycleStatus;
  visibility: VisibilitySetting;
  featured: boolean;
  startDate: string | null;
  endDate: string | null;
  techStack: string[];
  tags: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  assets: MediaAsset[];
  category: string | null;
  estimatedTime: string | null;
  complexity: number | null;
  comparisonSummary: string | null;
  effortLabel: string | null;
  effortNote: string | null;
  stackGroups: ProjectStackGroupRecord[];
  contributions: ProjectContributionMix;
  learned: string[];
  sourcePreview: ProjectSourcePreviewRecord | null;
  gallery: ProjectGallerySlideRecord[];
  architecture: {
    summary: string;
    lanes: ProjectArchitectureLaneRecord[];
  } | null;
  relatedIds: string[];
}

export interface LinkRecord extends TimestampFields {
  id?: string;
  label: string;
  url: string;
  category: string;
  description: string;
  icon: string | null;
  ownerId: string | null;
  isActive: boolean;
  order: number;
}

export interface PageSectionRecord {
  id: string;
  type: "hero" | "rich_text" | "cards" | "faq" | "custom";
  eyebrow?: string | null;
  title?: string | null;
  body?: string | null;
  items?: Array<Record<string, unknown>>;
}

export interface PageContentRecord extends TimestampFields {
  id?: string;
  pageKey: string;
  title: string;
  status: ContentStatus;
  scheduledAt: Timestamp | null;
  visibility: VisibilitySetting;
  updatedBy: string;
  sections: PageSectionRecord[];
}

export interface PortfolioRecord extends TimestampFields {
  id?: string;
  userId: string;
  slug: string;
  displayName: string;
  username: string | null;
  photoURL: string | null;
  headline: string;
  about: string;
  featuredProjectId: string | null;
  projectIds: string[];
  projectCount: number;
  skills: string[];
  skillAreas: SkillArea[];
  communityScore: number;
  socialLinks: SocialLinks;
  isPublic: boolean;
}

export interface RankRecord extends TimestampFields {
  id?: string;
  name: string;
  slug: string;
  scoreRequirement: number;
  iconPath: string | null;
  order: number;
  createdBy: string;
}

export interface TaskRecord extends TimestampFields {
  id?: string;
  title: string;
  description: string;
  column: TaskColumn;
  priority: TaskPriority;
  assignedTo: string | null;
  dueAt: Timestamp | null;
  order: number;
  createdBy: string;
}

export interface AdminActivityRecord extends TimestampFields {
  id?: string;
  actorId: string;
  action: string;
  entityType: AdminActivityEntityType;
  entityId: string | null;
  entityLabel: string | null;
  summary: string;
}

export interface FeatureToggleRecord extends TimestampFields {
  id?: string;
  key: FeatureToggleKey;
  label: string;
  description: string;
  enabled: boolean;
  public: boolean;
  updatedBy: string;
}

export interface SubscriptionRecord extends TimestampFields {
  id?: string;
  userId: string;
  provider: "stripe";
  planId: MembershipPlanId;
  planName: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  checkoutSessionId: string | null;
  currentPeriodEnd: Timestamp | null;
  cancelAtPeriodEnd: boolean;
  lastEventId: string | null;
}
